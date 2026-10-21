import type { AccountSummary, RegistrationRole } from "../../lib/contracts/auth.ts";
import type {
  AuthChallengeContext,
  AuthCredentialContext,
  AuthSessionData,
} from "./auth-coordinator.ts";

export const MAX_SEALED_SESSION_BYTES = 3_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const CONTROL = /[\p{Cc}]/u;

function object(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function safeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function boundedText(value: unknown, maximum: number, allowEmpty = false): value is string {
  return typeof value === "string" &&
    (allowEmpty || value.length > 0) &&
    value.length <= maximum &&
    !CONTROL.test(value);
}

function token(value: unknown, maximum: number): value is string {
  return boundedText(value, maximum) && !/\s/u.test(value);
}

function parseAccount(value: unknown): AccountSummary | undefined {
  const account = object(value);
  if (!account || !exactKeys(account, ["id", "displayName", "role"]) ||
    !safeInteger(account.id) || account.id < 1 ||
    !boundedText(account.displayName, 160, true) ||
    (account.role !== "client" && account.role !== "specialist")) {
    return undefined;
  }
  return { id: account.id, displayName: account.displayName, role: account.role };
}

function parseChallenge(value: unknown, now: number): AuthChallengeContext | undefined {
  const challenge = object(value);
  if (!challenge || !exactKeys(challenge, ["trackingCode", "role", "codeLength", "deliveryMode", "expiresAt"]) ||
    !boundedText(challenge.trackingCode, 128) ||
    (challenge.role !== "client" && challenge.role !== "specialist") ||
    (challenge.codeLength !== 5 && challenge.codeLength !== 6) ||
    (challenge.deliveryMode !== "sms" && challenge.deliveryMode !== "local_simulated") ||
    !safeInteger(challenge.expiresAt) || challenge.expiresAt <= now ||
    (challenge.deliveryMode === "sms" && challenge.codeLength !== 5) ||
    (challenge.deliveryMode === "local_simulated" && challenge.codeLength !== 6)) {
    return undefined;
  }
  return {
    trackingCode: challenge.trackingCode,
    role: challenge.role,
    codeLength: challenge.codeLength,
    deliveryMode: challenge.deliveryMode,
    expiresAt: challenge.expiresAt,
  };
}

function parseAuth(value: unknown, now: number): AuthCredentialContext | undefined {
  const auth = object(value);
  if (!auth || !exactKeys(auth, ["accessToken", "accessExpiresAt", "refreshToken", "refreshExpiresAt", "account", "generation"]) ||
    !token(auth.accessToken, 2_048) || !safeInteger(auth.accessExpiresAt) || auth.accessExpiresAt < 1 ||
    !token(auth.refreshToken, 512) || !safeInteger(auth.refreshExpiresAt) || auth.refreshExpiresAt <= now ||
    !boundedText(auth.generation, 36) || !UUID.test(auth.generation)) {
    return undefined;
  }
  const account = parseAccount(auth.account);
  if (!account) {
    return undefined;
  }
  return {
    accessToken: auth.accessToken,
    accessExpiresAt: auth.accessExpiresAt,
    refreshToken: auth.refreshToken,
    refreshExpiresAt: auth.refreshExpiresAt,
    account,
    generation: auth.generation,
  };
}

/** Parses only the sealed shape the BFF owns; malformed input never throws or echoes private values. */
export function parseSealedAuthSession(value: unknown, now: number): AuthSessionData | undefined {
  if (!safeInteger(now)) {
    return undefined;
  }
  try {
    if (JSON.stringify(value).length > MAX_SEALED_SESSION_BYTES) {
      return undefined;
    }
  } catch {
    return undefined;
  }
  const session = object(value);
  if (!session || !exactKeys(session, Object.hasOwn(session, "challenge") || Object.hasOwn(session, "auth")
    ? ["sessionId", "version", ...(Object.hasOwn(session, "challenge") ? ["challenge"] : []), ...(Object.hasOwn(session, "auth") ? ["auth"] : [])]
    : ["sessionId", "version"]) ||
    session.version !== 1 || !boundedText(session.sessionId, 36) || !UUID.test(session.sessionId)) {
    return undefined;
  }
  if (Object.hasOwn(session, "challenge") && Object.hasOwn(session, "auth")) {
    return undefined;
  }
  const challenge = Object.hasOwn(session, "challenge") ? parseChallenge(session.challenge, now) : undefined;
  const auth = Object.hasOwn(session, "auth") ? parseAuth(session.auth, now) : undefined;
  if ((Object.hasOwn(session, "challenge") && !challenge) || (Object.hasOwn(session, "auth") && !auth)) {
    return undefined;
  }
  return {
    sessionId: session.sessionId,
    version: 1,
    ...(challenge ? { challenge } : {}),
    ...(auth ? { auth } : {}),
  };
}
