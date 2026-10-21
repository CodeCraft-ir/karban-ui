export type LogoutOutcome = "success" | "failure";

export interface LogoutPresentation {
  pending: false;
  account: null;
  error: boolean;
  navigateTo: "/" | null;
}

export function canStartLogout(pending: boolean): boolean {
  return !pending;
}

/** A remote failure is not a claim about revocation; local UI becomes anonymous either way. */
export function settleLogout(outcome: LogoutOutcome): LogoutPresentation {
  return {
    pending: false,
    account: null,
    error: outcome === "failure",
    navigateTo: outcome === "success" ? "/" : null,
  };
}
