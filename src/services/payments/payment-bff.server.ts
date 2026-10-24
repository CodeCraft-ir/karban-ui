import 'server-only';
import type { AuthDiagnosticSurface } from '../auth/auth-local-diagnostic.ts';
import { createRequestAuthCoordinator } from '../auth/auth-bff.server.ts';
import { wordpressRest } from '../wordpress/rest-client.ts';
import { paymentConfig } from './payment-runtime-config.ts';
import { PaymentBoundaryError, parseUuid } from './payment-contracts.ts';
import { createPaymentGateway } from './payment-gateway.ts';
import { createPaymentService } from './payment-service.ts';
import { createPaymentRouteHandlers } from './payment-route-adapters.ts';
/** Runtime only. This boundary requires one persistent Node process/global authority realm. */
async function requestService(readOnly: boolean, surface: AuthDiagnosticSurface = 'handler') {
    if (!paymentConfig(process.env))
        throw new PaymentBoundaryError('payment_unavailable', 503);
    const auth = await createRequestAuthCoordinator(readOnly, surface);
    return createPaymentService({ auth, gateway: createPaymentGateway({
        json: (path, options, onDispatch) => wordpressRest(path, {
            ...options,
            // Keep the shared plain/pretty URL builder. Mark dispatch only after
            // its preflight succeeds; refuse redirects before any second request.
            fetch: (input, init) => {
                onDispatch?.();
                return globalThis.fetch(input, { ...init, redirect: 'error' });
            },
        }),
    }) });
}
export function getPaymentRouteHandlers() { const config = paymentConfig(process.env); return createPaymentRouteHandlers({ appOrigin: config?.appOrigin, available: !!config, getService: requestService }); }
/** Fresh direct server reads; no self HTTP, refresh, cookie save or client balance authority. */
export async function readWalletSummary() { return (await requestService(true, 'rsc_account')).summary(); }
export async function readLocalTopup(id: string) { parseUuid(id); return (await requestService(true, 'rsc_account')).get(id); }
export async function lookupLocalTopup(requestKey: string) { parseUuid(requestKey); return (await requestService(true, 'rsc_account')).lookup(requestKey); }
