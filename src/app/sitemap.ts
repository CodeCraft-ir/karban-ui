import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { loadBoundedCatalogPages } from "@/lib/public-specialist-pagination";
import { collectSpecialistSitemapSlugs } from "@/lib/specialist-sitemap";
import { loadPublicSpecialists } from "@/services/wordpress/public-specialists";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const first = await loadPublicSpecialists({ page: "1", per_page: "30" });
  const catalogs = await loadBoundedCatalogPages(first, (page) =>
    loadPublicSpecialists({ page: String(page), per_page: "30" }),
  );
  const slugs = collectSpecialistSitemapSlugs(catalogs.map((catalog) => catalog.items));

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
