import { createAuthRouteHandlers } from "@/services/auth/auth-route-adapters";
import { getAuthBffRouteDependencies } from "@/services/auth/auth-bff.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: Request): Promise<Response> {
  return createAuthRouteHandlers(getAuthBffRouteDependencies()).verify(request);
}
