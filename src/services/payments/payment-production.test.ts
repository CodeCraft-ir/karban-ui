import assert from 'node:assert/strict';
import * as nodeModule from 'node:module';
import { test } from 'node:test';
import type { AuthSessionData } from '../auth/auth-coordinator.ts';
const fixture = globalThis as typeof globalThis & {
    paymentTestSession?: AuthSessionData & {
        save(): Promise<void>;
        destroy(): void;
    };
};
type Result = {
    url: string;
    shortCircuit?: boolean;
};
type Context = {
    parentURL?: string;
};
const { registerHooks } = nodeModule as unknown as {
    registerHooks(h: {
        resolve(s: string, c: Context, n: (s: string, c: Context) => Result): Result;
    }): {
        deregister(): void;
    };
};
const hooks = registerHooks({ resolve(s, c, n) {
        if (s === 'server-only')
            return { url: 'data:text/javascript,export{}', shortCircuit: true };
        if (s === './session.server.ts' && c.parentURL?.includes('/auth-bff.server.ts'))
            return { url: 'data:text/javascript,export async function getAuthSession(){return globalThis.paymentTestSession}', shortCircuit: true };
        const result = n(s, c);
        const surface = c.parentURL && new URL(c.parentURL).searchParams.get('surface');
        if (surface && result.url.includes('/src/services/') && !result.url.includes('?'))
            return { ...result, url: result.url + '?surface=' + surface };
        return result;
    } });
const load = (file: string, surface = 'payment-handler') => import(new URL(file + '?surface=' + surface, import.meta.url).href);
await load('./payment-bff.server.ts');
const rsc = await load('./payment-bff.server.ts', 'payment-rsc');
const auth = await load('../auth/auth-bff.server.ts', 'payment-rsc');
const modules = await Promise.all(['../../app/api/payments/local/topups/route.ts', '../../app/api/payments/local/topups/[id]/route.ts', '../../app/api/payments/local/topups/[id]/confirm/route.ts', '../../app/api/payments/local/topups/[id]/cancel/route.ts', '../../app/api/payments/local/topups/lookup/route.ts', '../../app/api/wallet/summary/route.ts'].map(p => load(p)));
hooks.deregister();
const id = '12345678-1234-4123-8123-123456789abc';
const origin = 'http://localhost:3000';
const raw = () => ({ id, requestKey: id, purpose: 'wallet_topup', packId: 'irt-10000', catalogVersion: 'local-irt-v1', amountIRT: 10000, currency: 'IRT', state: 'pending', createdAt: '2026-10-23 12:00:00', updatedAt: '2026-10-23 12:00:00', expiresAt: '2026-10-23 12:15:00', simulated: true, ledgerId: null, creditedBalanceIRT: null, meta: 'PRIVATE_CANARY' });
const req = (path: string, body?: unknown) => new Request(origin + path, { ...(body === undefined ? {} : { method: 'POST', headers: { Origin: origin, 'content-type': 'application/json' }, body: JSON.stringify(body) }) });
function deferred() { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r; }); return { promise, resolve }; }
test('real route composition uses fixed plain/pretty transport and shared authority; post-write cancellation reconciles by original key on fresh request', async () => {
    // The test process supplies synthetic settings only; no files or real configuration are loaded.
    Object.assign(process.env, { APP_ORIGIN: origin, IRON_SESSION_PASSWORD: 'synthetic-payment-fixture-password-12345678', WORDPRESS_URL: 'http://localhost/karban', WORDPRESS_PERMALINK_MODE: 'pretty', NODE_ENV: 'test', KARBAN_LOCAL_DEVELOPMENT: 'true', KARBAN_ALLOW_LOCAL_PAYMENTS: 'true' });
    let saves = 0, destroys = 0, posts = 0, reads = 0, refreshes = 0;
    let block: ReturnType<typeof deferred> | undefined, entered: ReturnType<typeof deferred> | undefined;
    let mode: 'normal' | 'malformed' | 'timeout' | 'cancel-after-commit' | 'unauthorized' = 'normal';
    let state = 'pending';
    const calls: {
        url: string;
        method: string;
    }[] = [];
    const now = Date.now();
    const sealed: AuthSessionData = { sessionId: crypto.randomUUID(), version: 1, auth: { accessToken: 'SYNTHETIC_ACCESS', refreshToken: 'SYNTHETIC_REFRESH', accessExpiresAt: now + 60000, refreshExpiresAt: now + 600000, generation: crypto.randomUUID(), account: { id: 47, role: 'client', displayName: 'Name' } } };
    const attach = (value = sealed) => { fixture.paymentTestSession = Object.defineProperties(structuredClone(value), { save: { value: async () => { saves++; } }, destroy: { value: () => { destroys++; } } }) as NonNullable<typeof fixture.paymentTestSession>; };
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
        const url = new URL(String(input));
        const route = url.searchParams.get('rest_route') ?? url.pathname.replace('/karban/wp-json', '');
        const method = init?.method ?? 'GET';
        calls.push({ url: String(input), method });
        assert.equal(url.origin, 'http://localhost');
        assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer SYNTHETIC_ACCESS');
        assert.equal(init?.cache, 'no-store');
        assert.equal(init?.redirect, 'error', 'configured loopback must never redirect credentials or contact a provider');
        if (route.endsWith('/auth/refresh')) {
            refreshes++;
            throw Error('no refresh allowed');
        }
        if (route.endsWith('/auth/logout/refresh'))
            return Response.json({ success: true, data: { logged_out: true } });
        if (mode === 'unauthorized')
            return Response.json({ code: 'unauthenticated', message: 'PRIVATE_CANARY', data: { status: 401 } }, { status: 401 });
        if (method === 'POST') {
            posts++;
            if (route.endsWith('/confirm'))
                state = 'succeeded';
            if (route.endsWith('/cancel'))
                state = 'cancelled';
            if (mode === 'malformed')
                return Response.json({ success: true, data: { state: 'succeeded', meta: 'PRIVATE_CANARY' } });
            if (mode === 'timeout')
                throw new DOMException('synthetic abort', 'AbortError');
            if (mode === 'cancel-after-commit') {
                entered?.resolve();
                await block?.promise;
            }
        }
        else
            reads++;
        if (route.endsWith('/wallet/summary'))
            return Response.json({ success: true, data: { balanceIRT: 10000, currency: 'IRT', localPaymentReady: false, packs: [10000, 50000, 100000].map(n => ({ packId: `irt-${n}`, amountIRT: n, catalogVersion: 'local-irt-v1', currency: 'IRT' })), items: [] } });
        assert.ok(route.startsWith('/nahan/v1/local-payments/topups'));
        return Response.json({ success: true, data: { ...raw(), state, ...(state === 'succeeded' ? { ledgerId: 1, creditedBalanceIRT: 10000 } : {}) } });
    };
    try {
        attach();
        const [create, get, confirm, cancel, lookup, summary] = modules;
        const ctx = { params: Promise.resolve({ id }) };
        assert.equal(typeof create.POST, 'function');
        assert.equal(create.GET, undefined);
        assert.equal(get.POST, undefined);
        assert.equal(confirm.GET, undefined);
        assert.equal(cancel.GET, undefined);
        assert.equal(lookup.POST, undefined);
        assert.equal(summary.POST, undefined);
        let response = await create.POST(req('/api/payments/local/topups', { packId: 'irt-10000', requestKey: id }));
        assert.equal(response.status, 200);
        assert.ok(!JSON.stringify(await response.json()).includes('PRIVATE_CANARY'));
        assert.equal((await get.GET(req('/x'), ctx)).status, 200);
        assert.equal((await confirm.POST(req('/x', {}), ctx)).status, 200);
        assert.equal(posts, 2);
        state = 'pending';
        assert.equal((await cancel.POST(req('/x', {}), ctx)).status, 200);
        state = 'pending';
        assert.equal((await lookup.GET(req('/x?requestKey=' + id))).status, 200);
        assert.equal((await summary.GET(req('/x'))).status, 200);
        assert.equal((await rsc.readWalletSummary()).localPaymentReady, false);
        assert.equal((await rsc.readLocalTopup(id)).id, id);
        assert.equal((await rsc.lookupLocalTopup(id)).requestKey, id);
        assert.equal(saves, 0);
        assert.equal(destroys, 0);
        process.env.WORDPRESS_PERMALINK_MODE = 'invalid';
        const preflightCalls = calls.length;
        response = await create.POST(req('/x', {packId:'irt-10000', requestKey:id}));
        assert.deepEqual(await response.json(), {error:{code:'payment_unavailable',reloadRequired:false,reconciliationRequired:false}});
        assert.equal(calls.length, preflightCalls, 'transport preflight failure is not a dispatched write');
        process.env.WORDPRESS_PERMALINK_MODE = 'plain';
        assert.equal((await lookup.GET(req('/x?requestKey=' + id))).status, 200);
        const plain = new URL(calls.at(-1)!.url);
        assert.equal(plain.pathname, '/karban/index.php');
        assert.equal(plain.searchParams.get('rest_route'), '/nahan/v1/local-payments/topups/lookup');
        assert.equal(plain.searchParams.get('requestKey'), id);
        for (const value of [undefined, 'false', 'TRUE']) {
            if (value === undefined)
                delete process.env.KARBAN_ALLOW_LOCAL_PAYMENTS;
            else
                process.env.KARBAN_ALLOW_LOCAL_PAYMENTS = value;
            const before = calls.length;
            assert.equal((await create.POST(req('/x', { packId: 'irt-10000', requestKey: id }))).status, 503);
            await assert.rejects(rsc.readWalletSummary(), { code: 'payment_unavailable' });
            assert.equal(calls.length, before);
        }
        process.env.KARBAN_ALLOW_LOCAL_PAYMENTS = 'true';
        for (const [key, value] of [['WORDPRESS_URL', 'http://example.test'], ['APP_ORIGIN', 'http://evil.test'], ['KARBAN_LOCAL_DEVELOPMENT', 'false'], ['NODE_ENV', 'production']] as const) {
            (process.env as Record<string,string|undefined>)[key] = value;
            const before = calls.length;
            assert.equal((await create.POST(req('/x', { packId: 'irt-10000', requestKey: id }))).status, 503);
            assert.equal((await summary.GET(req('/x'))).status, 503);
            assert.equal(calls.length, before);
            Object.assign(process.env, { APP_ORIGIN: origin, WORDPRESS_URL: 'http://localhost/karban', KARBAN_LOCAL_DEVELOPMENT: 'true', NODE_ENV: 'test' });
        }
        mode = 'unauthorized';
        response = await create.POST(req('/x', { packId: 'irt-10000', requestKey: id }));
        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), { error: { code: 'unauthenticated', reloadRequired: false, reconciliationRequired: false } });
        mode = 'normal';
        for (const m of ['malformed', 'timeout'] as const) {
            mode = m;
            const before: number = posts;
            response = await create.POST(req('/x', { packId: 'irt-10000', requestKey: id }));
            assert.equal((await response.json()).error.code, 'payment_outcome_unknown');
            assert.equal(posts, before + 1);
            mode = 'normal';
            assert.equal((await lookup.GET(req('/x?requestKey=' + id))).status, 200);
            assert.equal(posts, before + 1);
        }
        // Genuine global authority lease invalidation after a committed write, not a mocked payment helper.
        attach();
        mode = 'cancel-after-commit';
        block = deferred();
        entered = deferred();
        const before: number = posts;
        const pending = confirm.POST(req('/x', {}), ctx);
        await entered.promise;
        const logout = (await auth.createRequestAuthCoordinator()).logout();
        block.resolve();
        response = await pending;
        await logout;
        assert.deepEqual(await response.json(), { error: { code: 'payment_outcome_unknown', reloadRequired: true, reconciliationRequired: true } });
        assert.equal(posts, before + 1);
        mode = 'normal';
        const fresh = structuredClone(sealed);
        fresh.sessionId = crypto.randomUUID();
        fresh.auth!.generation = crypto.randomUUID();
        attach(fresh);
        response = await lookup.GET(req('/x?requestKey=' + id));
        assert.equal((await response.json()).intent.state, 'succeeded');
        assert.equal(posts, before + 1);
        assert.equal(refreshes, 0);
        fresh.auth!.accessExpiresAt = Date.now() - 1;
        attach(fresh);
        const beforeReads = reads;
        response = await get.GET(req('/x'), ctx);
        assert.equal(response.status, 401);
        assert.equal((await response.json()).error.code, 'refresh_required');
        assert.equal(reads, beforeReads);
    }
    finally {
        block?.resolve();
        globalThis.fetch = originalFetch;
        delete fixture.paymentTestSession;
    }
});

test('single trailing WordPress slash works through real routes and read-only RSC in pretty and plain subpath transports', async () => {
    Object.assign(process.env, { APP_ORIGIN:origin, IRON_SESSION_PASSWORD:'synthetic-payment-fixture-password-12345678', WORDPRESS_URL:'http://localhost/karban/', NODE_ENV:'test', KARBAN_LOCAL_DEVELOPMENT:'true', KARBAN_ALLOW_LOCAL_PAYMENTS:'true' });
    let saves=0, destroys=0;
    const now=Date.now();
    fixture.paymentTestSession = Object.defineProperties({sessionId:crypto.randomUUID(),version:1 as const,auth:{accessToken:'SYNTHETIC_SLASH_ACCESS',refreshToken:'SYNTHETIC_SLASH_REFRESH',accessExpiresAt:now+60000,refreshExpiresAt:now+600000,generation:crypto.randomUUID(),account:{id:47,role:'client' as const,displayName:'Name'}}},{save:{value:async()=>{saves++;}},destroy:{value:()=>{destroys++;}}}) as NonNullable<typeof fixture.paymentTestSession>;
    const calls:{url:string;method:string}[]=[];
    const originalFetch=globalThis.fetch;
    globalThis.fetch=async(input,init)=>{
        const url=new URL(String(input));
        calls.push({url:String(input),method:init?.method??'GET'});
        assert.equal(url.origin,'http://localhost');
        assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer SYNTHETIC_SLASH_ACCESS');
        assert.equal(init?.redirect,'error');
        assert.equal(init?.cache,'no-store');
        const path=url.searchParams.get('rest_route')??url.pathname.replace('/karban/wp-json','');
        const data=path==='/nahan/v1/wallet/summary'?{balanceIRT:0,currency:'IRT',localPaymentReady:false,packs:[10000,50000,100000].map(n=>({packId:`irt-${n}`,amountIRT:n,catalogVersion:'local-irt-v1',currency:'IRT'})),items:[]}:raw();
        return Response.json({success:true,data});
    };
    try {
        const [create,get,,,lookup,summary]=modules;
        for(const mode of ['pretty','plain']) {
            process.env.WORDPRESS_PERMALINK_MODE=mode;
            const before=calls.length;
            assert.equal((await create.POST(req('/api/payments/local/topups',{packId:'irt-10000',requestKey:id}))).status,200);
            assert.equal((await get.GET(req('/api/payments/local/topups/'+id),{params:Promise.resolve({id})})).status,200);
            assert.equal((await lookup.GET(req('/api/payments/local/topups/lookup?requestKey='+id))).status,200);
            assert.equal((await summary.GET(req('/api/wallet/summary'))).status,200);
            assert.equal((await rsc.readWalletSummary()).balanceIRT,0);
            assert.equal((await rsc.readLocalTopup(id)).id,id);
            assert.equal((await rsc.lookupLocalTopup(id)).requestKey,id);
            const expected=['local-payments/topups',`local-payments/topups/${id}`,'local-payments/topups/lookup','wallet/summary','wallet/summary',`local-payments/topups/${id}`,'local-payments/topups/lookup'];
            assert.equal(calls.length-before,expected.length);
            for(const [i,entry] of calls.slice(before).entries()) {
                const url=new URL(entry.url);
                assert.equal(entry.method,i===0?'POST':'GET');
                if(mode==='pretty') {
                    assert.equal(url.pathname,'/karban/wp-json/nahan/v1/'+expected[i]);
                    assert.equal(url.searchParams.has('rest_route'),false);
                } else {
                    assert.equal(url.pathname,'/karban/index.php');
                    assert.equal(url.searchParams.get('rest_route'),'/nahan/v1/'+expected[i]);
                }
                assert.equal(url.searchParams.get('requestKey'),expected[i].endsWith('/lookup')?id:null);
            }
        }
        assert.equal(saves,0);assert.equal(destroys,0);
    } finally {
        globalThis.fetch=originalFetch;delete fixture.paymentTestSession;
    }
});
