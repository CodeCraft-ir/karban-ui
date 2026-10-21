import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuthCoordinator, createRefreshCoordinator, type AuthGatewayPort, type AuthSessionData, type AuthSessionPort } from "./auth-coordinator.ts";

const now = 1_700_000_000_000;
const base = (): AuthSessionData => ({ sessionId: "9aa0a1b2-c3d4-4e5f-8a90-b1c2d3e4f5a6", version: 1, auth: { accessToken: "private-access", refreshToken: "private-refresh", accessExpiresAt: now + 10_000, refreshExpiresAt: now + 100_000, generation: "84e86fd2-2205-4880-a65c-4b8da64489f1", account: { id: 47, displayName: "نام", role: "specialist" } } });
function port(initial: AuthSessionData | undefined = base()) {
  let state: AuthSessionData | undefined = initial; const saved: AuthSessionData[] = [];
  return { read: () => state, save: async (next: AuthSessionData) => { state = structuredClone(next); saved.push(next); }, destroy: () => { state = undefined; }, saved };
}
function setup(session: AuthSessionPort = port(), shared = createRefreshCoordinator(() => now)) {
  const gateway: AuthGatewayPort = {
    requestOtp: async () => { throw Error("unused"); }, verifyOtp: async () => { throw Error("unused"); },
    refresh: async () => ({ tokens: { access_token: "new-access", refresh_token: "new-refresh", access_expires_in: 900, refresh_expires_in: 9000, token_type: "Bearer" } }),
    me: async () => ({ id: 47, display_name: "نام", roles: ["nahan_specialist"], phone: null, specialist_post_id: 1 }),
    logoutRefresh: async () => ({ logged_out: true }),
  };
  return createAuthCoordinator({ session, gateway, refreshCoordinator: shared, now: () => now, uuid: () => crypto.randomUUID(), ensureOtpReady: async () => {} });
}
function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; }

test("sealed operation validates expiry and never rotates or saves on a read", async () => {
  const p = port(); const c = setup(p);
  assert.equal(typeof c.authenticatedOperation, "function", "internal sealed operation is missing");
  assert.deepEqual(await c.authenticatedOperation(async (_token, account) => account), base().auth!.account);
  assert.equal(p.saved.length, 0);
  const expired = base(); expired.auth!.accessExpiresAt = now;
  await assert.rejects(setup(port(expired)).authenticatedOperation(async () => 1), { code: "refresh_required" });
  await assert.rejects(setup({ read: () => undefined, save: async () => {}, destroy: () => {} }).authenticatedOperation(async () => 1), { code: "unauthenticated" });
});

test("internal operation rejects a malformed current seal before any gateway use", async () => {
  for (const patch of [{generation:"invalid"},{accessToken:{}},{account:{id:47,displayName:"نام",role:"administrator"}}]) {
    const malformed=base();Object.assign(malformed.auth!,patch);let calls=0;
    await assert.rejects(setup(port(malformed)).authenticatedOperation(async()=>{calls++;return 1;}),{code:"unauthenticated"});
    assert.equal(calls,0);
  }
});

test("summary write preserves credentials, rejects identity changes and independent stale response ports", async () => {
  const shared = createRefreshCoordinator(() => now); const p = port(); const c = setup(p, shared);
  const updated = { ...base().auth!.account, displayName: "تازه" };
  assert.equal(await c.authenticatedOperation(async () => updated, a => a), updated);
  assert.equal(p.saved[0].auth!.accessToken, "private-access");
  assert.equal(p.saved[0].auth!.refreshToken, "private-refresh");
  assert.equal(p.saved[0].auth!.account.displayName, "تازه");
  assert.equal("challenge" in p.saved[0], false);
  await assert.rejects(setup(port(), shared).authenticatedOperation(async () => updated, a => a), { code: "refresh_required" });
  await assert.rejects(c.authenticatedOperation(async () => ({ ...updated, id: 90 }), a => a), { code: "auth_unavailable" });
});

test("concurrent refresh cannot be overwritten by a stale independent account port", async () => {
  const shared = createRefreshCoordinator(() => now); const p = port();
  await setup(p, shared).refresh();
  let called = false;
  await assert.rejects(setup(port(), shared).authenticatedOperation(async () => { called = true; return 1; }), { code: "refresh_required" });
  assert.equal(called, false);
  assert.equal(p.read()!.auth!.refreshToken, "new-refresh");
});

test("logout from an independent response port wins an in-flight mutation and prevents summary save", async () => {
  const shared = createRefreshCoordinator(() => now); const p = port(); const started = deferred(); const finish = deferred();
  const write = setup(p, shared).authenticatedOperation(async () => { started.resolve(); await finish.promise; return { ...base().auth!.account, displayName: "late" }; }, a => a);
  await started.promise;
  await setup(port(), shared).logout();
  finish.resolve();
  await assert.rejects(write, { code: "refresh_cancelled" });
  assert.equal(p.saved.length, 0);
});

test("logout cancellation survives replay grace across independent response ports for the credential lifetime", async () => {
  let time=now;const shared=createRefreshCoordinator(()=>time);
  await setup(port(),shared).logout();time+=6000;
  let calls=0;
  await assert.rejects(setup(port(),shared).authenticatedOperation(async()=>{calls++;return 1;}),{code:"unauthenticated"});
  assert.equal(calls,0);
});

test("ambiguous operation and failed save are not retried; overlapping writes fail closed", async () => {
  const p = port(); let calls = 0;
  await assert.rejects(setup(p).authenticatedOperation(async () => { calls++; throw Error("private backend"); }), /private backend/);
  assert.equal(calls, 1);
  const bad: AuthSessionPort = { ...p, save: async () => { throw Error("cookie failure"); } };
  await assert.rejects(setup(bad).authenticatedOperation(async () => base().auth!.account, a => a), { code: "auth_unavailable" });
  const shared = createRefreshCoordinator(() => now); const started = deferred(); const finish = deferred();
  const pending = setup(port(), shared).authenticatedOperation(async () => { started.resolve(); await finish.promise; return 1; }, undefined, true);
  await started.promise;
  await assert.rejects(setup(port(), shared).authenticatedOperation(async () => 2, undefined, true), { code: "refresh_required" });
  finish.resolve(); await pending;
});
