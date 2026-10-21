import assert from "node:assert/strict";
import { test } from "node:test";
import * as contracts from "./profile-contracts.ts";

export const accountRaw = { id: 47, display_name: "نام", role: "specialist", login_phone_masked: "09*****6789", avatar: { id: 31, url: "https://media.example/a.jpg", type: "image" }, location: { id: 987, name: "کاشان", slug: "kashan" }, specialist: { id: 51, slug: "specialist-47", status: "draft" }, phone: "09123456789", tokens: "private" };
export const profileRaw = { id: 51, slug: "specialist-47", title: "عنوان", status: "draft", categories: [{ id: 91, name: "تعمیر", slug: "repair" }], cities: [{ id: 987, name: "کاشان", slug: "kashan" }], avatar: null, gallery: [{ id: 32, url: "https://media.example/b.png", type: "image", caption: "نمونه" }], gallery_revision: 2, gallery_available: true, bio: "درباره", skills: "مهارت", address: "آدرس خصوصی", availability: "available", price_hint: "توافقی", experience_years: 3 };
export const capabilityRaw = { purposes: ["public-avatar", "public-portfolio"], image_mimes: ["image/jpeg", "image/png", "image/webp", "image/gif"], max_bytes: 20971520, max_dimension: 8192, max_pixels: 24000000, max_files: 1, max_gallery_items: 20, video: { enabled: false, reason: "video_unsupported" }, image_decoder_required: true };

test("runtime owner projections minimize account data and preserve honest draft/gallery state", () => {
  assert.equal(typeof contracts.parseAccount, "function", "account runtime projection missing");
  const a = contracts.parseAccount(accountRaw);
  assert.deepEqual(a, { id: 47, displayName: "نام", role: "specialist", loginPhoneMasked: "09*****6789", avatar: accountRaw.avatar, location: accountRaw.location, specialist: accountRaw.specialist });
  assert.ok(!JSON.stringify(a).includes("09123456789"));
  const p = contracts.parseProfile(profileRaw);
  assert.equal(p.galleryRevision, 2); assert.equal(p.status, "draft"); assert.equal(p.gallery[0].id, 32);
  assert.equal("verified" in p, false);
  assert.equal(contracts.parseProfile({ ...profileRaw, verified: true }).verified, true);
  assert.equal(contracts.parseProfile({ ...profileRaw, gallery: [], gallery_revision: null, gallery_available: false }).galleryAvailable, false);
});

test("owner DTOs fail closed for malformed identity, unsafe URLs, invalid gallery, and false video claims", () => {
  for (const patch of [{ id: "47" }, { role: "administrator" }, { login_phone_masked: "09123456789" }, { avatar: { id: 31, type: "image", url: "https://user:pass@host/a" } }, { display_name: "a\nprivate" }]) assert.throws(() => contracts.parseAccount({ ...accountRaw, ...patch }));
  for (const patch of [{ status: "publish-now" }, { gallery_revision: -1 }, { verified: "true" }, { gallery: [profileRaw.gallery[0], profileRaw.gallery[0]] }, { gallery: [{ ...profileRaw.gallery[0], url: "javascript:alert(1)" }] }, { experience_years: 81 }, { cities: [{ id: 1, name: "x", slug: "a b" }] }]) assert.throws(() => contracts.parseProfile({ ...profileRaw, ...patch }));
  assert.equal(contracts.parseCapabilities(capabilityRaw).video.enabled, false);
  assert.throws(() => contracts.parseCapabilities({ ...capabilityRaw, video: { enabled: true } }));
  assert.throws(() => contracts.parseCapabilities({ ...capabilityRaw, max_bytes: 20971521 }));
});

test("exact installed backend contract allows absent masked phone and rejects names over 100 and text controls", () => {
  assert.equal(contracts.parseAccount({ ...accountRaw, login_phone_masked: null }).loginPhoneMasked, null);
  assert.throws(() => contracts.parseInput("account", { display_name: "x".repeat(101) }));
  assert.throws(() => contracts.parseInput("profile", { bio: "line\nbreak" }));
});

test("strict write allowlists match backend bounds and never admit authority, URLs or coerced IDs", () => {
  assert.deepEqual(contracts.parseInput("account", { display_name: "تازه", account_city_id: 987, avatar_id: null }), { display_name: "تازه", account_city_id: 987, avatar_id: null });
  assert.deepEqual(contracts.parseInput("profile", { bio: "ب".repeat(4000), category_ids: [91], city_id: 987, avatar_id: 31 }), { bio: "ب".repeat(4000), category_ids: [91], city_id: 987, avatar_id: 31 });
  for (const body of [{ status: "publish" }, { verified: true }, { user: 47 }, { role: "client" }, { author: 47 }, { slug: "fake" }, { avatar_id: "31" }, { category_ids: [1, 1] }, { bio: "x".repeat(4001) }, { title: "<script>" }]) assert.throws(() => contracts.parseInput("profile", body));
  assert.deepEqual(contracts.parseInput("gallery", { media_id: 32, caption: "نمونه", expected_revision: 2 }), { media_id: 32, caption: "نمونه", expected_revision: 2 });
  assert.throws(() => contracts.parseInput("gallery", { media_id: 32, url: "https://foreign.example/file" }));
  assert.throws(() => contracts.parseInput("gallery", { media_id: 32, kind: "video" }));
  assert.throws(() => contracts.parseInput("submit", { status: "pending" }));
  for (const id of ["0", "01", "1e2", "1/2", "-1", "9007199254740992", "%31"]) assert.throws(() => contracts.parseMediaId(id));
  assert.equal(contracts.parseMediaId("32"), 32);
});
