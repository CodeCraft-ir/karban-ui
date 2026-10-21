import "server-only";

import { getProfileRouteHandlers } from "@/services/profile/profile-bff.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return getProfileRouteHandlers().profile(request);
}

export async function POST(request: Request) {
  return getProfileRouteHandlers().updateProfile(request);
}
