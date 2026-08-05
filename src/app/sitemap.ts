import type { MetadataRoute } from "next";
import { SPECIALISTS } from "@/lib/data";
import { SITE_URL } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...SPECIALISTS.map((s) => ({
      url: `${SITE_URL}/specialists/${s.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
