import { AuthCoordinatorError } from "./auth-coordinator.ts";
import { parseUpstreamOtpReadiness, type OtpReadinessReceipt } from "./contracts.ts";

export interface OtpReadinessDependencies {
  isLoopback: boolean;
  localDevelopmentEnabled: boolean;
  localSmsEnabled: boolean;
  getReadiness: () => Promise<unknown>;
}

/** Returns trusted expected context, never browser intent or the request response itself. */
export function createOtpReadinessCheck(dependencies: OtpReadinessDependencies): () => Promise<OtpReadinessReceipt> {
  return async () => {
    if (!dependencies.isLoopback) return { mode: "sms", codeLength: 5 };
    if (!dependencies.localDevelopmentEnabled) throw new AuthCoordinatorError("auth_unavailable");
    try {
      const status = parseUpstreamOtpReadiness(await dependencies.getReadiness());
      const expected: OtpReadinessReceipt = dependencies.localSmsEnabled
        ? { mode: "sms", codeLength: 5 }
        : { mode: "local_simulated", codeLength: 6 };
      if (!status.otpSchemaReady || !status.credentialSchemaReady ||
          status.mode !== expected.mode || status.codeLength !== expected.codeLength ||
          (expected.mode === "sms" ? !status.providerConfigured || !status.localRealSmsAllowed : status.localRealSmsAllowed)) {
        throw new AuthCoordinatorError("auth_unavailable");
      }
      return expected;
    } catch {
      throw new AuthCoordinatorError("auth_unavailable");
    }
  };
}
