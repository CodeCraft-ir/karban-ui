import "server-only";

import { Console } from "node:console";

import type { IronSession } from "iron-session";
import {
  createAuthCoordinator,
  type SealedAuthCoordinator,
  type AuthSessionData,
} from "./auth-coordinator.ts";
import { createOtpReadinessCheck } from "./auth-bff-policy.ts";
import { getAuthRuntimeConfig, isLocalSmsAllowed, isLoopbackOtpAllowed, isLoopbackWordPressOrigin } from "./auth-runtime-config.ts";
import type { AuthRouteAdapterDependencies } from "./auth-route-adapters.ts";
import { getAuthSession } from "./session.server.ts";
import { createIronSessionPort } from "./auth-session-storage.ts";
import { parseSealedAuthSession } from "./auth-session-schema.ts";
import { createWordPressAuthGateway } from "./wordpress-auth.ts";
import { getWordPressOrigin } from "../wordpress/config.ts";
import { createLocalAuthDiagnostic, type AuthDiagnosticSurface } from "./auth-local-diagnostic.ts";
import { appendLocalAuthDiagnostic } from "./auth-local-diagnostic-sink.ts";

import { processAuthAuthority } from "./auth-authority.server.ts";

// Do not use global console: React replays its RSC calls into browser Flight data.
const diagnosticConsole = new Console({ stdout: process.stdout, stderr: process.stderr });

function hasSealedAuthData(session: IronSession<AuthSessionData>): boolean {
  return ["sessionId", "version", "challenge", "auth"].some((key) => Object.hasOwn(session, key));
}

/** Server-only request composition. Read-only mode never writes or destroys cookies. */
export async function createRequestAuthCoordinator(readOnly = false, executionSurface: AuthDiagnosticSurface = "handler"): Promise<SealedAuthCoordinator> {
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
      localSmsEnabled: isLocalSmsAllowed(process.env, wordpressOrigin),
      getReadiness: () => gateway.otpReadiness(),
    }),
    refreshCoordinator: processAuthAuthority.coordinator,
    observeRefreshRequired: createLocalAuthDiagnostic({
      nodeEnv: process.env.NODE_ENV,
      localDevelopmentEnabled: process.env.KARBAN_LOCAL_DEVELOPMENT,
      executionSurface,
      coordinatorInstance: processAuthAuthority.instance,
      write: (line) => { appendLocalAuthDiagnostic(line); diagnosticConsole.info(line); },
    }),
  });
}

/** Route handlers call this at request time; no environment is read during module import. */
export function getAuthBffRouteDependencies(): AuthRouteAdapterDependencies {
  return {
    appOrigin: getAuthRuntimeConfig()?.appOrigin,
    getCoordinator: () => createRequestAuthCoordinator(),
  };
}
