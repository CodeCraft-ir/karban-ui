import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseSpecialistSearchParams,
  buildSpecialistSearchQuery,
  buildSpecialistPaginationQuery,
} from "./specialist-search.ts";

test("normalizes supported search parameters and Persian pagination", () => {
  const parsed = parseSpecialistSearchParams({
    q: ["  کاشی & رنگ  ", "ignored"],
    category: "کاشی‌کاری",
    city: "تهران",
    verified: "true",
    page: "۳",
    per_page: "99",
    radius: "10",
    neighborhood: "north",
  });
  assert.deepEqual(parsed, {
    q: "کاشی & رنگ",
    category: "کاشی‌کاری",
    city: "تهران",
    verified: true,
    page: 3,
    perPage: 30,
  });
  assert.equal(buildSpecialistSearchQuery(parsed), "q=%DA%A9%D8%A7%D8%B4%DB%8C+%26+%D8%B1%D9%86%DA%AF&category=%DA%A9%D8%A7%D8%B4%DB%8C%E2%80%8C%DA%A9%D8%A7%D8%B1%DB%8C&city=%D8%AA%D9%87%D8%B1%D8%A7%D9%86&verified=1&page=3&per_page=30");
});

test("uses deterministic safe fallbacks and omits false verified", () => {
  const parsed = parseSpecialistSearchParams({ verified: "0", page: "bad", per_page: "0" });
  assert.deepEqual(parsed, { q: "", category: "", city: "", verified: false, page: 1, perPage: 20 });
  assert.equal(buildSpecialistSearchQuery(parsed), "page=1&per_page=20");
  assert.equal(buildSpecialistPaginationQuery(parsed, 4), "page=4&per_page=20");
  assert.equal(buildSpecialistPaginationQuery(parsed, 4, { q: "new", city: "شیراز" }), "q=new&city=%D8%B4%DB%8C%D8%B1%D8%A7%D8%B2&page=1&per_page=20");
});

test("caps query text and rejects unsupported values without reflecting them", () => {
  const parsed = parseSpecialistSearchParams({ q: "x".repeat(500), category: "../bad", city: "", verified: "no" });
  assert.equal(parsed.q.length, 200);
  assert.equal(parsed.category, "../bad");
  assert.equal(buildSpecialistSearchQuery(parsed).includes("radius"), false);
});

test("encodes a single safe detail slug", async () => {
  const { buildSpecialistDetailPath } = await import("./specialist-search.ts");
  assert.equal(buildSpecialistDetailPath("sara نقاش"), "specialists/sara%20%D9%86%D9%82%D8%A7%D8%B4");
  for (const slug of ["", "../x", "a/b", "a\\b", "a?b", "a#b", "\u0000"]) {
    assert.throws(() => buildSpecialistDetailPath(slug));
  }
});
