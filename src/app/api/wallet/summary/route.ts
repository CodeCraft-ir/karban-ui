import "server-only";
import { getPaymentRouteHandlers } from "@/services/payments/payment-bff.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
    return getPaymentRouteHandlers().summary(request);
}
