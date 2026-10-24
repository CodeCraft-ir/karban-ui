import { assertAuthMutationOrigin } from '../../lib/auth-request-policy.ts';
import { readBoundedBody } from '../profile/profile-request-policy.ts';
import { parseCreate, parseEmpty, parseUuid, PaymentBoundaryError } from './payment-contracts.ts';
/** Query/route/body are separate authorities. rest_route is forbidden caller input, not transport metadata. */
export function paymentQuery(request: Request, lookup = false): string | undefined {
    const q = new URL(request.url).searchParams;
    const entries = [...q];
    if (lookup) {
        if (entries.length !== 1 || entries[0][0] !== 'requestKey')
            throw new PaymentBoundaryError();
        return parseUuid(entries[0][1]);
    }
    if (entries.length)
        throw new PaymentBoundaryError();
}
export function assertPaymentRead(request: Request): void { if (request.method !== 'GET')
    throw new PaymentBoundaryError('method_not_allowed', 405); if (request.body !== null)
    throw new PaymentBoundaryError(); }
export async function parsePaymentJson(request: Request, appOrigin: string, kind: 'create' | 'empty', timeoutMs = 15000): Promise<Record<string, unknown>> {
    if (request.method !== 'POST')
        throw new PaymentBoundaryError('method_not_allowed', 405);
    assertAuthMutationOrigin(request, appOrigin);
    if (request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json')
        throw new PaymentBoundaryError('invalid_content_type', 415);
    let raw: Uint8Array;
    try {
        raw = await readBoundedBody(request, 4096, timeoutMs);
    }
    catch (error) {
        // Reuse only the generic byte reader, never its profile error vocabulary/message.
        const code = (error as {
            code?: unknown;
        })?.code;
        const status: Record<string, number> = { request_too_large: 413, body_timeout: 408, request_aborted: 400, invalid_request: 400 };
        if (typeof code === 'string' && Object.hasOwn(status, code))
            throw new PaymentBoundaryError(code, status[code]);
        throw new PaymentBoundaryError();
    }
    let value: unknown;
    try {
        value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
    }
    catch {
        throw new PaymentBoundaryError();
    }
    return kind === 'create' ? parseCreate(value) : parseEmpty(value);
}
