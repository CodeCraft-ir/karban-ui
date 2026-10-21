import { AuthCoordinatorError } from "./auth-coordinator.ts";
import type { UpstreamLocalStatus } from "./contracts.ts";

export interface OtpReadinessDependencies {
  isLoopback: boolean;
  localDevelopmentEnabled: boolean;
  getLocalStatus: () => Promise<UpstreamLocalStatus>;
}

export function createOtpReadinessCheck(dependencies: OtpReadinessDependencies): () => Promise<void> {
  return async () => {
    if (!dependencies.isLoopback) {
      return;
    }
    if (!dependencies.localDevelopmentEnabled) {
      throw new AuthCoordinatorError("auth_unavailable");
    }
    try {
      const status = await dependencies.getLocalStatus();
      if (status.otpReady !== true || status.credentialProvenanceReady !== true) {
        throw new AuthCoordinatorError("auth_unavailable");
      }
    } catch (error) {
      if (error instanceof AuthCoordinatorError) {
        throw error;
      }
      throw new AuthCoordinatorError("auth_unavailable");
    }
  };
}
