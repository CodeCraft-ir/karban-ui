import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AuthRequestPolicyError,
  parseLogoutRequest,
  parseOtpRequest,
  parseOtpVerifyRequest,
  parseRefreshRequest,
} from "./auth-request-policy.ts";

const APP_ORIGIN = "https://app.example.test";

function mutation(body: string, headers: Record<string, string> = {}): Request {
  return new Request(`${APP_ORIGIN}/api/auth/request`, {
    method: "POST",
    headers: {
      Origin: APP_ORIGIN,
      "Content-Type": "application/json; charset=utf-8",
      "Sec-Fetch-Site": "same-origin",
      ...headers,
    },
    body,
  });
}

async function rejects(
  operation: () => Promise<unknown>,
  code: string,
  status: number,
  forbidden: string[] = [],
): Promise<void> {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof AuthRequestPolicyError);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
    for (const value of forbidden) {
      assert.equal(serialized.includes(value), false);
    }
    return true;
  });
}

test("accepts only a same-origin JSON OTP request with the exact public fields", async () => {
  assert.deepEqual(
    await parseOtpRequest(mutation('{"phone":"+98 912 123 4567","role":"specialist"}'), APP_ORIGIN),
    { phone: "+98 912 123 4567", role: "specialist" },
  );
});

test("accepts only an exact code body for verify and exact empty bodies for refresh/logout", async () => {
  assert.deepEqual(await parseOtpVerifyRequest(mutation('{"code":"۱۲۳۴۵"}'), APP_ORIGIN), {
    code: "۱۲۳۴۵",
  });
  assert.deepEqual(await parseRefreshRequest(mutation("{}"), APP_ORIGIN), {});
  assert.deepEqual(await parseLogoutRequest(mutation("{}"), APP_ORIGIN), {});
});

test("rejects malformed, extra, oversized, and route-crossed JSON before a coordinator can run", async () => {
  for (const body of [
    "",
    "null",
    "[]",
    "{",
    '{"phone":"09121234567"}',
    '{"phone":"09121234567","role":"client","trackingCode":"secret"}',
    '{"code":"12345","role":"specialist"}',
    '{"code":"1234567"}',
    JSON.stringify({ phone: "9".repeat(33), role: "client" }),
    JSON.stringify({ phone: "09121234567", role: "client", padding: "x".repeat(64) }),
  ]) {
    await rejects(() => parseOtpRequest(mutation(body), APP_ORIGIN), "invalid_request", 400, ["trackingCode", "secret"]);
  }
  await rejects(() => parseOtpVerifyRequest(mutation('{"code":"12345","role":"client"}'), APP_ORIGIN), "invalid_request", 400);
  await rejects(() => parseRefreshRequest(mutation('{"unexpected":true}'), APP_ORIGIN), "invalid_request", 400);
  await rejects(() => parseLogoutRequest(mutation('{"refresh_token":"secret"}'), APP_ORIGIN), "invalid_request", 400, ["secret"]);
});

test("rejects invalid origin, Fetch Metadata, content type, and 4KiB stream bodies safely", async () => {
  await rejects(
    () => parseOtpRequest(mutation('{"phone":"09121234567","role":"client"}', { Origin: "https://evil.example" }), APP_ORIGIN),
    "invalid_origin",
    403,
  );
  await rejects(
    () => parseOtpRequest(mutation('{"phone":"09121234567","role":"client"}', { Origin: "null" }), APP_ORIGIN),
    "invalid_origin",
    403,
  );
  await rejects(
    () => parseOtpRequest(mutation('{"phone":"09121234567","role":"client"}', { "Sec-Fetch-Site": "cross-site" }), APP_ORIGIN),
    "invalid_request_metadata",
    403,
  );
  await rejects(
    () => parseOtpRequest(mutation('{"phone":"09121234567","role":"client"}', { "Content-Type": "text/plain" }), APP_ORIGIN),
    "invalid_content_type",
    415,
  );
  await rejects(
    () => parseOtpRequest(mutation(`{"phone":"09121234567","role":"client","padding":"${"x".repeat(4_097)}"}`), APP_ORIGIN),
    "request_too_large",
    413,
  );
});
