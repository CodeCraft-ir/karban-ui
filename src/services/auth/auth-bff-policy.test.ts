import assert from "node:assert/strict";
import { test } from "node:test";
import { AuthCoordinatorError } from "./auth-coordinator.ts";
import { createOtpReadinessCheck } from "./auth-bff-policy.ts";

async function rejects(operation: () => Promise<unknown>): Promise<void> {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof AuthCoordinatorError);
    assert.equal(error.code, "auth_unavailable");
    assert.equal(error.status, 503);
    return true;
  });
}

test("blocks loopback OTP before requestOtp when opt-in is missing, readiness false, or preflight fails", async () => {
  for (const check of [
    createOtpReadinessCheck({ isLoopback: true, localDevelopmentEnabled: false, localSmsEnabled: false, getReadiness: async () => ({ mode: "local_simulated", codeLength: 6, providerConfigured: false, localRealSmsAllowed: false, otpSchemaReady: true, credentialSchemaReady: true }) }),
    createOtpReadinessCheck({ isLoopback: true, localDevelopmentEnabled: true, localSmsEnabled: false, getReadiness: async () => ({ mode: "local_simulated", codeLength: 6, providerConfigured: false, localRealSmsAllowed: false, otpSchemaReady: false, credentialSchemaReady: true }) }),
    createOtpReadinessCheck({ isLoopback: true, localDevelopmentEnabled: true, localSmsEnabled: false, getReadiness: async () => ({ mode: "local_simulated", codeLength: 6, providerConfigured: false, localRealSmsAllowed: false, otpSchemaReady: true, credentialSchemaReady: false }) }),
    createOtpReadinessCheck({ isLoopback: true, localDevelopmentEnabled: true, localSmsEnabled: false, getReadiness: async () => { throw new Error("fixed readiness 404 payload"); } }),
  ]) {
    await rejects(check);
  }
});

test("does not preflight nonloopback production providers", async () => {
  let calls = 0;
  const check = createOtpReadinessCheck({
    isLoopback: false,
    localDevelopmentEnabled: false,
    localSmsEnabled: false, getReadiness: async () => { calls += 1; return { mode: "local_simulated", codeLength: 6, providerConfigured: false, localRealSmsAllowed: false, otpSchemaReady: false, credentialSchemaReady: false }; },
  });
  await assert.doesNotReject(check);
  assert.equal(calls, 0);
});

test("allows loopback issuance only after both trusted readiness booleans are true", async () => {
  let calls = 0;
  const check = createOtpReadinessCheck({
    isLoopback: true,
    localDevelopmentEnabled: true,
    localSmsEnabled: false, getReadiness: async () => { calls += 1; return { mode: "local_simulated", codeLength: 6, providerConfigured: false, localRealSmsAllowed: false, otpSchemaReady: true, credentialSchemaReady: true }; },
  });
  await assert.doesNotReject(check);
  assert.equal(calls, 1);
});
