import { assertWordPressServerOnly } from '../wordpress/config.ts';
import { parseCreate, parseEmpty, parseIntent, parseSummary, parseUuid, PaymentBoundaryError, type IntentDto } from './payment-contracts.ts';
import { safePaymentError, unknownOutcome } from './payment-errors.ts';
export interface PaymentGatewayDependencies {
    json(path: string, options: {
        method: 'GET' | 'POST';
        token: string;
        body?: Record<string, unknown>;
    }, onDispatch?: () => void): Promise<unknown>;
}
/** Only fixed namespace-relative paths; ownership is enforced by WordPress from the sealed bearer. */
export function createPaymentGateway({ json }: PaymentGatewayDependencies) {
    async function call<T>(path: string, token: string, method: 'GET' | 'POST', parse: (v: unknown) => T, body?: Record<string, unknown>, dispatch?: () => void): Promise<T> {
        assertWordPressServerOnly();
        let raw: unknown;
        let dispatched = false;
        try {
            raw = await json(path, { method, token, ...(body === undefined ? {} : { body }) }, () => {
                dispatched = true;
                dispatch?.();
            });
        }
        catch (error) {
            throw safePaymentError(error, method === 'POST' && dispatched);
        }
        try {
            return parse(raw);
        }
        catch {
            throw method === 'POST' ? unknownOutcome() : new PaymentBoundaryError('invalid_upstream_response', 503);
        }
    }
    function matched(predicate: (dto: IntentDto) => boolean) { return (v: unknown) => { const dto = parseIntent(v); if (!predicate(dto))
        throw new PaymentBoundaryError('invalid_upstream_response', 503); return dto; }; }
    return {
        create(token: string, body: unknown, dispatch?: () => void) { const input = parseCreate(body); return call('local-payments/topups', token, 'POST', matched(d => d.requestKey === input.requestKey && d.packId === input.packId), input, dispatch); },
        get: (token: string, id: string) => call(`local-payments/topups/${parseUuid(id)}`, token, 'GET', matched(d => d.id === id)),
        lookup: (token: string, key: string) => call(`local-payments/topups/lookup?requestKey=${parseUuid(key)}`, token, 'GET', matched(d => d.requestKey === key)),
        confirm: (token: string, id: string, body: unknown, dispatch?: () => void) => call(`local-payments/topups/${parseUuid(id)}/confirm`, token, 'POST', matched(d => d.id === id && d.state === 'succeeded'), parseEmpty(body), dispatch),
        cancel: (token: string, id: string, body: unknown, dispatch?: () => void) => call(`local-payments/topups/${parseUuid(id)}/cancel`, token, 'POST', matched(d => d.id === id && d.state === 'cancelled'), parseEmpty(body), dispatch),
        summary: (token: string) => call('wallet/summary', token, 'GET', parseSummary),
    };
}
export type PaymentGateway = ReturnType<typeof createPaymentGateway>;
