import type { Specialist } from "@/lib/data";

/** Canonical origin — override in production via env. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://karban.ir";

/* ---------------- JSON-LD builders ---------------- */

export function orgJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#org`,
    name: "کاربان",
    alternateName: "Karban",
    url: SITE_URL,
    logo: `${SITE_URL}/icons/icon-512.svg`,
    description:
      "پلتفرم اتصال کارفرمایان به استادکاران و متخصصان تایید‌شده ساختمانی",
  };
}

export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "کاربان",
    url: SITE_URL,
    inLanguage: "fa-IR",
    publisher: { "@id": `${SITE_URL}/#org` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** LocalBusiness + AggregateRating for a specialist profile. */
export function specialistJsonLd(s: Specialist) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/specialists/${s.slug}#business`,
    name: s.name,
    description: s.about,
    url: `${SITE_URL}/specialists/${s.slug}`,
    address: {
      "@type": "PostalAddress",
      addressLocality: s.city,
      addressRegion: s.city,
      addressCountry: "IR",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: s.rating,
      reviewCount: s.reviewsCount,
      bestRating: 5,
      worstRating: 1,
    },
    knowsAbout: s.skills,
    parentOrganization: { "@id": `${SITE_URL}/#org` },
  };
}

export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
