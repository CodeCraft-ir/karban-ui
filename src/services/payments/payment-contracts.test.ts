import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseIntent, parseSummary, parseCreate, parseUuid } from './payment-contracts.ts';
import { paymentConfig } from './payment-runtime-config.ts';
export const id = '12345678-1234-4123-8123-123456789abc';
export const receipt = () => ({ id, requestKey: id, purpose: 'wallet_topup', packId: 'irt-10000', catalogVersion: 'local-irt-v1', amountIRT: 10000, currency: 'IRT', state: 'pending', createdAt: '2026-10-23 12:00:00', updatedAt: '2026-10-23 12:00:00', expiresAt: '2026-10-23 12:15:00', simulated: true, ledgerId: null, creditedBalanceIRT: null });
export const packs = [10000, 50000, 100000].map(amountIRT => ({ packId: `irt-${amountIRT}`, catalogVersion: 'local-irt-v1', amountIRT, currency: 'IRT' }));
test('intent validates actual PHP numeric DTO and projects only public ISO UTC fields', () => {
    const value = parseIntent({ ...receipt(), meta: 'SECRET', origin_hash: 'SECRET' });
    assert.equal(value.createdAt, '2026-10-23T12:00:00.000Z');
    assert.ok(!JSON.stringify(value).includes('SECRET'));
    for (const patch of [{ amountIRT: '10000' }, { amountIRT: NaN }, { amountIRT: 0 }, { catalogVersion: 'v2' }, { simulated: false }, { state: 'success' }, { ledgerId: 1 }, { creditedBalanceIRT: 0 }, { createdAt: '2026-02-30 12:00:00' }, { expiresAt: '2026-10-23 12:15:01' }, { state: 'succeeded' }, { id: id.toUpperCase() }])
        assert.throws(() => parseIntent({ ...receipt(), ...patch }));
    const success = { ...receipt(), state: 'succeeded', ledgerId: Number.MAX_SAFE_INTEGER, creditedBalanceIRT: Number.MAX_SAFE_INTEGER };
    assert.equal(parseIntent(success).state, 'succeeded');
    for (const n of [null, -1, 1.2, Infinity, Number.MAX_SAFE_INTEGER + 1, '10000'])
        assert.throws(() => parseIntent({ ...success, creditedBalanceIRT: n }));
    for (const state of ['cancelled', 'failed', 'expired'])
        assert.equal(parseIntent({ ...receipt(), state }).state, state);
});
test('summary uses signed legacy history numbers, strict bounded safe integers and sanitized fixed catalog', () => {
    const raw = { balanceIRT: 0, currency: 'IRT', localPaymentReady: false, packs, items: [{ id: 1, amountIRT: -10, balanceAfterIRT: 0, type: 'withdraw', createdAt: receipt().createdAt, meta: 'SECRET' }] };
    assert.ok(!JSON.stringify(parseSummary(raw)).includes('SECRET'));
    for (const patch of [{ balanceIRT: null }, { balanceIRT: '0' }, { balanceIRT: -1 }, { balanceIRT: Number.MAX_SAFE_INTEGER + 1 }, { localPaymentReady: 1 }, { packs: [] }, { items: Array(21).fill(raw.items[0]) }, { items: [{ ...raw.items[0], type: 'evil' }] }])
        assert.throws(() => parseSummary({ ...raw, ...patch }));
});
test('strict UUID and exact create fields deny browser authority', () => {
    assert.deepEqual(parseCreate({ packId: 'irt-10000', requestKey: id }), { packId: 'irt-10000', requestKey: id });
    for (const key of ['amount', 'owner', 'purpose', 'gatewayURL', 'rest_route'])
        assert.throws(() => parseCreate({ packId: 'irt-10000', requestKey: id, [key]: 'bad' }));
    for (const v of [id.toUpperCase(), id.replace('-4123', '-1123'), `${id}/confirm`, null])
        assert.throws(() => parseUuid(v));
});
test('independent gate is strict default off with canonical configured loopback only', () => {
    const env = { NODE_ENV: 'test', KARBAN_ALLOW_LOCAL_PAYMENTS: 'true', KARBAN_LOCAL_DEVELOPMENT: 'true', WORDPRESS_URL: 'http://localhost/karban', APP_ORIGIN: 'http://localhost:3000' };
    assert.ok(paymentConfig(env));
    assert.equal(paymentConfig({}), undefined);
    for (const key of ['KARBAN_ALLOW_LOCAL_PAYMENTS', 'KARBAN_LOCAL_DEVELOPMENT'])
        for (const v of [undefined, 'false', 'TRUE', ' true', '1', true])
            assert.equal(paymentConfig({ ...env, [key]: v }), undefined);
    for (const WORDPRESS_URL of ['http://example.com', 'http://localhost.evil', 'http://127.1', 'http://2130706433', 'http://user@localhost', 'http://localhost/x?x=1', 'http://localhost/../karban', 'http://localhost/karban//', 'http://localhost/karban///', 'http://localhost/kar%2fban', 'http://localhost/a.b', 'http://localhost/a//b'])
        assert.equal(paymentConfig({ ...env, WORDPRESS_URL }), undefined);
    for (const APP_ORIGIN of ['http://evil.test', 'http://localhost:3000/path', 'http://localhost:3000/'])
        assert.equal(paymentConfig({ ...env, APP_ORIGIN }), undefined);
    assert.equal(paymentConfig({ ...env, NODE_ENV: 'production' }), undefined);
});
test('UUID end anchor cannot admit trailing line terminators', () => {
    for (const suffix of ['\n', '\r', '\r\n', ' ', ' '])
        assert.throws(() => parseUuid(id + suffix));
});
test('runtime environment classification never coerces malformed injected values',()=>{
 const env={NODE_ENV:{toString:()=> 'test'},KARBAN_ALLOW_LOCAL_PAYMENTS:'true',KARBAN_LOCAL_DEVELOPMENT:'true',WORDPRESS_URL:'http://localhost/karban',APP_ORIGIN:'http://localhost:3000'};
 assert.equal(paymentConfig(env),undefined);
});

test('one unambiguous WordPress installation trailing slash normalizes without changing APP_ORIGIN rules', () => {
    const env = { NODE_ENV:'test', KARBAN_ALLOW_LOCAL_PAYMENTS:'true', KARBAN_LOCAL_DEVELOPMENT:'true', APP_ORIGIN:'http://localhost:3000' };
    for (const canonical of ['http://localhost/karban', 'http://localhost:8080/karban/site', 'http://127.0.0.1/karban', 'http://[::1]/karban', 'http://localhost']) {
        assert.deepEqual(paymentConfig({...env, WORDPRESS_URL:canonical + '/'}), {...paymentConfig({...env, WORDPRESS_URL:canonical}), wordpressUrl:canonical});
    }
    for (const WORDPRESS_URL of ['http://localhost/karban//', 'http://localhost/karban///', 'http://localhost/a//b/', 'http://localhost/a/../karban/', 'http://localhost/%2e/karban/', 'http://localhost/kar%2fban/', 'http://localhost/karban/?x=1', 'http://localhost/karban/#x', 'http://user:pass@localhost/karban/', 'http://localhost:99999/karban/', 'http://example.test/karban/', 'http://127.1/karban/', 'http://localhost/karban/ ']) {
        assert.equal(paymentConfig({...env, WORDPRESS_URL}), undefined, WORDPRESS_URL);
    }
    assert.equal(paymentConfig({...env,WORDPRESS_URL:'http://localhost/karban/',APP_ORIGIN:'http://localhost:3000/'}),undefined);
});
