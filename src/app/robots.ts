import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Auth flow and private dashboards carry no search value
        disallow: ["/auth/", "/dashboard", "/pro"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
