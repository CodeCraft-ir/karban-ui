import type { AccountSummary, RegistrationRole } from "./contracts/auth.ts";

export type ProtectedRoute = "client" | "specialist";
export type GuardResult =
  | { kind: "allow"; account: AccountSummary }
  | { kind: "redirect"; location: "/auth/login" | "/dashboard" | "/pro" };

export interface SafeAccountSessionPort {
  readAccount(): Promise<AccountSummary | undefined>;
}

export function resolveProtectedRoute(account: AccountSummary | undefined, required: ProtectedRoute): GuardResult {
  if (!account || !account.role) return { kind: "redirect", location: "/auth/login" };
  if (account.role === required) return { kind: "allow", account };
  const home: Record<RegistrationRole, "/dashboard" | "/pro"> = {
    client: "/dashboard",
    specialist: "/pro",
  };
  return { kind: "redirect", location: home[account.role] };
}

export async function resolveProtectedRouteFromSession(
  port: SafeAccountSessionPort,
  required: ProtectedRoute,
): Promise<GuardResult> {
  return resolveProtectedRoute(await port.readAccount(), required);
}
