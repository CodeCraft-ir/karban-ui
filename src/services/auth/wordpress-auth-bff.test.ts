import assert from "node:assert/strict";
import { test } from "node:test";
import { AuthGatewayError, createWordPressAuthGateway } from "./wordpress-auth.ts";

const REFRESH = "f5c26ab3447d73a4d90dcaa352d8ecf51b064dbd4731f34abc5c98a351d7de22";

test("reads local readiness through the fixed private endpoint without issuing OTP", async () => {
  const calls: Array<{ path: string; options: unknown }> = [];
  const gateway = createWordPressAuthGateway(async (path, options) => {
    calls.push({ path, options });
    return { otpReady: false, credentialProvenanceReady: false };
  });
  assert.deepEqual(await gateway.localStatus(), { otpReady: false, credentialProvenanceReady: false });
  assert.deepEqual(calls, [{ path: "auth/local-status", options: { method: "GET" } }]);
});

test("revoke-by-refresh calls the unauthenticated durable logout endpoint without an access token", async () => {
  const calls: Array<{ path: string; options: unknown }> = [];
  const gateway = createWordPressAuthGateway(async (path, options) => {
    calls.push({ path, options });
    return { logged_out: true };
  });
  assert.deepEqual(await gateway.logoutRefresh(REFRESH), { logged_out: true });
  assert.deepEqual(calls, [{
    path: "auth/logout/refresh",
    options: { method: "POST", body: { refresh_token: REFRESH } },
  }]);
});

test("rejects malformed local-status and logout-refresh payloads without retaining private credentials", async () => {
  const malformedStatus = createWordPressAuthGateway(async () => ({ otpReady: true }));
  await assert.rejects(() => malformedStatus.localStatus(), (error: unknown) => {
    assert.ok(error instanceof AuthGatewayError);
    assert.equal(error.code, "invalid_response");
    assert.equal(JSON.stringify(error, Object.getOwnPropertyNames(error)).includes(REFRESH), false);
    return true;
  });
  const malformedLogout = createWordPressAuthGateway(async () => ({ logged_out: false }));
  await assert.rejects(() => malformedLogout.logoutRefresh(REFRESH), (error: unknown) => {
    assert.ok(error instanceof AuthGatewayError);
    assert.equal(error.code, "invalid_response");
    assert.equal(JSON.stringify(error, Object.getOwnPropertyNames(error)).includes(REFRESH), false);
    return true;
  });
});
