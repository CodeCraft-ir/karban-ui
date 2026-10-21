import type { AuthSummarySnapshot } from "./auth-summary-store.ts";

export type LogoutPresentation =
  | { state: "pending"; label: "در حال خروج..." }
  | { state: "error"; label: "خروج انجام نشد" }
  | { state: "idle"; label: "" };

type LogoutPresentationInput = Pick<AuthSummarySnapshot, "logoutPending" | "logoutError"> & Partial<Pick<AuthSummarySnapshot, "account" | "pending" | "error">>;

export function getLogoutPresentation(snapshot: LogoutPresentationInput): LogoutPresentation {
  if (snapshot.logoutPending) return { state: "pending", label: "در حال خروج..." };
  if (snapshot.logoutError) return { state: "error", label: "خروج انجام نشد" };
  return { state: "idle", label: "" };
}
