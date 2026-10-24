import { AuthCoordinatorError } from '../auth/auth-coordinator.ts';
import { AuthRequestPolicyError } from '../../lib/auth-request-policy.ts';
import { WordPressApiError } from '../wordpress/errors.ts';
import { PaymentBoundaryError } from './payment-contracts.ts';
const known: Readonly<Record<string, number>> = {
    unauthenticated: 401, forbidden: 403, local_payment_not_found: 404,
    local_payment_request_conflict: 409, local_payment_state_conflict: 409,
    unknown_field: 422, invalid_user: 422, local_payment_invalid_request_key: 422, local_payment_invalid_id: 422, local_payment_invalid_pack: 422, local_payment_invalid_amount: 422,
    rate_limited: 429, local_payment_unavailable: 503, local_payment_schema_not_ready: 503, local_payment_policy_unavailable: 503, local_payment_rate_schema_not_ready: 503, financial_maintenance: 503, financial_storage_unavailable: 503, local_payment_integrity_error: 503,
    invalid_json: 400, payload_too_large: 413, invalid_content_type: 415,
};
export function unknownOutcome(): PaymentBoundaryError { return new PaymentBoundaryError('payment_outcome_unknown', 503, true); }
/** Static allowlist only: vendor message, data, cause and SQL never cross this boundary. */
export function safePaymentError(error: unknown, dispatched = false): PaymentBoundaryError {
    if (error instanceof PaymentBoundaryError)
        return error;
    // WP permission callbacks use core error envelopes; the existing transport deliberately
    // exposes those only as http_error + status, never vendor text.
    if (error instanceof WordPressApiError && error.code === 'http_error' && (error.status === 401 || error.status === 403))
        return new PaymentBoundaryError(error.status === 401 ? 'unauthenticated' : 'forbidden', error.status);
    if (error instanceof WordPressApiError && Object.hasOwn(known, error.code) && error.status === known[error.code])
        return new PaymentBoundaryError(error.code, error.status);
    // A lease can fail after the callback returned a committed DTO. Never reclassify as an auth-only failure.
    if (dispatched)
        return unknownOutcome();
    if (error instanceof AuthCoordinatorError || error instanceof AuthRequestPolicyError)
        return new PaymentBoundaryError(error.code, error.status);
    return new PaymentBoundaryError('payment_unavailable', 503);
}
