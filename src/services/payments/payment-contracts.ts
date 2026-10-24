/** PHP DTOs contain actual JSON numbers, not legacy DB decimal strings. */
export class PaymentBoundaryError extends Error {
    constructor(readonly code = 'invalid_request', readonly status = 400, readonly reconciliationRequired = false) {
        super('Payment request could not be completed.');
        this.name = 'PaymentBoundaryError';
    }
}
export const CATALOG_VERSION = 'local-irt-v1' as const;
const amounts = { 'irt-10000': 10000, 'irt-50000': 50000, 'irt-100000': 100000 } as const;
export type PackId = keyof typeof amounts;
export type IntentState = 'pending' | 'succeeded' | 'cancelled' | 'failed' | 'expired';
export interface PackDto {
    packId: PackId;
    catalogVersion: typeof CATALOG_VERSION;
    amountIRT: number;
    currency: 'IRT';
}
export interface IntentDto extends PackDto {
    id: string;
    requestKey: string;
    purpose: 'wallet_topup';
    state: IntentState;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    simulated: true;
    ledgerId: number | null;
    creditedBalanceIRT: number | null;
}
export interface WalletItemDto {
    id: number;
    amountIRT: number;
    balanceAfterIRT: number;
    type: 'deposit' | 'withdraw' | 'lead_unlock' | 'subscription' | 'refund' | 'bonus' | 'adjustment';
    createdAt: string;
}
export interface WalletSummaryDto {
    balanceIRT: number;
    currency: 'IRT';
    localPaymentReady: boolean;
    packs: PackDto[];
    items: WalletItemDto[];
}
function invalid(): never { throw new PaymentBoundaryError('invalid_upstream_response', 503); }
export function object(value: unknown): Record<string, unknown> { if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new PaymentBoundaryError(); return value as Record<string, unknown>; }
export function parseUuid(value: unknown): string { if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value))
    throw new PaymentBoundaryError(); return value; }
function packId(v: unknown): PackId { if (typeof v !== 'string' || !Object.hasOwn(amounts, v))
    throw new PaymentBoundaryError(); return v as PackId; }
export function parseCreate(value: unknown): {
    packId: PackId;
    requestKey: string;
} { const v = object(value); if (Object.keys(v).length !== 2 || !Object.hasOwn(v, 'packId') || !Object.hasOwn(v, 'requestKey'))
    throw new PaymentBoundaryError(); return { packId: packId(v.packId), requestKey: parseUuid(v.requestKey) }; }
export function parseEmpty(value: unknown): Record<string, never> { if (Object.keys(object(value)).length)
    throw new PaymentBoundaryError(); return {}; }
function integer(v: unknown, minimum = 0): number { if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < minimum)
    return invalid(); return v; }
function utc(v: unknown): string { if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/u.test(v))
    return invalid(); const d = new Date(v.replace(' ', 'T') + 'Z'); if (!Number.isFinite(d.valueOf()) || d.toISOString().replace('T', ' ').replace('.000Z', '') !== v)
    return invalid(); return d.toISOString(); }
function pack(value: unknown): PackDto { const v = object(value); const id = packId(v.packId); if (v.catalogVersion !== CATALOG_VERSION || integer(v.amountIRT, 1) !== amounts[id] || v.currency !== 'IRT')
    return invalid(); return { packId: id, catalogVersion: CATALOG_VERSION, amountIRT: amounts[id], currency: 'IRT' }; }
export function parseIntent(value: unknown): IntentDto {
    const v = object(value);
    const p = pack(v);
    const id = parseUuid(v.id), requestKey = parseUuid(v.requestKey);
    const states: readonly unknown[] = ['pending', 'succeeded', 'cancelled', 'failed', 'expired'];
    if (v.purpose !== 'wallet_topup' || v.simulated !== true || !states.includes(v.state))
        return invalid();
    const createdAt = utc(v.createdAt), updatedAt = utc(v.updatedAt), expiresAt = utc(v.expiresAt);
    if (createdAt > updatedAt || Date.parse(expiresAt) - Date.parse(createdAt) !== 900000)
        return invalid();
    const succeeded = v.state === 'succeeded';
    if (!succeeded && (v.ledgerId !== null || v.creditedBalanceIRT !== null))
        return invalid();
    return { ...p, id, requestKey, purpose: 'wallet_topup', state: v.state as IntentState, createdAt, updatedAt, expiresAt, simulated: true, ledgerId: succeeded ? integer(v.ledgerId, 1) : null, creditedBalanceIRT: succeeded ? integer(v.creditedBalanceIRT) : null };
}
export function parseSummary(value: unknown): WalletSummaryDto {
    const v = object(value);
    if (v.currency !== 'IRT' || typeof v.localPaymentReady !== 'boolean' || !Array.isArray(v.packs) || v.packs.length !== 3 || !Array.isArray(v.items) || v.items.length > 20)
        return invalid();
    const packs = v.packs.map(pack);
    if (new Set(packs.map(p => p.packId)).size !== 3)
        return invalid();
    const types: readonly unknown[] = ['deposit', 'withdraw', 'lead_unlock', 'subscription', 'refund', 'bonus', 'adjustment'];
    const items = v.items.map(value => { const r = object(value); if (!types.includes(r.type))
        return invalid(); return { id: integer(r.id, 1), amountIRT: integer(r.amountIRT, -Number.MAX_SAFE_INTEGER), balanceAfterIRT: integer(r.balanceAfterIRT), type: r.type as WalletItemDto['type'], createdAt: utc(r.createdAt) }; });
    return { balanceIRT: integer(v.balanceIRT), currency: 'IRT', localPaymentReady: v.localPaymentReady, packs, items };
}
