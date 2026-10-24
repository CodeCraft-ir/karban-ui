import "server-only";
import { getPaymentRouteHandlers } from "@/services/payments/payment-bff.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    return getPaymentRouteHandlers().get(request, (await params).id);
}
