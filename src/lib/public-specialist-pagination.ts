export const MAX_PUBLIC_CATALOG_PAGES = 1_000;
export const PUBLIC_CATALOG_PAGE_CONCURRENCY = 4;

export type CatalogPaginationToken = number | "ellipsis";

export interface CatalogPageLike {
  page: number;
  pages: number;
}

export class CatalogPaginationLimitError extends Error {
  constructor() {
    super("تعداد صفحه‌های فهرست عمومی از سقف امن بیشتر است.");
    this.name = "CatalogPaginationLimitError";
  }
}

export class CatalogPaginationContractError extends Error {
  constructor() {
    super("صفحه‌بندی فهرست عمومی معتبر نیست.");
    this.name = "CatalogPaginationContractError";
  }
}

function isSafePage(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

/**
 * Creates only a fixed-size display window: first/last page, the current page,
 * and at most two neighbours on either side. It never allocates by total pages.
 */
export function buildCatalogPaginationWindow(
  currentPage: number,
  totalPages: number,
): CatalogPaginationToken[] {
  if (!isSafePage(currentPage) || !isSafePage(totalPages) || currentPage > totalPages) {
    return [];
  }

  const visible = new Set<number>([1, totalPages]);
  for (let page = Math.max(1, currentPage - 2); page <= Math.min(totalPages, currentPage + 2); page += 1) {
    visible.add(page);
  }

  const pages = [...visible].sort((left, right) => left - right);
  const window: CatalogPaginationToken[] = [];
  for (const page of pages) {
    const previous = window.at(-1);
    if (typeof previous === "number" && page - previous > 1) window.push("ellipsis");
    window.push(page);
  }
  return window;
}

/**
 * Reads a complete catalog only when its declared page count fits the documented
 * per-response ceiling. At most four page requests run at once; a malformed
 * response or one failed request rejects the entire operation rather than
 * returning a partial sitemap.
 */
export async function loadBoundedCatalogPages<T extends CatalogPageLike>(
  first: T,
  loadPage: (page: number) => Promise<T>,
  options: {
    maxPages?: number;
    concurrency?: number;
  } = {},
): Promise<T[]> {
  const maxPages = options.maxPages ?? MAX_PUBLIC_CATALOG_PAGES;
  const concurrency = options.concurrency ?? PUBLIC_CATALOG_PAGE_CONCURRENCY;
  if (!Number.isSafeInteger(maxPages) || maxPages < 1 || !Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new CatalogPaginationContractError();
  }
  if (!isSafePage(first.page) || !Number.isSafeInteger(first.pages) || first.pages < 0 || first.page !== 1) {
    throw new CatalogPaginationContractError();
  }
  if (first.pages > maxPages) throw new CatalogPaginationLimitError();
  if (first.pages === 0) return [first];

  const results: T[] = [first];
  let nextPage = 2;
  const workerCount = Math.min(concurrency, first.pages - 1);

  async function worker(): Promise<void> {
    while (nextPage <= first.pages) {
      const requestedPage = nextPage;
      nextPage += 1;
      const catalog = await loadPage(requestedPage);
      if (catalog.page !== requestedPage || catalog.pages !== first.pages) {
        throw new CatalogPaginationContractError();
      }
      results[requestedPage - 1] = catalog;
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
