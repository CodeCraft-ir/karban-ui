import assert from "node:assert/strict";
import { test } from "node:test";
import { AuthCoordinatorError } from "./auth-coordinator.ts";
import { createOtpReadinessCheck } from "./auth-bff-policy.ts";

async function rejects(operation: () => Promise<void>): Promise<void> {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof AuthCoordinatorError);
    assert.equal(error.code, "auth_unavailable");
    assert.equal(error.status, 503);
    return true;
  });
}

test("blocks loopback OTP before requestOtp when opt-in is missing, readiness false, or preflight fails", async () => {
  for (const check of [
    createOtpReadinessCheck({ isLoopback: true, localDevelopmentEnabled: false, getLocalStatus: async () => ({ otpReady: true, credentialProvenanceReady: true }) }),
    createOtpReadinessCheck({ isLoopback: true, localDevelopmentEnabled: true, getLocalStatus: async () => ({ otpReady: false, credentialProvenanceReady: true }) }),
    createOtpReadinessCheck({ isLoopback: true, localDevelopmentEnabled: true, getLocalStatus: async () => ({ otpReady: true, credentialProvenanceReady: false }) }),
    createOtpReadinessCheck({ isLoopback: true, localDevelopmentEnabled: true, getLocalStatus: async () => { throw new Error("fixed readiness 404 payload"); } }),
  ]) {
    await rejects(check);
  }
});

test("does not preflight nonloopback production providers", async () => {
  let calls = 0;
  const check = createOtpReadinessCheck({
    isLoopback: false,
    localDevelopmentEnabled: false,
    getLocalStatus: async () => { calls += 1; return { otpReady: false, credentialProvenanceReady: false }; },
  });
  await assert.doesNotReject(check);
  assert.equal(calls, 0);
});

test("allows loopback issuance only after both trusted readiness booleans are true", async () => {
  let calls = 0;
  const check = createOtpReadinessCheck({
    isLoopback: true,
    localDevelopmentEnabled: true,
    getLocalStatus: async () => { calls += 1; return { otpReady: true, credentialProvenanceReady: true }; },
  });
  await assert.doesNotReject(check);
  assert.equal(calls, 1);
});
