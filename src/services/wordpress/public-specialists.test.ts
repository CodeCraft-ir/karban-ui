import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { WordPressApiError } from "../wordpress/errors.ts";
import {
  loadPublicSpecialistDetail,
  loadPublicSpecialists,
} from "./public-specialists.ts";

const environment = process.env as Record<string, string | undefined>;
const originalUrl = environment.WORDPRESS_URL;

before(() => { environment.WORDPRESS_URL = "https://codecraft.ir/kar/"; });
after(() => {
  if (originalUrl === undefined) delete environment.WORDPRESS_URL;
  else environment.WORDPRESS_URL = originalUrl;
});

const card = {
  id: 10, slug: "mina", title: "مینا", is_verified: true,
  rating_avg: 4.5, rating_count: 2, avatar_url: null, availability: "available",
  categories: ["نقاشی"], cities: ["تهران"],
};

test("loads the fixed public specialists path with normalized supported query", async () => {
  const calls: string[] = [];
  const catalog = await loadPublicSpecialists(
    { q: " رنگ ", verified: "false", page: "۲", per_page: "31", radius: "3" },
    { request: async (path) => { calls.push(path); return { items: [card], page: 2, total: 2, pages: 2 }; } },
  );
  assert.deepEqual(calls, ["specialists?q=%D8%B1%D9%86%DA%AF&page=2&per_page=30"]);
  assert.equal(catalog.items[0]?.slug, "mina");
  assert.equal(catalog.page, 2);
  assert.equal(catalog.total, 2);
  assert.equal(catalog.pages, 2);
});

test("rejects malformed catalog pagination and card payloads as a safe contract failure", async () => {
  await assert.rejects(
    () => loadPublicSpecialists({}, { request: async () => ({ items: [], page: 1, total: 0, pages: 1.5 }) }),
    (error: unknown) => error instanceof WordPressApiError && error.status === 502 && error.code === "invalid_public_contract",
  );
  await assert.rejects(
    () => loadPublicSpecialists({}, { request: async () => ({ items: [{ ...card, id: "10" }], page: 1, total: 1, pages: 1 }) }),
    (error: unknown) => error instanceof WordPressApiError && error.status === 502,
  );
});

test("uses a single encoded detail component and preserves upstream WordPress errors", async () => {
  const calls: string[] = [];
  const detail = await loadPublicSpecialistDetail("مینا نقاش", {
    request: async (path) => { calls.push(path); return { ...card, slug: "مینا نقاش", phone_display: "۰۹۱۲۱۲۳۴۵۶۷", gallery: [] }; },
  });
  assert.deepEqual(calls, ["specialists/%D9%85%DB%8C%D9%86%D8%A7%20%D9%86%D9%82%D8%A7%D8%B4"]);
  assert.equal(detail.phoneDisplay, "09121234567");

  let callsAfterUnsafeSlug = 0;
  await assert.rejects(() => loadPublicSpecialistDetail("../private", { request: async () => { callsAfterUnsafeSlug += 1; return card; } }));
  assert.equal(callsAfterUnsafeSlug, 0);

  const notFound = new WordPressApiError({ status: 404, code: "not_found", message: "یافت نشد" });
  await assert.rejects(
    () => loadPublicSpecialistDetail("missing", { request: async () => { throw notFound; } }),
    (error: unknown) => error === notFound,
  );
});
