import type { IronSession } from "iron-session";
import type { AuthSessionData, AuthSessionPort } from "./auth-coordinator.ts";

/** Applies a complete replacement before the caller saves an iron-session cookie. */
export function applyAuthSession(
  session: IronSession<AuthSessionData>,
  next: AuthSessionData,
): void {
  delete session.sessionId;
  delete session.version;
  delete session.challenge;
  delete session.auth;
  session.sessionId = next.sessionId;
  session.version = next.version;
  if (next.challenge) {
    session.challenge = next.challenge;
  }
  if (next.auth) {
    session.auth = next.auth;
  }
}

/** The same real iron-session port serves handlers and read-only server helpers. */
export function createIronSessionPort(
  session: IronSession<AuthSessionData>,
  initial: AuthSessionData | undefined,
  readOnly = false,
): AuthSessionPort {
  let current = initial;
  return {
    read: () => current,
    save: async (next) => {
      if (readOnly) throw new Error("read-only auth session");
      applyAuthSession(session, next);
      await session.save();
      current = next;
    },
    destroy: () => {
      current = undefined;
      if (!readOnly) session.destroy();
    },
  };
}
