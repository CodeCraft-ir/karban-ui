import "server-only";

import { getProfileRouteHandlers } from "@/services/profile/profile-bff.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return getProfileRouteHandlers().account(request);
}

export async function POST(request: Request) {
  return getProfileRouteHandlers().updateAccount(request);
}
