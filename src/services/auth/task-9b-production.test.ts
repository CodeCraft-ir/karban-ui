import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import { test } from "node:test";
import type { AuthSessionData } from "./auth-coordinator.ts";
import { createAuthRouteHandlers } from "./auth-route-adapters.ts";

// Only the Next request cookie boundary is substituted. Production composition,
// runtime policy, gateway, REST client, coordinator and route adapters are real.
const fixtureGlobal = globalThis as typeof globalThis & { task9bSession?: Partial<AuthSessionData> & { save(): Promise<void>; destroy(): void } };
// Node 22 runtime API; the installed project intentionally retains @types/node 20.
type ResolveResult = { url: string; shortCircuit?: boolean };
type ResolveContext = { parentURL?: string };
type Resolve = (specifier: string, context: ResolveContext, next: (specifier: string, context: ResolveContext) => ResolveResult) => ResolveResult;
const { registerHooks } = nodeModule as unknown as { registerHooks(hooks: { resolve: Resolve }): { deregister(): void } };
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier === "./session.server.ts" && context.parentURL?.endsWith("/auth-bff.server.ts")) return { url: "data:text/javascript,export async function getAuthSession(){return globalThis.task9bSession}", shortCircuit: true };
    return next(specifier, context);
  },
});
const { getAuthBffRouteDependencies } = await import("./auth-bff.server.ts");
hooks.deregister();

const simulated = { mode: "local_simulated", codeLength: 6, otpSchemaReady: true, credentialSchemaReady: true, providerConfigured: false, localRealSmsAllowed: false };
const sms = { ...simulated, mode: "sms", codeLength: 5, providerConfigured: true, localRealSmsAllowed: true };

test("actual Next production composition enforces independent flags and trusted mode before dispatch", async () => {
  const keys = ["APP_ORIGIN", "IRON_SESSION_PASSWORD", "WORDPRESS_URL", "WORDPRESS_PERMALINK_MODE", "NODE_ENV", "KARBAN_LOCAL_DEVELOPMENT", "KARBAN_ALLOW_LOCAL_SMS"];
  const prior = keys.map(key => [key, process.env[key]] as const);
  const originalFetch = globalThis.fetch;
  try {
    for (const c of [
      { local: "true", sms: undefined, status: simulated, ok: true },
      { local: "true", sms: undefined, status: sms, ok: false },
      { local: "true", sms: "true", status: sms, ok: true },
      { local: undefined, sms: "true", status: sms, ok: false },
      { local: "true", sms: "TRUE", status: sms, ok: false },
      { local: "true", sms: "true", status: simulated, ok: false },
      { local: "true", sms: "true", status: { ...sms, providerConfigured: false }, ok: false },
      { local: "true", sms: "true", status: undefined, ok: false },
    ]) {
      process.env.APP_ORIGIN = "http://localhost:3000";
      process.env.IRON_SESSION_PASSWORD = "synthetic-fixture-password-not-a-secret-12345";
      process.env.WORDPRESS_URL = "http://localhost/karban";
      process.env.WORDPRESS_PERMALINK_MODE = "pretty";
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      if (c.local === undefined) delete process.env.KARBAN_LOCAL_DEVELOPMENT; else process.env.KARBAN_LOCAL_DEVELOPMENT = c.local;
      if (c.sms === undefined) delete process.env.KARBAN_ALLOW_LOCAL_SMS; else process.env.KARBAN_ALLOW_LOCAL_SMS = c.sms;
      const calls: { url: string; method?: string }[] = [];
      let saves = 0;
      fixtureGlobal.task9bSession = { save: async () => { saves++; }, destroy: () => {} };
      globalThis.fetch = async (input, init) => {
        const url = String(input); calls.push({ url, method: init?.method });
        if (url.endsWith("/auth/otp/readiness")) return Response.json(c.status ? { success: true, data: c.status } : { success: false, error: { code: "not_found", message: "private" } }, { status: c.status ? 200 : 404 });
        assert.ok(url.endsWith("/auth/otp/request"));
        assert.equal(init?.body, JSON.stringify({ phone: "09121234567" }));
        return Response.json({ success: true, data: { tracking_code: "private-tracking", expires_in: 120, delivery_mode: c.status?.mode, code_length: c.status?.codeLength } });
      };
      const routes = createAuthRouteHandlers(getAuthBffRouteDependencies());
      const response = await routes.request(new Request("http://localhost:3000/api/auth/request", { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json", Host: "production.example.test" }, body: JSON.stringify({ phone: "09121234567", role: "client" }) }));
      assert.equal(response.status, c.ok ? 200 : 503, JSON.stringify(c));
      assert.equal(calls.filter(call => call.url.endsWith("/auth/otp/request")).length, c.ok ? 1 : 0);
      assert.equal(saves, c.ok ? 1 : 0);
      assert.ok(calls.filter(call => call.url.endsWith("/auth/otp/readiness")).every(call => call.method === "GET"));
    }
  } finally {
    globalThis.fetch = originalFetch;
    delete fixtureGlobal.task9bSession;
    for (const [key, value] of prior) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});
