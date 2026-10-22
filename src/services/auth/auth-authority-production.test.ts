import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import { test } from "node:test";
import type { AuthSessionData } from "./auth-coordinator.ts";

// Two separately evaluated production source graphs, sharing only the Node global.
// Substitute only Next's cookie boundary; policy, ports, gateways and services are real.
const fixture = globalThis as typeof globalThis & { authorityTestSession?: AuthSessionData & { save(): Promise<void>; destroy(): void } };
type Result = { url: string; shortCircuit?: boolean };
type Context = { parentURL?: string };
type Resolve = (s: string, c: Context, next: (s: string, c: Context) => Result) => Result;
const { registerHooks } = nodeModule as unknown as { registerHooks(h: { resolve: Resolve }): { deregister(): void } };
const hooks = registerHooks({ resolve(specifier, context, next) {
  if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
  if (specifier === "./session.server.ts" && context.parentURL?.includes("/auth-bff.server.ts")) return { url: "data:text/javascript,export async function getAuthSession(){return globalThis.authorityTestSession}", shortCircuit: true };
  const result = next(specifier, context);
  const surface = context.parentURL && new URL(context.parentURL).searchParams.get("surface");
  if (surface && result.url.includes("/src/services/") && !result.url.includes("?")) return { ...result, url: `${result.url}?surface=${surface}` };
  return result;
} });
// Nonliteral URLs intentionally force independent module evaluations.
const load = (file: string, surface: string) => import(new URL(`${file}?surface=${surface}`, import.meta.url).href);
const handler = await load("./auth-bff.server.ts", "handler");
const rsc = await load("../profile/profile-bff.server.ts", "rsc");
const profileHandler = await load("../profile/profile-bff.server.ts", "handler");
const { createAuthRouteHandlers } = await load("./auth-route-adapters.ts", "handler");
const handlerAuthority = (await load("./auth-authority.server.ts", "handler")).processAuthAuthority;
const rscAuthority = (await load("./auth-authority.server.ts", "rsc")).processAuthAuthority;
const HandlerError = (await load("./auth-coordinator.ts", "handler")).AuthCoordinatorError;
const RscError = (await load("./auth-coordinator.ts", "rsc")).AuthCoordinatorError;
hooks.deregister();

function session(): AuthSessionData {
  const now = Date.now();
  return { sessionId: crypto.randomUUID(), version: 1, auth: { accessToken: "synthetic-access-A", refreshToken: "synthetic-refresh-A", accessExpiresAt: now + 60_000, refreshExpiresAt: now + 600_000, generation: crypto.randomUUID(), account: { id: 47, displayName: "نام", role: "specialist" } } };
}
function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; }

test("production module copies share refresh seals, reservations and logout cancellation", async () => {
  const keys = ["APP_ORIGIN", "IRON_SESSION_PASSWORD", "WORDPRESS_URL", "WORDPRESS_PERMALINK_MODE", "NODE_ENV", "KARBAN_LOCAL_DEVELOPMENT"];
  const prior = keys.map(k => [k, process.env[k]] as const);
  const fetch = globalThis.fetch;
  let saves = 0; let destroys = 0; let reads = 0; let refreshes = 0; let posts = 0;
  let blockRefresh: ReturnType<typeof deferred> | undefined;
  let refreshEntered: ReturnType<typeof deferred> | undefined;
  let blockWrite: ReturnType<typeof deferred> | undefined;
  let writeEntered: ReturnType<typeof deferred> | undefined;
  let name = "نام";
  const account = () => ({ id: 47, display_name: name, role: "specialist", login_phone_masked: null, avatar: null, location: null, specialist: { id: 51, slug: "specialist-47", status: "draft" } });
  const attach = (data: AuthSessionData) => { fixture.authorityTestSession = Object.defineProperties(structuredClone(data), { save: { value: async () => { saves++; } }, destroy: { value: () => { destroys++; } } }) as NonNullable<typeof fixture.authorityTestSession>; };
  const request = () => new Request("http://localhost:3000/api/account/me");
  try {
    process.env.APP_ORIGIN = "http://localhost:3000";
    process.env.IRON_SESSION_PASSWORD = "synthetic-fixture-password-not-a-secret-12345";
    process.env.WORDPRESS_URL = "http://localhost/karban";
    process.env.WORDPRESS_PERMALINK_MODE = "pretty";
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    process.env.KARBAN_LOCAL_DEVELOPMENT = "false";
    globalThis.fetch = async (input, options) => {
      const path = String(input);
      if (path.endsWith("/auth/refresh")) {
        refreshes++; refreshEntered?.resolve(); await blockRefresh?.promise;
        return Response.json({ success: true, data: { tokens: { access_token: "synthetic-access-B", refresh_token: "synthetic-refresh-B", access_expires_in: 120, refresh_expires_in: 600, token_type: "Bearer" } } });
      }
      if (path.endsWith("/auth/me")) return Response.json({ success: true, data: { id: 47, display_name: name, roles: ["nahan_specialist"], phone: null, specialist_post_id: 51 } });
      if (path.endsWith("/auth/logout/refresh")) return Response.json({ success: true, data: { logged_out: true } });
      assert.ok(path.endsWith("/account/me"), "no unexpected upstream operation");
      if (options?.method === "POST") { posts++; writeEntered?.resolve(); await blockWrite?.promise; name = "تازه"; }
      else reads++;
      return Response.json({ success: true, data: account() });
    };
    assert.equal(handlerAuthority.instance, rscAuthority.instance, "diagnostics name the shared authority, not a module copy");
    assert.notEqual(HandlerError, RscError, "fixture genuinely evaluates independent source contexts");
    const replayKey = crypto.randomUUID();
    await assert.rejects(rscAuthority.coordinator.run(replayKey, async () => { throw new RscError("refresh_required"); }), (error: unknown) => error instanceof RscError && (error as { code: string }).code === "refresh_required");
    await assert.rejects(handlerAuthority.coordinator.run(replayKey, async () => { throw Error("must replay, not run"); }), (error: unknown) => error instanceof HandlerError && (error as { code: string }).code === "refresh_required");
    const a = session(); attach(a);
    assert.equal((await rsc.readOwnerAccount()).id, 47, "prime A in RSC copy");
    const refreshed = await createAuthRouteHandlers(handler.getAuthBffRouteDependencies()).refresh(new Request("http://localhost:3000/api/auth/refresh", { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: "{}" }));
    assert.equal(refreshed.status, 200);
    assert.equal(refreshed.headers.get("Cache-Control"), "private, no-store");
    const b = structuredClone({ sessionId: fixture.authorityTestSession!.sessionId, version: 1 as const, auth: fixture.authorityTestSession!.auth });
    assert.notEqual(b.auth!.accessToken, a.auth!.accessToken);
    assert.equal(b.auth!.generation, a.auth!.generation);
    attach(b);
    assert.equal((await profileHandler.getProfileRouteHandlers().account(request())).status, 200);
    assert.equal((await rsc.readOwnerAccount()).id, 47, "fresh B must pass previously primed RSC authority");
    assert.equal(saves, 1); assert.equal(destroys, 0);
    attach(a);
    const readsBefore = reads;
    await assert.rejects(rsc.readOwnerAccount(), { code: "refresh_required" });
    assert.equal((await profileHandler.getProfileRouteHandlers().account(request())).status, 401);
    assert.equal(reads, readsBefore, "old A cannot reach upstream");

    // Account summary persistence must update the same full-seal authority too.
    attach(b); blockWrite = deferred(); writeEntered = deferred();
    const write = profileHandler.getProfileRouteHandlers().updateAccount(new Request(request(), { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify({ display_name: "تازه" }) }));
    await writeEntered.promise;
    await assert.rejects(rsc.readOwnerAccount(), { code: "refresh_required" });
    const overlapping = await handler.createRequestAuthCoordinator();
    await assert.rejects(overlapping.authenticatedOperation(async () => { throw Error("must not run"); }, undefined, true), { code: "refresh_required" });
    blockWrite.resolve(); assert.equal((await write).status, 200); blockWrite = undefined;
    assert.equal((await rsc.readOwnerAccount()).displayName, "تازه");
    assert.equal(posts, 1); assert.equal(saves, 2);
    attach(b); await assert.rejects(rsc.readOwnerAccount(), { code: "refresh_required" });

    // Logout from the other graph cancels an in-flight refresh before persistence.
    const c = session(); attach(c); await rsc.readOwnerAccount();
    blockRefresh = deferred(); refreshEntered = deferred();
    const refreshing = (await handler.createRequestAuthCoordinator()).refresh();
    const rejectedRefresh = assert.rejects(refreshing, { code: "refresh_cancelled" });
    await refreshEntered.promise;
    // Load the RSC graph's auth composition directly (already evaluated above).
    const rscAuth = await load("./auth-bff.server.ts", "rsc");
    const logout = (await rscAuth.createRequestAuthCoordinator()).logout();
    blockRefresh.resolve(); await rejectedRefresh; await logout; blockRefresh = undefined;
    assert.equal(saves, 2, "cancelled refresh never persists B");
    attach(c); await assert.rejects(rsc.readOwnerAccount(), { code: "unauthenticated" });
    assert.equal((await profileHandler.getProfileRouteHandlers().account(request())).status, 401);
    assert.equal(refreshes, 2);

    const expired = session(); expired.auth!.accessExpiresAt = Date.now() - 1; attach(expired);
    const before = { saves, destroys, reads, refreshes };
    await assert.rejects(rsc.readOwnerAccount(), { code: "refresh_required" });
    assert.deepEqual({ saves, destroys, reads, refreshes }, before, "RSC recovery never refreshes or writes cookies");
  } finally {
    blockWrite?.resolve(); blockRefresh?.resolve(); globalThis.fetch = fetch; delete fixture.authorityTestSession;
    for (const [key, value] of prior) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
