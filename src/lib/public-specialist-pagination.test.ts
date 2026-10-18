import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CatalogPaginationLimitError,
  buildCatalogPaginationWindow,
  loadBoundedCatalogPages,
} from "./public-specialist-pagination.ts";

interface Page {
  page: number;
  pages: number;
  items: { slug: string }[];
}

function page(pageNumber: number, totalPages: number): Page {
  return { page: pageNumber, pages: totalPages, items: [{ slug: `specialist-${pageNumber}` }] };
}

test("builds a constant-size pagination window for huge safe page counts", () => {
  const totalPages = Number.MAX_SAFE_INTEGER;
  const window = buildCatalogPaginationWindow(42, totalPages);

  assert.deepEqual(window, [1, "ellipsis", 40, 41, 42, 43, 44, "ellipsis", totalPages]);
  assert.equal(window.length, 9);
  assert.deepEqual(buildCatalogPaginationWindow(totalPages, totalPages), [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages]);
});

test("loads every bounded catalog page with no more than four concurrent requests", async () => {
  let active = 0;
  let maximumActive = 0;
  const calls: number[] = [];
  const catalogs = await loadBoundedCatalogPages(page(1, 9), async (pageNumber) => {
    calls.push(pageNumber);
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active -= 1;
    return page(pageNumber, 9);
  });

  assert.equal(maximumActive <= 4, true);
  assert.deepEqual(calls.sort((left, right) => left - right), [2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(catalogs.map((catalog) => catalog.page), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("rejects huge or above-ceiling page counts before allocating or fetching", async () => {
  let calls = 0;
  await assert.rejects(
    () => loadBoundedCatalogPages(page(1, Number.MAX_SAFE_INTEGER), async (pageNumber) => {
      calls += 1;
      return page(pageNumber, Number.MAX_SAFE_INTEGER);
    }),
    CatalogPaginationLimitError,
  );
  assert.equal(calls, 0);

  await assert.rejects(
    () => loadBoundedCatalogPages(page(1, 1001), async (pageNumber) => page(pageNumber, 1001)),
    CatalogPaginationLimitError,
  );
});
