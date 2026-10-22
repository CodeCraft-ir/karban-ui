import assert from "node:assert/strict";
import { test } from "node:test";
import { createOtpReadinessCheck } from "./auth-bff-policy.ts";
import { createWordPressAuthGateway } from "./wordpress-auth.ts";
import { createAuthCoordinator, createRefreshCoordinator, type AuthSessionData } from "./auth-coordinator.ts";
import { createAuthRouteHandlers } from "./auth-route-adapters.ts";

const simulated = { mode: "local_simulated", codeLength: 6, otpSchemaReady: true, credentialSchemaReady: true, providerConfigured: false, localRealSmsAllowed: false };
const sms = { ...simulated, mode: "sms", codeLength: 5, providerConfigured: true, localRealSmsAllowed: true };
function fixture(status: unknown, allowSms = false, issuedMode = "sms", issuedLength = 5) {
  const calls: string[] = [];
  let saved: AuthSessionData | undefined;
  const gateway = createWordPressAuthGateway(async (path, options) => {
    calls.push(path);
    if (path === "auth/otp/readiness") { assert.deepEqual(options, { method: "GET" }); if (status instanceof Error) throw status; return status; }
    if (path === "auth/otp/request") { assert.deepEqual(options?.body, { phone: "09121234567" }); return { tracking_code: "private-tracking", expires_in: 120, delivery_mode: issuedMode, code_length: issuedLength }; }
    throw Error("Unexpected boundary");
  });
  const check = createOtpReadinessCheck({ isLoopback: true, localDevelopmentEnabled: true, localSmsEnabled: allowSms, getReadiness: () => gateway.otpReadiness() });
  const coordinator = createAuthCoordinator({ gateway, session: { read: () => saved, save: async s => { saved = s; }, destroy: () => { saved = undefined; } }, ensureOtpReady: check, now: () => 1_700_000_000_000, uuid: () => "fixture-session", refreshCoordinator: createRefreshCoordinator(() => 1_700_000_000_000) });
  const routes = createAuthRouteHandlers({ appOrigin: "http://localhost:3000", getCoordinator: async () => coordinator });
  const request = (body = { phone: "09121234567", role: "client" }) => routes.request(new Request("http://localhost:3000/api/auth/request", { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" }, body: JSON.stringify(body) }));
  return { calls, request, saved: () => saved, check };
}

test("actual gateway coordinator and BFF adapters reject unarmed invalid and mismatched readiness before OTP", async () => {
  for (const status of [sms, undefined, null, {}, { ...simulated, otpSchemaReady: false }, { ...simulated, credentialSchemaReady: false }, { ...simulated, codeLength: 5 }, { ...simulated, mode: "unknown" }, { ...simulated, localRealSmsAllowed: "false" }, { ...simulated, providerConfigured: "true" }, new Error("404 private-provider")]) {
    const f = fixture(status);
    const response = await f.request();
    assert.equal(response.status, 503);
    assert.equal(f.calls.includes("auth/otp/request"), false);
    assert.equal(f.saved(), undefined);
    assert.equal((await response.text()).includes("private"), false);
  }
});

test("trusted expected receipt must match requested challenge before sealing", async () => {
  for (const [status, allow, mode, length] of [[simulated, false, "sms", 5], [sms, true, "local_simulated", 6]] as const) {
    const f = fixture(status, allow, mode, length);
    assert.equal((await f.request()).status, 503);
    assert.equal(f.saved(), undefined);
    assert.deepEqual(f.calls, ["auth/otp/readiness", "auth/otp/request"]);
  }
});

test("explicit armed SMS5 and compatibility simulated6 seal only matching trusted responses", async () => {
  for (const [status, allow, mode, length] of [[simulated, false, "local_simulated", 6], [sms, true, "sms", 5]] as const) {
    const f = fixture(status, allow, mode, length);
    const response = await f.request();
    assert.equal(response.status, 200);
    assert.equal(f.saved()?.challenge?.deliveryMode, mode);
    assert.equal(f.saved()?.challenge?.codeLength, length);
    const body = await response.text(); assert.equal(body.includes("private-tracking"), false);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
  }
});

test("armed Next expects SMS and refuses simulation fallback or unconfigured provider", async () => {
  for (const status of [simulated, { ...sms, providerConfigured: false }, { ...sms, localRealSmsAllowed: false }, { ...sms, otpSchemaReady: false }]) {
    const f = fixture(status, true);
    assert.equal((await f.request()).status, 503);
    assert.equal(f.calls.includes("auth/otp/request"), false);
  }
});

test("browser mode intent is rejected before acquiring OTP and never selects transport", async () => {
  const f = fixture(simulated, false, "local_simulated", 6);
  assert.equal((await f.request({ phone: "09121234567", role: "client", mode: "sms" } as never)).status, 400);
  assert.deepEqual(f.calls, []);
});

test("base local opt-in cannot be bypassed by separate SMS opt-in", async () => {
  let calls = 0;
  const check = createOtpReadinessCheck({ isLoopback: true, localDevelopmentEnabled: false, localSmsEnabled: true, getReadiness: async () => { calls++; return sms as never; } });
  await assert.rejects(check, { code: "auth_unavailable", status: 503 });
  assert.equal(calls, 0);
});
