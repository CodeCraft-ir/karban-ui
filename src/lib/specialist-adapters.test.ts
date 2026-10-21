import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PublicDataContractError,
  parseSpecialistCard,
  parseSpecialistDetail,
  normalizePublicPhone,
  normalizePublicUrl,
} from "./specialist-adapters.ts";

test("projects real public image arrays without leaking metadata or inventing content", () => {
  const base = { id:2,slug:'detail',title:'Detail',is_verified:false,categories:[],cities:[] };
  const item = { id:19,url:'https://example.test/real.webp',type:'image',caption:'کار واقعی',owner:99 };
  assert.deepEqual(parseSpecialistDetail({...base,gallery:[item]}).gallery,[{id:19,url:item.url,type:'image',caption:item.caption}]);
  for(const url of ['javascript:alert(1)','https://u:p@example.test/a','https://example.test/a#private','https://example.test/a b']) {
    assert.equal(parseSpecialistDetail({...base,gallery:[{...item,url}]}).gallery,'unavailable');
  }
  assert.equal(parseSpecialistDetail({...base,gallery:[item,item]}).gallery,'unavailable');
});

test("parses a truthful public card and drops unknown private fields", () => {
  const card = parseSpecialistCard({
    id: 12,
    slug: "sara-نقاش",
    title: "سارا نقاش",
    is_verified: true,
    rating_avg: 4.8,
    rating_count: 3,
    avatar_url: "https://codecraft.ir/uploads/sara.jpg",
    availability: "available",
    categories: ["نقاشی"],
    cities: ["تهران"],
    phone: "+989121234567",
    user_id: 99,
  });

  assert.deepEqual(card, {
    id: 12,
    slug: "sara-نقاش",
    title: "سارا نقاش",
    verified: true,
    rating: { average: 4.8, count: 3 },
    avatarUrl: "https://codecraft.ir/uploads/sara.jpg",
    availability: "available",
    categories: ["نقاشی"],
    cities: ["تهران"],
  });
  assert.equal("phone" in card, false);
});

test("keeps unknown availability and does not manufacture a zero rating", () => {
  const card = parseSpecialistCard({
    id: 1,
    slug: "x",
    title: "X",
    is_verified: false,
    rating_avg: 5,
    rating_count: 0,
    avatar_url: false,
    availability: "offline",
    categories: [],
    cities: [],
  });
  assert.equal(card.rating, null);
  assert.equal(card.avatarUrl, null);
  assert.equal(card.availability, "unknown");
});

test("rejects malformed required identity and collections", () => {
  for (const fixture of [
    { id: 0, slug: "x", title: "X", is_verified: false, categories: [], cities: [] },
    { id: 1, slug: "", title: "X", is_verified: false, categories: [], cities: [] },
    { id: 1, slug: "x", title: "", is_verified: false, categories: [], cities: [] },
    { id: 1, slug: "x", title: "X", is_verified: false, categories: "نقاشی", cities: [] },
  ]) {
    assert.throws(() => parseSpecialistCard(fixture), PublicDataContractError);
  }
});

test("requires a boolean verification flag without changing valid true or false", () => {
  const identity = { id: 4, slug: "verified", title: "Verified", categories: [], cities: [] };
  for (const is_verified of [undefined, null, "true", 1]) {
    const fixture = is_verified === undefined
      ? { ...identity }
      : { ...identity, is_verified };
    assert.throws(() => parseSpecialistCard(fixture), PublicDataContractError);
  }
  assert.equal(parseSpecialistCard({ ...identity, is_verified: true }).verified, true);
  assert.equal(parseSpecialistCard({ ...identity, is_verified: false }).verified, false);
});

test("normalizes only the named public phone field and safe URLs", () => {
  assert.equal(normalizePublicPhone("۰۹۱۲ ۱۲۳-۴۵۶۷"), "09121234567");
  assert.equal(normalizePublicPhone("+٩٨ (٩١٢) ١٢٣٤٥٦٧"), "+989121234567");
  assert.equal(normalizePublicPhone("<script>0912</script>"), null);
  assert.equal(normalizePublicPhone("https://example.test/0912"), null);
  assert.equal(normalizePublicUrl("javascript:alert(1)"), null);
  assert.equal(normalizePublicUrl("https://example.test/a"), "https://example.test/a");
});

test("represents unsupported gallery and unavailable reviews without fake records", () => {
  const detail = parseSpecialistDetail({
    id: 2,
    slug: "detail",
    title: "Detail",
    is_verified: true,
    rating_avg: 0,
    rating_count: 0,
    avatar_url: null,
    availability: "busy",
    categories: [],
    cities: [],
    description: "توضیح",
    bio: "بیو",
    skills: "رنگ، گچ",
    experience_years: 0,
    response_minutes: 15,
    price_hint: "توافقی",
    address: "تهران",
    phone_display: "۰۹۱۲۱۲۳۴۵۶۷",
    lat: 0,
    lng: 0,
    gallery: [{ media: 44, caption: "private shape" }],
    verified_at: null,
    secret_phone: "09120000000",
  });
  assert.equal(detail.phoneDisplay, "09121234567");
  assert.equal(detail.gallery, "unavailable");
  assert.equal(detail.reviews, "unavailable");
  assert.equal("secretPhone" in detail, false);
  assert.equal(detail.experienceYears, null);
  assert.equal(detail.coordinates, null);
});

test("does not expose out-of-range coordinates as a real location", () => {
  const detail = parseSpecialistDetail({
    id: 3, slug: "coords", title: "Coords", is_verified: false,
    rating_avg: 0, rating_count: 0, avatar_url: null, availability: "away",
    categories: [], cities: [], lat: 91, lng: 181, gallery: [],
  });
  assert.equal(detail.coordinates, null);
});
