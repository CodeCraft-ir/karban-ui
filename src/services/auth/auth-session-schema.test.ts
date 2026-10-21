import assert from "node:assert/strict";
import { test } from "node:test";
import { getIronSession, type CookieStore } from "iron-session";
import {
  MAX_SEALED_SESSION_BYTES,
  parseSealedAuthSession,
} from "./auth-session-schema.ts";
import { applyAuthSession } from "./auth-session-storage.ts";
import type { AuthSessionData } from "./auth-coordinator.ts";

const now = 1_700_000_000_000;
const password = "test-password-only-not-a-deployment-secret".repeat(2);

function validSession(): AuthSessionData {
  return {
    sessionId: "9aa0a1b2-c3d4-4e5f-8a90-b1c2d3e4f5a6",
    version: 1,
    auth: {
      accessToken: "access-token",
      accessExpiresAt: now - 1,
      refreshToken: "refresh-token",
      refreshExpiresAt: now + 60_000,
      account: { id: 47, displayName: "آزاده نمونه", role: "specialist" },
      generation: "84e86fd2-2205-4880-a65c-4b8da64489f1",
    },
  };
}

test("accepts a current iron-session v9 seal with an expired access deadline but viable refresh", async () => {
  const values = new Map<string, string>();
  const store: CookieStore = {
    get: (name) => values.has(name) ? { name, value: values.get(name)! } : undefined,
    getAll: () => [...values].map(([name, value]) => ({ name, value })),
    set: (name, value) => { values.set(name, value); },
  };
  const options = { cookieName: "karban_auth", password, ttl: 2_592_000, cookieOptions: { httpOnly: true, sameSite: "lax" as const, secure: false, path: "/" } };
  const first = await getIronSession<AuthSessionData>(store, options);
  const original = validSession();
  Object.assign(first, original);
  await first.save();
  const restored = await getIronSession<AuthSessionData>(store, options);
  assert.deepEqual(parseSealedAuthSession(restored, now), original);
});

test("rejects partial, conflicting, oversized, and malformed sealed session fields without serializing credentials", () => {
  const valid = validSession();
  const malformed: unknown[] = [
    {},
    { ...valid, version: 2 },
    { ...valid, sessionId: "not-a-uuid" },
    { ...valid, auth: { ...valid.auth!, accessToken: "contains\ncontrol" } },
    { ...valid, auth: { ...valid.auth!, refreshExpiresAt: now } },
    { ...valid, auth: { ...valid.auth!, account: { ...valid.auth!.account, role: null } } },
    { ...valid, challenge: { trackingCode: "track", role: "client", codeLength: 6, deliveryMode: "sms", expiresAt: now + 1 } },
    { ...valid, challenge: { trackingCode: "track", role: "client", codeLength: 5, deliveryMode: "sms", expiresAt: now + 1 } },
    { ...valid, auth: undefined, challenge: { trackingCode: "track", role: "client", codeLength: 5, deliveryMode: "sms", expiresAt: now } },
    { ...valid, auth: undefined, challenge: { trackingCode: "x".repeat(MAX_SEALED_SESSION_BYTES), role: "client", codeLength: 5, deliveryMode: "sms", expiresAt: now + 1 } },
  ];
  for (const value of malformed) {
    assert.equal(parseSealedAuthSession(value, now), undefined);
  }
  const serialized = String(JSON.stringify(parseSealedAuthSession({ auth: { accessToken: "private-access" } }, now)));
  assert.equal(serialized.includes("private-access"), false);
});

test("applies a verified auth transition to a real iron cookie without retaining a stale challenge", async () => {
  const values = new Map<string, string>();
  const store: CookieStore = {
    get: (name) => values.has(name) ? { name, value: values.get(name)! } : undefined,
    getAll: () => [...values].map(([name, value]) => ({ name, value })),
    set: (name, value) => { values.set(name, value); },
  };
  const options = { cookieName: "karban_auth", password, ttl: 2_592_000, cookieOptions: { httpOnly: true, sameSite: "lax" as const, secure: false, path: "/" } };
  const requested = await getIronSession<AuthSessionData>(store, options);
  Object.assign(requested, {
    sessionId: "9aa0a1b2-c3d4-4e5f-8a90-b1c2d3e4f5a6",
    version: 1,
    challenge: { trackingCode: "track", role: "client", codeLength: 5, deliveryMode: "sms", expiresAt: now + 60_000 },
  } satisfies AuthSessionData);
  await requested.save();

  const verifying = await getIronSession<AuthSessionData>(store, options);
  applyAuthSession(verifying, validSession());
  await verifying.save();
  const restored = await getIronSession<AuthSessionData>(store, options);
  assert.equal(restored.challenge, undefined);
  assert.deepEqual(parseSealedAuthSession(restored, now), validSession());
});
