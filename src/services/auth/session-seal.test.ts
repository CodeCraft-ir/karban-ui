import assert from "node:assert/strict";
import { test } from "node:test";
import { getIronSession, type CookieStore } from "iron-session";
import type { AuthSessionData } from "./auth-coordinator.ts";

const password = "test-password-only-not-a-deployment-secret".repeat(2);

test("real iron-session v9 seal stays below one host-only 4KiB cookie with realistic private auth state", async () => {
  const writes: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const store: CookieStore = {
    get: () => undefined,
    getAll: () => [],
    set: (name, value, options) => { writes.push({ name, value, options: options as Record<string, unknown> }); },
  };
  const session = await getIronSession<AuthSessionData>(store, {
    cookieName: "karban_auth",
    password,
    ttl: 2_592_000,
    cookieOptions: { httpOnly: true, sameSite: "lax", secure: false, path: "/" },
  });
  Object.assign(session, {
    sessionId: "9aa0a1b2-c3d4-4e5f-8a90-b1c2d3e4f5a6",
    version: 1,
    challenge: {
      trackingCode: "4670bf85-7183-46c8-9fba-79198fd2ee53",
      role: "specialist",
      codeLength: 6,
      deliveryMode: "local_simulated",
      expiresAt: 1_700_000_120_000,
    },
    auth: {
      accessToken: `eyJhbGciOiJIUzI1NiJ9.${"a".repeat(640)}.signature`,
      accessExpiresAt: 1_700_000_900_000,
      refreshToken: "r".repeat(128),
      refreshExpiresAt: 1_702_592_000_000,
      account: { id: 47, displayName: "آزاده نمونه", role: "specialist" },
      generation: "84e86fd2-2205-4880-a65c-4b8da64489f1",
    },
  } satisfies AuthSessionData);
  await session.save();

  assert.equal(writes.length, 1);
  const [cookie] = writes;
  assert.equal(cookie.name, "karban_auth");
  assert.ok(cookie.value.length < 4_096);
  assert.equal(cookie.options.httpOnly, true);
  assert.equal(cookie.options.sameSite, "lax");
  assert.equal(cookie.options.secure, false);
  assert.equal(cookie.options.path, "/");
  assert.equal("domain" in cookie.options, false);
});
