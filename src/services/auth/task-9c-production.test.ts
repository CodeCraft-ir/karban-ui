import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import { test } from "node:test";
import { mapAuthError } from "../../lib/auth-ui.ts";
import type { AuthSessionData } from "./auth-coordinator.ts";
import { createAuthRouteHandlers } from "./auth-route-adapters.ts";

// Only the Next request cookie boundary is substituted. Production composition,
// runtime policy, gateway, REST client, coordinator and route adapters are real.
const fixtureGlobal = globalThis as typeof globalThis & { task9cSession?: Partial<AuthSessionData> & { save(): Promise<void>; destroy(): void } };
// Node 22 runtime API; the installed project intentionally retains @types/node 20.
type ResolveResult = { url: string; shortCircuit?: boolean };
type ResolveContext = { parentURL?: string };
type Resolve = (specifier: string, context: ResolveContext, next: (specifier: string, context: ResolveContext) => ResolveResult) => ResolveResult;
const { registerHooks } = nodeModule as unknown as { registerHooks(hooks: { resolve: Resolve }): { deregister(): void } };
const hooks = registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier === "./session.server.ts" && context.parentURL?.endsWith("/auth-bff.server.ts")) return { url: "data:text/javascript,export async function getAuthSession(){return globalThis.task9cSession}", shortCircuit: true };
    return next(specifier, context);
  },
});
const { getAuthBffRouteDependencies } = await import("./auth-bff.server.ts");
hooks.deregister();

const sms = { mode: "sms", codeLength: 5, otpSchemaReady: true, credentialSchemaReady: true, providerConfigured: true, localRealSmsAllowed: true };
const canary = "private-provider fixture-key 09121234567 54321 exception-canary";

test("actual Next composition retains only controlled SMS categories and rate limit, never seals a failed challenge", async () => {
  const keys = ["APP_ORIGIN", "IRON_SESSION_PASSWORD", "WORDPRESS_URL", "WORDPRESS_PERMALINK_MODE", "NODE_ENV", "KARBAN_LOCAL_DEVELOPMENT", "KARBAN_ALLOW_LOCAL_SMS"];
  const prior = keys.map(key => [key, process.env[key]] as const);
  const originalFetch = globalThis.fetch;
  try {
    process.env.APP_ORIGIN = "http://localhost:3000";
    process.env.IRON_SESSION_PASSWORD = "synthetic-fixture-password-not-a-secret-12345";
    process.env.WORDPRESS_URL = "http://localhost/karban";
    process.env.WORDPRESS_PERMALINK_MODE = "pretty";
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.KARBAN_LOCAL_DEVELOPMENT = "true";
    process.env.KARBAN_ALLOW_LOCAL_SMS = "true";
    for (const [upstream, expected, status] of [
      ["sms_misconfigured", "sms_misconfigured", 503],
      ["sms_transport_error", "sms_transport_error", 503],
      ["sms_provider_error", "sms_provider_error", 503],
      ["otp_throttled", "rate_limited", 429],
      ["unknown_provider_code", "auth_unavailable", 503],
      ["sms_transport_error_unknown", "auth_unavailable", 503],
    ] as const) {
      let saves = 0; let sends = 0;
      fixtureGlobal.task9cSession = { save: async () => { saves++; }, destroy: () => {} };
      globalThis.fetch = async input => {
        if (String(input).endsWith("/auth/otp/readiness")) return Response.json({ success: true, data: sms });
        assert.ok(String(input).endsWith("/auth/otp/request")); sends++;
        return Response.json({ success: false, error: { code: upstream, message: canary, data: { secret: canary }, status: 401 }, extra: canary }, { status: 400 });
      };
      const routes = createAuthRouteHandlers(getAuthBffRouteDependencies());
      const response = await routes.request(new Request("http://localhost:3000/api/auth/request", { method: "POST", headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" }, body: JSON.stringify({ phone: "09121234567", role: "client" }) }));
      assert.equal(response.status, status, upstream);
      const body = await response.json();
      assert.deepEqual(body, { error: { code: expected } });
      assert.equal(saves, 0); assert.equal(sends, 1);
      assert.equal(response.headers.get("Cache-Control"), "private, no-store");
      const message = mapAuthError(response.status, body.error.code);
      assert.ok(!message.includes("private") && !message.includes("0912"));
      if (expected.startsWith("sms_")) assert.notEqual(message, mapAuthError(503, "auth_unavailable"));
    }
  } finally {
    globalThis.fetch = originalFetch; delete fixtureGlobal.task9cSession;
    for (const [key, value] of prior) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test("LoginForm public error presentation ignores arbitrary upstream objects and raw text", () => {
  for (const raw of [canary, { code: "sms_provider_error", message: canary }, null, [], "sms_provider_error "]) assert.equal(mapAuthError(503, raw), mapAuthError(503, "auth_unavailable"));
  assert.match(mapAuthError(429, "sms_provider_error"), /تعداد تلاش/);
  assert.match(mapAuthError(503, "sms_transport_error"), /تأیید نشد/);
  assert.match(mapAuthError(503, "sms_provider_error"), /سرویس پیامک/);
  assert.match(mapAuthError(503, "sms_misconfigured"), /تنظیمات/);
});

test("actual mounted LoginForm renders only safe Farsi for failed SMS requests without navigation or retry", async () => {
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const { JSDOM } = require("jsdom") as { JSDOM: new(html: string, options: object) => { window: Window & typeof globalThis & { close(): void } } };
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
  const win = dom.window;
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const install = (key: string, value: unknown) => {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  };
  Object.defineProperty(win, "matchMedia", { value: (query: string) => ({ matches: query === "(prefers-reduced-motion: reduce)", media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }) });
  for (const [key, value] of Object.entries({ window: win, self: win, document: win.document, navigator: win.navigator, HTMLElement: win.HTMLElement, Element: win.Element, Node: win.Node, getComputedStyle: win.getComputedStyle.bind(win), requestAnimationFrame: win.requestAnimationFrame.bind(win), cancelAnimationFrame: win.cancelAnimationFrame.bind(win), IS_REACT_ACT_ENVIRONMENT: true })) install(key, value);
  let calls = 0;
  let code = "sms_transport_error";
  install("fetch", async (path: string) => {
    assert.equal(path, "/api/auth/request"); calls++;
    return Response.json({ error: { code, message: canary, data: canary } }, { status: code === "rate_limited" ? 429 : 503 });
  });
  const { act, createElement: h } = await import("react");
  const { createRoot } = await import("react-dom/client");
  const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime.js");
  const { AuthFlowProvider } = await import("../../components/sections/auth/AuthFlowContext.tsx");
  const { LoginForm } = await import("../../components/sections/auth/LoginForm.tsx");
  const host = win.document.createElement("main"); win.document.body.append(host);
  const root = createRoot(host);
  const navigation: string[] = [];
  const router = { bfcacheId: "offline-fixture", back() {}, forward() {}, refresh() {}, hmrRefresh() {}, push(path: string) { navigation.push(path); }, replace(path: string) { navigation.push(path); }, prefetch: async () => {} };
  try {
    for (const category of ["sms_transport_error", "sms_provider_error", "sms_misconfigured", "rate_limited", "unknown-provider"]) {
      code = category;
      await act(async () => root.render(h(AppRouterContext.Provider, { value: router }, h(AuthFlowProvider, { key: category, children: h(LoginForm) }))));
      const input = host.querySelector("input"); assert.ok(input);
      await act(async () => {
        Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype, "value")!.set!.call(input, "09121234567");
        input.dispatchEvent(new win.Event("input", { bubbles: true }));
      });
      const form = host.querySelector("form"); assert.ok(form);
      const before = calls;
      await act(async () => { form.dispatchEvent(new win.Event("submit", { bubbles: true, cancelable: true })); });
      assert.equal(calls, before + 1, "exactly one fake HTTP request per explicit submission");
      const alert = host.querySelector('[role="alert"]'); assert.ok(alert);
      assert.equal(alert.textContent, mapAuthError(category === "rate_limited" ? 429 : 503, category));
      assert.ok(!host.innerHTML.includes("private-provider") && !host.innerHTML.includes("fixture-key") && !host.innerHTML.includes("54321"));
      assert.deepEqual(navigation, [], "failure never navigates to verification");
      assert.ok(!host.textContent?.includes("رقمی آماده شد"), "no phantom challenge notice");
    }
  } finally {
    await act(async () => root.unmount()); dom.window.close();
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  }
});
