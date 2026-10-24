import type { SealedAuthCoordinator } from '../auth/auth-coordinator.ts';
import type { PaymentGateway } from './payment-gateway.ts';
import { parseCreate, parseEmpty, parseUuid, PaymentBoundaryError } from './payment-contracts.ts';
import { safePaymentError } from './payment-errors.ts';
interface PaymentServiceDependencies {
    auth: Pick<SealedAuthCoordinator, 'authenticatedOperation'>;
    gateway: PaymentGateway;
}
export function createPaymentService({ auth, gateway }: PaymentServiceDependencies) {
    async function run<T>(operation: (token: string, dispatch: () => void) => Promise<T>, mutation = false): Promise<T> {
        let dispatched = false;
        try {
            return await auth.authenticatedOperation(async (token, account) => {
                if (account.role !== 'client' && account.role !== 'specialist')
                    throw new PaymentBoundaryError('forbidden', 403);
                return operation(token, () => { dispatched = true; });
            }, undefined, mutation ? true : undefined);
        }
        catch (error) {
            throw safePaymentError(error, mutation && dispatched);
        }
    }
    return {
        create(body: unknown) { const input = parseCreate(body); return run((t, d) => gateway.create(t, input, d), true); },
        get(id: string) { parseUuid(id); return run(t => gateway.get(t, id)); },
        lookup(key: string) { parseUuid(key); return run(t => gateway.lookup(t, key)); },
        confirm(id: string, body: unknown) { parseUuid(id); const input = parseEmpty(body); return run((t, d) => gateway.confirm(t, id, input, d), true); },
        cancel(id: string, body: unknown) { parseUuid(id); const input = parseEmpty(body); return run((t, d) => gateway.cancel(t, id, input, d), true); },
        summary: () => run(t => gateway.summary(t)),
    };
}
export type PaymentService = ReturnType<typeof createPaymentService>;
