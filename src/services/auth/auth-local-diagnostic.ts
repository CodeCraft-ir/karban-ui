import type { AuthRefreshRequiredObserver } from "./auth-coordinator.ts";

export type AuthDiagnosticSurface = "rsc_account" | "rsc_profile" | "handler";

/** Temporary diagnostic policy. Only the server-only composer supplies the console sink. */
export function createLocalAuthDiagnostic(options: {
  nodeEnv: string | undefined;
  localDevelopmentEnabled: string | undefined;
  executionSurface: AuthDiagnosticSurface;
  /** Random module-instance UUID, generated independently of all session data. */
  coordinatorInstance: string;
  write: (line: string) => void;
}): AuthRefreshRequiredObserver {
  const enabled = (options.nodeEnv === "development" || options.nodeEnv === "test") && options.localDevelopmentEnabled === "true";
  return (reason) => {
    if (!enabled) return;
    // Runtime projection as well as static types: never stringify caller objects/errors.
    if (reason !== "access_expired" && reason !== "fence_busy" && reason !== "fence_seal_mismatch" && reason !== "fence_changed_during_read") return;
    const { executionSurface, coordinatorInstance } = options;
    if (executionSurface !== "rsc_account" && executionSurface !== "rsc_profile" && executionSurface !== "handler") return;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(coordinatorInstance)) return;
    try {
      options.write(`[karban-auth-diag] ${JSON.stringify({ reason, executionSurface, coordinatorInstance })}`);
    } catch { /* The diagnostic sink cannot affect auth decisions. */ }
  };
}
