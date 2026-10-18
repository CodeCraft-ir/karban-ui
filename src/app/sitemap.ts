import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { collectSpecialistSitemapSlugs } from "@/lib/specialist-sitemap";
import { loadPublicSpecialists } from "@/services/wordpress/public-specialists";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const first = await loadPublicSpecialists({ page: "1", per_page: "30" });
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, first.pages - 1) }, (_, index) =>
      loadPublicSpecialists({ page: String(index + 2), per_page: "30" }),
    ),
  );
  const slugs = collectSpecialistSitemapSlugs([
    first.items,
    ...remainingPages.map((catalog) => catalog.items),
  ]);

  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/search`, changeFrequency: "weekly", priority: 0.9 },
    ...slugs.map((slug) => ({
      url: `${SITE_URL}/specialists/${encodeURIComponent(slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
