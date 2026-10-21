import "server-only";

import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { AuthSessionData } from "./auth-coordinator.ts";
import { getAuthRuntimeConfig } from "./auth-runtime-config.ts";
import { applyAuthSession } from "./auth-session-storage.ts";

export const AUTH_SESSION_COOKIE_NAME = "karban_auth";
const AUTH_SESSION_TTL_SECONDS = 2_592_000;

function sessionOptions(password: string): SessionOptions {
  return {
    cookieName: AUTH_SESSION_COOKIE_NAME,
    password,
    ttl: AUTH_SESSION_TTL_SECONDS,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  };
}

export async function getAuthSession(): Promise<IronSession<AuthSessionData> | undefined> {
  const config = getAuthRuntimeConfig();
  if (!config) {
    return undefined;
  }
  return getIronSession<AuthSessionData>(await cookies(), sessionOptions(config.ironPassword));
}

export function replaceAuthSession(
  session: IronSession<AuthSessionData>,
  next: AuthSessionData,
): Promise<void> {
  applyAuthSession(session, next);
  return session.save();
}
