import type { PublicSpecialistDetail } from "@/lib/contracts/specialists";

/** Canonical origin — override in production via env. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://karban.ir";

type JsonLdValue = Record<string, unknown> | readonly unknown[];

/**
 * Produces script-safe JSON while preserving the original structured data.
 * React renders this string as script text, so tag delimiters must not survive.
 */
export function serializeJsonLd(value: JsonLdValue): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/&/g, "\\u0026");
}

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
    description: "فهرست عمومی متخصصان و خدمات ساختمانی کاربان",
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

/** LocalBusiness data limited to the normalized public specialist detail. */
export function specialistJsonLd(specialist: PublicSpecialistDetail) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/specialists/${encodeURIComponent(specialist.slug)}#business`,
    name: specialist.title,
    url: `${SITE_URL}/specialists/${encodeURIComponent(specialist.slug)}`,
    parentOrganization: { "@id": `${SITE_URL}/#org` },
  };

  const description = specialist.description ?? specialist.bio;
  if (description) schema.description = description;
  if (specialist.skills) schema.knowsAbout = specialist.skills;
  if (specialist.priceHint) schema.priceRange = specialist.priceHint;

  const city = specialist.cities[0];
  if (specialist.address || city) {
    schema.address = {
      "@type": "PostalAddress",
      ...(specialist.address ? { streetAddress: specialist.address } : {}),
      ...(city ? { addressLocality: city } : {}),
      addressCountry: "IR",
    };
  }

  if (specialist.rating) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: specialist.rating.average,
      reviewCount: specialist.rating.count,
      bestRating: 5,
      worstRating: 1,
    };
  }

  return schema;
}

export function breadcrumbJsonLd(
  items: { name: string; path: string }[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
