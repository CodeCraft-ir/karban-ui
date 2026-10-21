import assert from "node:assert/strict";
import { test } from "node:test";
import type { AuthCoordinator } from "./auth-coordinator.ts";
import { createAuthRouteHandlers } from "./auth-route-adapters.ts";

const APP_ORIGIN = "https://app.example.test";

function post(path: string, body: string, headers: Record<string, string> = {}): Request {
  return new Request(`${APP_ORIGIN}${path}`, {
    method: "POST",
    headers: {
      Origin: APP_ORIGIN,
      "Content-Type": "application/json",
      "Sec-Fetch-Site": "same-origin",
      ...headers,
    },
    body,
  });
}

function fakeCoordinator(): AuthCoordinator & { calls: Record<string, number> } {
  const calls = { requestOtp: 0, verifyOtp: 0, challenge: 0, me: 0, refresh: 0, logout: 0 };
  return {
    calls,
    requestOtp: async () => { calls.requestOtp += 1; return { challenge: { expiresAt: 1_700_000_120_000, codeLength: 5, isSimulated: false } }; },
    verifyOtp: async () => { calls.verifyOtp += 1; return { account: { id: 47, displayName: "آزاده نمونه", role: "specialist" }, redirectTo: "/pro" }; },
    challenge: () => { calls.challenge += 1; return { expiresAt: 1_700_000_120_000, codeLength: 5, isSimulated: false }; },
    me: async () => { calls.me += 1; return { account: { id: 47, displayName: "آزاده نمونه", role: "specialist" } }; },
    refresh: async () => { calls.refresh += 1; return { account: { id: 47, displayName: "آزاده نمونه", role: "specialist" } }; },
    logout: async () => { calls.logout += 1; },
  };
}

async function json(response: Response): Promise<unknown> {
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("pragma"), "no-cache");
  return response.json();
}

test("maps fixed BFF endpoints to safe public projections and no-store responses", async () => {
  const coordinator = fakeCoordinator();
  const routes = createAuthRouteHandlers({ appOrigin: APP_ORIGIN, getCoordinator: async () => coordinator });

  assert.deepEqual(await json(await routes.request(post("/api/auth/request", '{"phone":"09121234567","role":"client"}'))), {
    challenge: { expiresAt: 1_700_000_120_000, codeLength: 5, isSimulated: false },
  });
  assert.deepEqual(await json(await routes.verify(post("/api/auth/verify", '{"code":"12345"}'))), {
    account: { id: 47, displayName: "آزاده نمونه", role: "specialist" }, redirectTo: "/pro",
  });
  assert.deepEqual(await json(await routes.challenge(new Request(`${APP_ORIGIN}/api/auth/challenge`))), {
    challenge: { expiresAt: 1_700_000_120_000, codeLength: 5, isSimulated: false },
  });
  assert.deepEqual(await json(await routes.me(new Request(`${APP_ORIGIN}/api/auth/me`))), {
    account: { id: 47, displayName: "آزاده نمونه", role: "specialist" },
  });
  assert.deepEqual(await json(await routes.refresh(post("/api/auth/refresh", "{}"))), {
    account: { id: 47, displayName: "آزاده نمونه", role: "specialist" },
  });
  const logout = await routes.logout(post("/api/auth/logout", "{}"));
  assert.equal(logout.status, 204);
  assert.equal(logout.headers.get("cache-control"), "private, no-store");
  assert.equal(await logout.text(), "");
  assert.deepEqual(coordinator.calls, { requestOtp: 1, verifyOtp: 1, challenge: 1, me: 1, refresh: 1, logout: 1 });
});

test("stops hostile mutation requests before acquiring a coordinator or mutating a session", async () => {
  const coordinator = fakeCoordinator();
  let acquired = 0;
  const routes = createAuthRouteHandlers({ appOrigin: APP_ORIGIN, getCoordinator: async () => { acquired += 1; return coordinator; } });
  for (const request of [
    post("/api/auth/request", '{"phone":"09121234567","role":"client","tracking":"private"}'),
    post("/api/auth/request", '{"phone":"09121234567","role":"client"}', { Origin: "https://evil.example" }),
    post("/api/auth/request", '{"phone":"09121234567","role":"client"}', { "Sec-Fetch-Site": "cross-site" }),
    post("/api/auth/request", '{"phone":"09121234567","role":"client"}', { "Content-Type": "text/plain" }),
    post("/api/auth/refresh", '{"refresh_token":"private"}'),
    post("/api/auth/logout", '{"refresh_token":"private"}'),
  ]) {
    const handler = request.url.endsWith("/refresh") ? routes.refresh : request.url.endsWith("/logout") ? routes.logout : routes.request;
    const response = await handler(request);
    assert.ok([400, 403, 415].includes(response.status));
    const body = JSON.stringify(await response.json());
    assert.equal(body.includes("private"), false);
    assert.equal(body.includes("tracking"), false);
  }
  assert.equal(acquired, 0);
  assert.deepEqual(coordinator.calls, { requestOtp: 0, verifyOtp: 0, challenge: 0, me: 0, refresh: 0, logout: 0 });
});

test("returns runtime configuration and coordinator failures as secret-safe 503 responses", async () => {
  let missingAcquisitions = 0;
  const missing = createAuthRouteHandlers({
    appOrigin: undefined,
    getCoordinator: async () => { missingAcquisitions += 1; throw new Error("must not run"); },
  });
  for (const handler of [
    () => missing.request(post("/api/auth/request", '{"phone":"09121234567","role":"client"}')),
    () => missing.verify(post("/api/auth/verify", '{"code":"12345"}')),
    () => missing.challenge(new Request(`${APP_ORIGIN}/api/auth/challenge`)),
    () => missing.me(new Request(`${APP_ORIGIN}/api/auth/me`)),
    () => missing.refresh(post("/api/auth/refresh", "{}")),
    () => missing.logout(post("/api/auth/logout", "{}")),
  ]) {
    const missingResponse = await handler();
    assert.equal(missingResponse.status, 503);
    assert.deepEqual(await missingResponse.json(), { error: { code: "auth_unavailable" } });
  }
  assert.equal(missingAcquisitions, 0);

  const failing = createAuthRouteHandlers({ appOrigin: APP_ORIGIN, getCoordinator: async () => { throw new Error("access-token-private"); } });
  const failureResponse = await failing.request(post("/api/auth/request", '{"phone":"09121234567","role":"client"}'));
  assert.equal(failureResponse.status, 503);
  const body = JSON.stringify(await failureResponse.json());
  assert.equal(body.includes("access-token-private"), false);
  assert.equal(failureResponse.headers.get("cache-control"), "private, no-store");
});
