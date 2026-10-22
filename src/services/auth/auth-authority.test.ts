import assert from "node:assert/strict";
import * as nodeModule from "node:module";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

type Result = { url: string; shortCircuit?: boolean };
type Context = { parentURL?: string };
type Hooks = { resolve?(s: string, c: Context, next: (s: string, c: Context) => Result): Result; load?(url: string, c: object, next: (url: string, c: object) => { source: string; format: string; shortCircuit?: boolean }): { source: string; format: string; shortCircuit?: boolean } };
const { registerHooks } = nodeModule as unknown as { registerHooks(h: Hooks): { deregister(): void } };
const hooks = registerHooks({
  resolve(specifier, context, next) {
    return specifier === "server-only" ? { url: "data:text/javascript,export{}", shortCircuit: true } : next(specifier, context);
  },
  load(url, context, next) {
    const result = next(url, context);
    return url.endsWith("auth-authority.server.ts?incompatible") ? { ...result, source: result.source.replace("refresh-fences-v1.2026-10-22", "incompatible-code-version") } : result;
  },
});
const url = new URL("./auth-authority.server.ts", import.meta.url).href;
const { processAuthAuthority: original } = await import(url);

test("compatible source reload keeps authority identity, live reservations and cancellation", async () => {
  try {
    const { processAuthAuthority: reload } = await import(`${url}?compatible`);
    assert.equal(original.instance, reload.instance);
    const auth = { accessToken: "synthetic", refreshToken: "synthetic", generation: crypto.randomUUID(), accessExpiresAt: Date.now() + 1000, refreshExpiresAt: Date.now() + 60000, account: { id: 1, displayName: "نام", role: "client" as const } };
    const key = crypto.randomUUID();
    const held = original.coordinator.claim(key, auth, true);
    assert.throws(() => reload.coordinator.claim(key, auth, true), { code: "refresh_required" });
    await assert.rejects(import(`${url}?incompatible`), /Incompatible auth authority/);
    assert.throws(() => reload.coordinator.claim(key, auth, true), { code: "refresh_required" }, "incompatible reload must not clear live fences");
    held.release();
    await reload.coordinator.cancelAndWait(key, auth.refreshExpiresAt);
    assert.equal(original.coordinator.isCancelled(key), true);
    assert.throws(() => original.coordinator.claim(key, auth, false), { code: "refresh_cancelled" });
  } finally { hooks.deregister(); }
});

test("malformed existing global registry fails closed without replacement or getter execution", () => {
  // Isolated Node process: never reset the live registry to test admission.
  const source = `
    import assert from 'node:assert/strict';
    import {registerHooks} from 'node:module';
    registerHooks({resolve(s,c,next){return s==='server-only'?{url:'data:text/javascript,export{}',shortCircuit:true}:next(s,c)}});
    const key=Symbol.for('karban.web.auth-authority');
    let reads=0;
    for (const [i,descriptor] of [
      {value:null,writable:false},
      {value:{version:'private-invalid-state'},writable:false},
      {get(){reads++;throw Error('must not read') }},
      {value:Object.freeze({version:'refresh-fences-v1.2026-10-22',instance:'00000000-0000-4000-8000-000000000000',coordinator:Object.freeze({}),error:Error}),writable:false}
    ].entries()) {
      Object.defineProperty(globalThis,key,{...descriptor,configurable:true});
      const before=Object.getOwnPropertyDescriptor(globalThis,key);
      await assert.rejects(import(${JSON.stringify(url)}+'?malformed='+i),/Incompatible auth authority/);
      assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis,key),before);
      delete globalThis[key];
    }
    assert.equal(reads,0);
    Object.defineProperty(globalThis,key,{value:Object.freeze({version:'refresh-fences-v1.2026-10-22',instance:'00000000-0000-4000-8000-000000000000',coordinator:Object.freeze({}),error:Error}),configurable:false,writable:false});
    const locked=Object.getOwnPropertyDescriptor(globalThis,key);
    await assert.rejects(import(${JSON.stringify(url)}+'?locked-malformed'),/Incompatible auth authority/);
    assert.deepEqual(Object.getOwnPropertyDescriptor(globalThis,key),locked);
  `;
  const result = spawnSync(process.execPath, [...process.execArgv.filter(arg => arg !== "--test"), "--input-type=module", "--eval", source], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
