export interface SpecialistSitemapItem {
  slug: string;
}

/** Keeps sitemap paths stable when the public catalog repeats an item across pages. */
export function collectSpecialistSitemapSlugs(
  pages: readonly (readonly SpecialistSitemapItem[])[],
): string[] {
  const slugs = new Set<string>();

  for (const page of pages) {
    for (const item of page) {
      const slug = item.slug.trim();
      if (slug) slugs.add(slug);
    }
  }

  return [...slugs];
}
