import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPaymentGateway } from './payment-gateway.ts';
import { createPaymentService } from './payment-service.ts';
import { createPaymentRouteHandlers } from './payment-route-adapters.ts';
import { parsePaymentJson } from './payment-request-policy.ts';
import { WordPressApiError } from '../wordpress/errors.ts';
import { AuthCoordinatorError } from '../auth/auth-coordinator.ts';
const id = '12345678-1234-4123-8123-123456789abc';
const receipt = () => ({ id, requestKey: id, purpose: 'wallet_topup', packId: 'irt-10000', catalogVersion: 'local-irt-v1', amountIRT: 10000, currency: 'IRT', state: 'pending', createdAt: '2026-10-23 12:00:00', updatedAt: '2026-10-23 12:00:00', expiresAt: '2026-10-23 12:15:00', simulated: true, ledgerId: null, creditedBalanceIRT: null });
const origin = 'http://localhost:3000';
const request = (path = '', body: unknown = {}, headers: Record<string, string> = {}) => new Request(`${origin}/api/payments/local/topups${path}`, { method: 'POST', headers: { Origin: origin, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
function fixture(failure?: unknown, postLease = false) {
    const calls: {
        path: string;
        method: string;
        body?: Record<string, unknown>;
    }[] = [];
    let compositions = 0;
    const gateway = createPaymentGateway({ json: async (path, options, onDispatch) => {
            onDispatch?.(); calls.push({ path, ...options }); if (failure)
            throw failure; return { ...receipt(), ...(path.endsWith('/confirm') ? { state: 'succeeded', ledgerId: 1, creditedBalanceIRT: 10000 } : path.endsWith('/cancel') ? { state: 'cancelled' } : {}) }; } });
    const auth = { authenticatedOperation: async <T>(operation: (t: string, a: {
            id: number;
            role: 'client';
            displayName: string;
        }, check: () => void) => Promise<T>, summary?: unknown, mutation?: boolean) => { assert.equal(summary, undefined); if (mutation !== undefined)
            assert.equal(mutation, true); const result = await operation('SYNTHETIC_TOKEN', { id: 1, role: 'client', displayName: 'name' }, () => { }); if (postLease)
            throw new AuthCoordinatorError('refresh_required'); return result; } };
    const service = createPaymentService({ auth, gateway });
    const routes = createPaymentRouteHandlers({ appOrigin: origin, available: true, getService: async () => { compositions++; return service; } });
    return { calls, routes, service, sessions: () => compositions };
}
test('fixed gateway actions and original key lookup never accept browser URLs or owner', async () => {
    const f = fixture();
    await f.service.create({ packId: 'irt-10000', requestKey: id });
    await f.service.get(id);
    await f.service.confirm(id, {});
    await f.service.cancel(id, {});
    await f.service.lookup(id);
    assert.deepEqual(f.calls.map(c => [c.path, c.method]), [['local-payments/topups', 'POST'], [`local-payments/topups/${id}`, 'GET'], [`local-payments/topups/${id}/confirm`, 'POST'], [`local-payments/topups/${id}/cancel`, 'POST'], [`local-payments/topups/lookup?requestKey=${id}`, 'GET']]);
    assert.deepEqual(f.calls[0].body, { packId: 'irt-10000', requestKey: id });
    assert.deepEqual(f.calls[2].body, {});
    assert.throws(() => f.service.create({ packId: 'irt-10000', requestKey: id, owner: 2 }));
    assert.equal(f.calls.length, 5);
});
test('dispatched uncertain writes produce explicit reconciliation and never replay', async () => {
    for (const failure of [Error('SQL SECRET'), new WordPressApiError({ status: 0, code: 'network_error', message: 'SECRET' }), new WordPressApiError({ status: 503, code: 'financial_commit_uncertain', message: 'SECRET' })]) {
        const f = fixture(failure);
        const r = await f.routes.create(request('', { packId: 'irt-10000', requestKey: id }));
        assert.equal(r.status, 503);
        assert.deepEqual(await r.json(), { error: { code: 'payment_outcome_unknown', reloadRequired: true, reconciliationRequired: true } });
        assert.equal(f.calls.length, 1);
    }
    const f = fixture(undefined, true);
    const r = await f.routes.confirm(request(`/${id}/confirm`), id);
    assert.equal((await r.json()).error.code, 'payment_outcome_unknown');
    assert.equal(f.calls.length, 1);
    const malformed = createPaymentService({ auth: { authenticatedOperation: async (op) => op('T', { id: 1, role: 'client', displayName: 'n' }, () => { }) }, gateway: createPaymentGateway({ json: async () => ({ state: 'succeeded', secret: 'SECRET' }) }) });
    await assert.rejects(malformed.confirm(id, {}), { code: 'payment_outcome_unknown' });
});
test('known rejection classifications are static, status-specific and do not claim uncertainty', async () => {
    for (const [code, status] of [['unauthenticated', 401], ['forbidden', 403], ['local_payment_not_found', 404], ['local_payment_state_conflict', 409], ['unknown_field', 422], ['rate_limited', 429], ['local_payment_unavailable', 503]] as const) {
        const f = fixture(new WordPressApiError({ status, code, message: 'SQL SECRET', data: { secret: 'SECRET' } }));
        const r = await f.routes.confirm(request(), id);
        assert.equal(r.status, status);
        assert.deepEqual(await r.json(), { error: { code, reloadRequired: false, reconciliationRequired: false } });
        assert.equal(f.calls.length, 1);
    }
});
test('preflight origin, content type, query, forbidden fields and bad UUID reject before session', async () => {
    const f = fixture();
    for (const req of [request('', {}, { Origin: 'http://evil.test' }), request('', {}, { 'content-type': 'text/plain' }), request('?rest_route=x'), request('', []), request('', { owner: 2 }), request('', {}, { 'sec-fetch-site': 'cross-site' })])
        assert.notEqual((await f.routes.create(req)).status, 200);
    assert.equal((await f.routes.confirm(request(), '../bad')).status, 400);
    assert.equal(f.sessions(), 0);
    assert.equal(f.calls.length, 0);
    for (const query of ['?requestKey=' + id + '&requestKey=' + id, '?rest_route=x', '?requestKey=' + id + '&owner=2'])
        assert.equal((await f.routes.lookup(new Request(origin + '/x' + query))).status, 400);
    assert.equal((await f.routes.get(new Request(origin + '/x?x=1'), id)).status, 400);
});
test('actual streaming bytes, body deadline and abort are bounded', async () => {
    const large = new Request(origin, { method: 'POST', headers: { Origin: origin, 'content-type': 'application/json', 'content-length': '1' }, body: new ReadableStream({ start(c) { c.enqueue(new Uint8Array(4097)); c.close(); } }), duplex: 'half' } as RequestInit);
    await assert.rejects(parsePaymentJson(large, origin, 'empty'), { code: 'request_too_large' });
    const pending = new Request(origin, { method: 'POST', headers: { Origin: origin, 'content-type': 'application/json' }, body: new ReadableStream({}), duplex: 'half' } as RequestInit);
    await assert.rejects(parsePaymentJson(pending, origin, 'empty', 5), { code: 'body_timeout' });
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(parsePaymentJson(new Request(request(), { signal: controller.signal }), origin, 'empty'), { code: 'request_aborted' });
});
test('off gate rejects all reads and writes with no session/upstream, all responses private', async () => {
    let calls = 0;
    const r = createPaymentRouteHandlers({ appOrigin: origin, available: false, getService: async () => { calls++; throw Error(); } });
    for (const response of [await r.create(request()), await r.get(new Request(origin), id), await r.lookup(new Request(origin + '?requestKey=' + id)), await r.summary(new Request(origin)), await r.confirm(request(), id), await r.cancel(request(), id)]) {
        assert.equal(response.status, 503);
        assert.equal(response.headers.get('cache-control'), 'private, no-store');
        assert.equal(response.headers.get('vary'), 'Cookie');
    }
    assert.equal(calls, 0);
});
test('response correlation and transition state cannot bless unrelated receipts', async () => {
    const other = '22345678-1234-4123-8123-123456789abc';
    const gateway = createPaymentGateway({ json: async () => ({ ...receipt(), id: other, requestKey: other }) });
    await assert.rejects(gateway.create('T', { packId: 'irt-10000', requestKey: id }), { code: 'payment_outcome_unknown' });
    await assert.rejects(gateway.get('T', id), { code: 'invalid_upstream_response' });
    await assert.rejects(gateway.lookup('T', id), { code: 'invalid_upstream_response' });
    const pending = createPaymentGateway({ json: async () => receipt() });
    await assert.rejects(pending.confirm('T', id, {}), { code: 'payment_outcome_unknown' });
    await assert.rejects(pending.cancel('T', id, {}), { code: 'payment_outcome_unknown' });
});
test('invalid read route UUID is rejected before session access', async () => {
    const f = fixture();
    assert.equal((await f.routes.get(new Request(origin), 'bad')).status, 400);
    assert.equal(f.sessions(), 0);
});
test('native WordPress permission failures preserve auth rejection without replay', async () => {
    for (const [status, code] of [[401, 'unauthenticated'], [403, 'forbidden']] as const) {
        const f = fixture(new WordPressApiError({ status, code: 'http_error', message: 'PRIVATE_VENDOR' }));
        const response = await f.routes.create(request('', { packId: 'irt-10000', requestKey: id }));
        assert.equal(response.status, status);
        assert.deepEqual(await response.json(), { error: { code, reloadRequired: false, reconciliationRequired: false } });
        assert.equal(f.calls.length, 1);
    }
});
