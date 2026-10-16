import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { WordPressApiError } from "./errors.ts";
import { loadPublicTerms } from "./taxonomies.ts";

const environment = process.env as Record<string, string | undefined>;
const originalUrl = environment.WORDPRESS_URL;
before(() => { environment.WORDPRESS_URL = "https://codecraft.ir/kar/"; });
after(() => { if (originalUrl === undefined) delete environment.WORDPRESS_URL; else environment.WORDPRESS_URL = originalUrl; });

function termsResponse(items: unknown[], pageCount = 1): Response {
  return new Response(JSON.stringify(items), { status: 200, headers: { "X-WP-TotalPages": String(pageCount), "X-WP-Total": String(items.length), "Content-Type": "application/json" } });
}

test("loads allowlisted core terms under the configured WordPress subdirectory", async () => {
  const urls: string[] = [];
  const terms = await loadPublicTerms("job_category", {
    fetch: async (input, init) => {
      urls.push(String(input));
      assert.equal(init?.cache, "no-store");
      assert.equal(new Headers(init?.headers).get("accept"), "application/json");
      assert.equal(new Headers(init?.headers).has("authorization"), false);
      return termsResponse([{ id: 4, name: "کاشی", slug: "کاشی", count: 7, parent: 0 }]);
    },
  });
  assert.deepEqual(urls, ["https://codecraft.ir/kar/wp-json/wp/v2/job_category?per_page=100&page=1&_fields=id%2Cname%2Cslug%2Ccount%2Cparent"]);
  assert.deepEqual(terms, [{ id: 4, name: "کاشی", slug: "کاشی", count: 7, parent: 0 }]);
});

test("fetches every term page and deduplicates IDs", async () => {
  const pages: number[] = [];
  const terms = await loadPublicTerms("city", {
    fetch: async (input) => {
      const page = Number(new URL(String(input)).searchParams.get("page"));
      pages.push(page);
      return termsResponse(page === 1 ? [{ id: 1, name: "تهران", slug: "tehran", count: 1 }] : [{ id: 1, name: "تهران", slug: "tehran", count: 1 }, { id: 2, name: "شیراز", slug: "shiraz", count: 2 }], 2);
    },
  });
  assert.deepEqual(pages, [1, 2]);
  assert.deepEqual(terms.map((term) => term.id), [1, 2]);
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
