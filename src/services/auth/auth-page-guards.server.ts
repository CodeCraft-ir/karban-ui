import "server-only";

import { redirect } from "next/navigation";
import { resolveProtectedRouteFromSession, type ProtectedRoute } from "@/lib/auth-page-guards";
import type { AccountSummary } from "@/lib/contracts/auth";
import { getAuthSession } from "@/services/auth/session.server";
import { parseSealedAuthSession } from "@/services/auth/auth-session-schema";

export async function readSafeAccount(): Promise<AccountSummary | undefined> {
  const session = await getAuthSession();
  if (!session) return undefined;
  const parsed = parseSealedAuthSession(session, Date.now());
  if (!parsed?.auth || parsed.auth.accessExpiresAt <= Date.now()) return undefined;
  return parsed.auth.account;
}

export async function requireAccount(required: ProtectedRoute): Promise<AccountSummary> {
  const result = await resolveProtectedRouteFromSession({ readAccount: readSafeAccount }, required);
  if (result.kind === "redirect") redirect(result.location);
  return result.account;
}
