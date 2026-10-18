import assert from "node:assert/strict";
import { test } from "node:test";
import { collectSpecialistSitemapSlugs } from "./specialist-sitemap.ts";

test("collects unique nonempty specialist slugs across catalog pages", () => {
  const slugs = collectSpecialistSitemapSlugs([
    [{ slug: "mina" }, { slug: "reza" }],
    [{ slug: "mina" }, { slug: "sara" }],
    [{ slug: "" }, { slug: "  " }, { slug: "sara" }],
  ]);

  assert.deepEqual(slugs, ["mina", "reza", "sara"]);
});
