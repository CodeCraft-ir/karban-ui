import assert from "node:assert/strict";
import { test } from "node:test";
import type { PublicSpecialistDetail } from "./contracts/specialists.ts";
import { serializeJsonLd, specialistJsonLd } from "./seo.ts";

function detail(overrides: Partial<PublicSpecialistDetail> = {}): PublicSpecialistDetail {
  return {
    id: 42,
    slug: "mina-painter",
    title: "مینا نقاش <&>",
    verified: true,
    rating: { average: 4.5, count: 12 },
    avatarUrl: null,
    availability: "available",
    categories: ["نقاشی"],
    cities: ["تهران"],
    description: "بازسازی <امن> & دقیق",
    bio: null,
    skills: "رنگ‌آمیزی، پتینه",
    experienceYears: 8,
    responseMinutes: 45,
    priceHint: "توافقی",
    address: "تهران",
    phoneDisplay: "09121234567",
    coordinates: null,
    verifiedAt: null,
    gallery: "unavailable",
    reviews: "unavailable",
    ...overrides,
  };
}

test("specialist JSON-LD uses only normalized public detail fields", () => {
  const schema = specialistJsonLd(detail());

  assert.equal(schema["@type"], "LocalBusiness");
  assert.equal(schema.name, "مینا نقاش <&>");
  assert.equal(schema.description, "بازسازی <امن> & دقیق");
  assert.deepEqual(schema.address, {
    "@type": "PostalAddress",
    streetAddress: "تهران",
    addressLocality: "تهران",
    addressCountry: "IR",
  });
  assert.deepEqual(schema.aggregateRating, {
    "@type": "AggregateRating",
    ratingValue: 4.5,
    reviewCount: 12,
    bestRating: 5,
    worstRating: 1,
  });
  assert.equal("telephone" in schema, false);
  assert.equal("review" in schema, false);
  assert.equal("numberOfEmployees" in schema, false);
});

test("specialist JSON-LD omits unavailable rating and address", () => {
  const schema = specialistJsonLd(detail({ rating: null, address: null, cities: [] }));

  assert.equal("aggregateRating" in schema, false);
  assert.equal("address" in schema, false);
});

test("serializes JSON-LD without executable tag delimiters or entity syntax", () => {
  const serialized = serializeJsonLd({ value: "</script><img src=x>&" });

  assert.equal(serialized.includes("<"), false);
  assert.equal(serialized.includes("&"), false);
  assert.equal(JSON.parse(serialized).value, "</script><img src=x>&");
});
