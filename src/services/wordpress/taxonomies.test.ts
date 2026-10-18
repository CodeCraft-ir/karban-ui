import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { WordPressApiError } from "./errors.ts";
import { loadPublicTerms } from "./taxonomies.ts";

const environment = process.env as Record<string, string | undefined>;
const originalUrl = environment.WORDPRESS_URL;
before(() => { environment.WORDPRESS_URL = "https://codecraft.ir/kar/"; });
after(() => { if (originalUrl === undefined) delete environment.WORDPRESS_URL; else environment.WORDPRESS_URL = originalUrl; });

function termsResponse(items: unknown[], pageCount = 1, total = items.length): Response {
  return new Response(JSON.stringify(items), { status: 200, headers: { "X-WP-TotalPages": String(pageCount), "X-WP-Total": String(total), "Content-Type": "application/json" } });
}

test("loads allowlisted core terms under the configured WordPress subdirectory", async () => {
  const urls: string[] = [];
  const terms = await loadPublicTerms("job_category", {
    fetch: async (input, init) => {
      urls.push(String(input));
      assert.equal(init?.cache, "no-store");
      assert.equal(new Headers(init?.headers).get("accept"), "application/json");
      assert.equal(new Headers(init?.headers).has("authorization"), false);
      assert.equal(init?.credentials, "omit");
      return termsResponse([{ id: 4, name: "کاشی", slug: "کاشی", count: 7, parent: 0 }]);
    },
  });
  assert.deepEqual(urls, ["https://codecraft.ir/kar/wp-json/wp/v2/job_category?per_page=100&page=1&_fields=id%2Cname%2Cslug%2Ccount%2Cparent"]);
  assert.deepEqual(terms, [{ id: 4, name: "کاشی", slug: "کاشی", count: 7, parent: 0 }]);
});

test("refuses browser execution before dispatching an injected terms fetch", async () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let calls = 0;
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  try {
    await assert.rejects(
      () => loadPublicTerms("city", { fetch: async () => { calls += 1; return termsResponse([]); } }),
      /only be called from the server/,
    );
    assert.equal(calls, 0);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete (globalThis as { window?: unknown }).window;
  }
});

test("fetches every term page and deduplicates IDs", async () => {
  const pages: number[] = [];
  const terms = await loadPublicTerms("city", {
    fetch: async (input) => {
      const page = Number(new URL(String(input)).searchParams.get("page"));
      pages.push(page);
      return termsResponse(page === 1 ? [{ id: 1, name: "تهران", slug: "tehran", count: 1 }] : [{ id: 1, name: "تهران", slug: "tehran", count: 1 }, { id: 2, name: "شیراز", slug: "shiraz", count: 2 }], 2, 101);
    },
  });
  assert.deepEqual(pages, [1, 2]);
  assert.deepEqual(terms.map((term) => term.id), [1, 2]);
});

test("allows the documented zero-page empty core taxonomy result only on its first page", async () => {
  const requestedUrls: string[] = [];
  const terms = await loadPublicTerms("job_category", {
    fetch: async (input) => {
      requestedUrls.push(String(input));
      return termsResponse([], 0);
    },
  });

  assert.deepEqual(terms, []);
  assert.deepEqual(requestedUrls, [
    "https://codecraft.ir/kar/wp-json/wp/v2/job_category?per_page=100&page=1&_fields=id%2Cname%2Cslug%2Ccount%2Cparent",
  ]);
});

test("rejects malformed or inconsistent core taxonomy pagination headers", async () => {
  const malformedResponses = [
    new Response("[]", { status: 200, headers: { "X-WP-TotalPages": "0", "X-WP-Total": "not-a-number" } }),
    new Response("[]", { status: 200, headers: { "X-WP-TotalPages": "0" } }),
    termsResponse([{ id: 1, name: "تهران", slug: "tehran", count: 1 }], 0),
    new Response("[]", { status: 200, headers: { "X-WP-TotalPages": "0", "X-WP-Total": "1" } }),
    new Response("[]", { status: 200, headers: { "X-WP-TotalPages": "1", "X-WP-Total": "0" } }),
  ];

  for (const response of malformedResponses) {
    await assert.rejects(
      () => loadPublicTerms("city", { fetch: async () => response.clone() }),
      (error: unknown) => error instanceof WordPressApiError && error.status === 502 && error.code === "invalid_public_contract",
    );
  }
});

test("uses fixed plain REST core taxonomy routes without accepting caller route overrides", async () => {
  const previousMode = environment.WORDPRESS_PERMALINK_MODE;
  const urls: string[] = [];
  environment.WORDPRESS_PERMALINK_MODE = "plain";
  try {
    await loadPublicTerms("city", {
      fetch: async (input) => {
        urls.push(String(input));
        return termsResponse([], 0);
      },
    });
  } finally {
    if (previousMode === undefined) delete environment.WORDPRESS_PERMALINK_MODE;
    else environment.WORDPRESS_PERMALINK_MODE = previousMode;
  }

  assert.deepEqual(urls, [
    "https://codecraft.ir/kar/index.php?rest_route=%2Fwp%2Fv2%2Fcity&per_page=100&page=1&_fields=id%2Cname%2Cslug%2Ccount%2Cparent",
  ]);
});

test("rejects nonallowlisted taxonomy and unsafe/malformed core responses", async () => {
  let calls = 0;
  await assert.rejects(() => loadPublicTerms("users" as never, { fetch: async () => { calls += 1; return termsResponse([]); } }));
  assert.equal(calls, 0);
  for (const response of [
    new Response("[]", { status: 200 }),
    new Response("{}", { status: 200, headers: { "X-WP-TotalPages": "1" } }),
    termsResponse([{ id: 0, name: "x", slug: "x", count: 0 }]),
    termsResponse([], 101),
  ]) {
    await assert.rejects(
      () => loadPublicTerms("city", { fetch: async () => response.clone() }),
      (error: unknown) => error instanceof WordPressApiError && error.status === 502,
    );
  }
});

test("maps core HTTP and invalid JSON failures without credentials", async () => {
  await assert.rejects(
    () => loadPublicTerms("neighborhood", { fetch: async () => new Response('{"code":"rest_forbidden"}', { status: 403 }) }),
    (error: unknown) => error instanceof WordPressApiError && error.code === "http_error" && error.status === 403,
  );
  await assert.rejects(
    () => loadPublicTerms("neighborhood", { fetch: async () => new Response("not json", { status: 200, headers: { "X-WP-TotalPages": "1" } }) }),
    (error: unknown) => error instanceof WordPressApiError && error.code === "invalid_json",
  );
});

test("maps a timeout while reading a term body after headers", async () => {
  await assert.rejects(
    () => loadPublicTerms("city", {
      timeoutMs: 10,
      fetch: async (_input, init) => {
        const signal = init?.signal;
        assert.ok(signal instanceof AbortSignal);
        return new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              signal.addEventListener("abort", () => controller.error(signal.reason), { once: true });
            },
          }),
          { status: 200, headers: { "X-WP-TotalPages": "1" } },
        );
      },
    }),
    (error: unknown) => error instanceof WordPressApiError && error.code === "timeout" && error.status === 408,
  );
});
