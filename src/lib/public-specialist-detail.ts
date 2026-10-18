import { cache } from "react";
import { loadPublicSpecialistDetail } from "@/services/wordpress/public-specialists";

/**
 * Detail loads can record a public profile view upstream. Sharing this cache
 * between the page and its metadata prevents a second load during one render.
 */
export const loadCachedPublicSpecialistDetail = cache(
  async (slug: string) => loadPublicSpecialistDetail(slug),
);
