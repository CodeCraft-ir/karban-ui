import "server-only";

import type { IronSession } from "iron-session";
import {
  createAuthCoordinator,
  createRefreshCoordinator,
  type SealedAuthCoordinator,
  type AuthSessionData,
} from "./auth-coordinator.ts";
import { createOtpReadinessCheck } from "./auth-bff-policy.ts";
import { getAuthRuntimeConfig, isLoopbackOtpAllowed, isLoopbackWordPressOrigin } from "./auth-runtime-config.ts";
import type { AuthRouteAdapterDependencies } from "./auth-route-adapters.ts";
import { getAuthSession } from "./session.server.ts";
import { createIronSessionPort } from "./auth-session-storage.ts";
import { parseSealedAuthSession } from "./auth-session-schema.ts";
import { createWordPressAuthGateway } from "./wordpress-auth.ts";
import { getWordPressOrigin } from "../wordpress/config.ts";

const refreshCoordinator = createRefreshCoordinator(() => Date.now());

function hasSealedAuthData(session: IronSession<AuthSessionData>): boolean {
  return ["sessionId", "version", "challenge", "auth"].some((key) => Object.hasOwn(session, key));
}

/** Server-only request composition. Read-only mode never writes or destroys cookies. */
export async function createRequestAuthCoordinator(readOnly = false): Promise<SealedAuthCoordinator> {
  const config = getAuthRuntimeConfig();
  if (!config) {
    throw new Error("auth configuration unavailable");
  }
  const session = await getAuthSession();
  if (!session) {
    throw new Error("auth session unavailable");
  }
  const initial = parseSealedAuthSession(session, Date.now());
  if (!initial && hasSealedAuthData(session)) {
    // Invalid seals are terminal; rendering must not mutate cookies.
    if (!readOnly) session.destroy();
    throw new Error("invalid sealed auth session");
  }
  const wordpressOrigin = getWordPressOrigin();
  const gateway = createWordPressAuthGateway();
  return createAuthCoordinator({
    gateway,
    session: createIronSessionPort(session, initial, readOnly),
    now: () => Date.now(),
    uuid: () => crypto.randomUUID(),
    ensureOtpReady: createOtpReadinessCheck({
      isLoopback: isLoopbackWordPressOrigin(wordpressOrigin),
      localDevelopmentEnabled: isLoopbackOtpAllowed(process.env, wordpressOrigin),
      getLocalStatus: () => gateway.localStatus(),
    }),
    refreshCoordinator,
  });
}

/** Route handlers call this at request time; no environment is read during module import. */
export function getAuthBffRouteDependencies(): AuthRouteAdapterDependencies {
  return {
    appOrigin: getAuthRuntimeConfig()?.appOrigin,
    getCoordinator: () => createRequestAuthCoordinator(),
  };
}
