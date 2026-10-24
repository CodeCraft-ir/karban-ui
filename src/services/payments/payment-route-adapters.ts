import type { PaymentService } from './payment-service.ts';
import { PaymentBoundaryError, parseUuid } from './payment-contracts.ts';
import { assertPaymentRead, parsePaymentJson, paymentQuery } from './payment-request-policy.ts';
import { safePaymentError } from './payment-errors.ts';
export interface PaymentRouteDependencies {
    appOrigin: string | undefined;
    available: boolean;
    getService(readOnly: boolean): Promise<PaymentService>;
}
const headers = { 'Cache-Control': 'private, no-store', Pragma: 'no-cache', Vary: 'Cookie' };
export function createPaymentRouteHandlers(deps: PaymentRouteDependencies) {
    async function run(operation: () => Promise<unknown>): Promise<Response> { try {
        return Response.json(await operation(), { headers });
    }
    catch (error) {
        const e = safePaymentError(error);
        return Response.json({ error: { code: e.code, reloadRequired: e.reconciliationRequired, reconciliationRequired: e.reconciliationRequired } }, { status: e.status, headers });
    } }
    function gate(): string { if (!deps.available || !deps.appOrigin)
        throw new PaymentBoundaryError('payment_unavailable', 503); return deps.appOrigin; }
    function read(request: Request, operation: (s: PaymentService) => Promise<unknown>, lookup = false, id?: string) { return run(async () => { gate(); assertPaymentRead(request); paymentQuery(request, lookup); if (id !== undefined)
        parseUuid(id); return operation(await deps.getService(true)); }); }
    function write(request: Request, kind: 'create' | 'empty', operation: (s: PaymentService, b: Record<string, unknown>) => Promise<unknown>, id?: string) { return run(async () => { const origin = gate(); paymentQuery(request); if (id !== undefined)
        parseUuid(id); const body = await parsePaymentJson(request, origin, kind); return operation(await deps.getService(false), body); }); }
    return {
        create: (r: Request) => write(r, 'create', async (s, b) => ({ intent: await s.create(b) })),
        get: (r: Request, id: string) => read(r, async (s) => ({ intent: await s.get(id) }), false, id),
        lookup: (r: Request) => read(r, async (s) => ({ intent: await s.lookup(paymentQuery(r, true)!) }), true),
        confirm: (r: Request, id: string) => write(r, 'empty', async (s, b) => ({ intent: await s.confirm(id, b) }), id),
        cancel: (r: Request, id: string) => write(r, 'empty', async (s, b) => ({ intent: await s.cancel(id, b) }), id),
        summary: (r: Request) => read(r, async (s) => ({ summary: await s.summary() })),
    };
}
