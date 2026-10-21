import "server-only";

import { getProfileRouteHandlers } from "@/services/profile/profile-bff.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return getProfileRouteHandlers().deleteGallery(request, id);
}
