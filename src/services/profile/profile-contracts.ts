import type { RegistrationRole } from "../../lib/contracts/auth.ts";

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MULTIPART_OVERHEAD_BYTES = 256 * 1024;
export const MAX_PROFILE_JSON_BYTES = 16 * 1024;
export const IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export type PublicMediaPurpose = "public-avatar" | "public-portfolio";
export type ProfileStatus = "draft" | "pending" | "publish";
export interface TaxonomyRef { id: number; name: string; slug: string; }
export interface ImageRef { id: number; url: string; type: "image"; }
export interface GalleryItem extends ImageRef { caption: string; }
export interface AccountDto {
  id: number; displayName: string; role: RegistrationRole; loginPhoneMasked: string | null;
  avatar: ImageRef | null; location: TaxonomyRef | null;
  specialist: { id: number; slug: string; status: ProfileStatus } | null;
}
export interface GalleryDto { gallery: GalleryItem[]; galleryRevision: number | null; galleryAvailable: boolean; status: ProfileStatus; }
export interface ProfileDto extends GalleryDto {
  id: number; slug: string; title: string; categories: TaxonomyRef[]; cities: TaxonomyRef[];
  avatar: ImageRef | null; bio: string; skills: string; address: string;
  availability: "available" | "busy" | "away" | ""; priceHint: string; experienceYears: number | null; verified?: boolean;
}
export interface UploadDto extends ImageRef { mime: typeof IMAGE_MIMES[number]; purpose: PublicMediaPurpose; }
export interface MediaCapabilitiesDto {
  purposes: PublicMediaPurpose[]; imageMimes: Array<typeof IMAGE_MIMES[number]>; maxBytes: number;
  maxDimension: number; maxPixels: number; maxFiles: 1; maxGalleryItems: number;
  video: { enabled: false; reason: "video_unsupported" }; imageDecoderRequired: true;
}
export class ProfileBoundaryError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code = "invalid_request", status = 422) {
    super("درخواست قابل انجام نیست. وضعیت را دوباره بارگذاری کنید.");
    this.name = "ProfileBoundaryError"; this.code = code; this.status = status;
  }
}
function invalid(): never { throw new ProfileBoundaryError(); }
export function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return invalid();
  return value as Record<string, unknown>;
}
export function integer(value: unknown, min = 1, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) return invalid();
  return value;
}
function text(value: unknown, max: number, nonempty = false): string {
  if (typeof value !== "string" || [...value].length > max || (nonempty && !value.trim()) || /[<>\p{Cc}\p{Cs}]/u.test(value)) return invalid();
  return value;
}
function multiline(value: unknown, max: number): string { return text(value, max); }
function slug(value: unknown): string {
  const result = text(value, 200, true);
  if (!/^(?:[a-zA-Z0-9_\-]|%[a-fA-F0-9]{2}|[\p{L}\p{N}])+$/u.test(result)) return invalid();
  return result;
}
function status(value: unknown): ProfileStatus {
  if (value !== "draft" && value !== "pending" && value !== "publish") return invalid();
  return value;
}
function role(value: unknown): RegistrationRole {
  if (value !== "client" && value !== "specialist") return invalid();
  return value;
}
export function purpose(value: unknown): PublicMediaPurpose {
  if (value !== "public-avatar" && value !== "public-portfolio") return invalid();
  return value;
}
function mime(value: unknown): typeof IMAGE_MIMES[number] {
  if (!IMAGE_MIMES.includes(value as typeof IMAGE_MIMES[number])) return invalid();
  return value as typeof IMAGE_MIMES[number];
}
function safeUrl(value: unknown): string {
  const result = text(value, 2048, true);
  if (/[\s\\]/u.test(result)) return invalid();
  let url: URL; try { url = new URL(result); } catch { return invalid(); }
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname || url.username || url.password || url.hash) return invalid();
  return result;
}
function image(value: unknown): ImageRef {
  const v = object(value);
  if (v.type !== "image") return invalid();
  return { id: integer(v.id), url: safeUrl(v.url), type: "image" };
}
function taxonomy(value: unknown): TaxonomyRef {
  const v = object(value); return { id: integer(v.id), name: text(v.name, 200, true), slug: slug(v.slug) };
}
function list<T extends { id: number }>(value: unknown, max: number, parse: (v: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > max) return invalid();
  const result = value.map(parse);
  if (new Set(result.map(v => v.id)).size !== result.length) return invalid();
  return result;
}
function nullable<T>(value: unknown, parse: (v: unknown) => T): T | null { return value === null ? null : parse(value); }
function boolean(value: unknown): boolean { if (typeof value !== "boolean") return invalid(); return value; }
export function parseAccount(value: unknown): AccountDto {
  const v = object(value); const masked = nullable(v.login_phone_masked, x => text(x, 16, true));
  if (masked !== null && !/^09\*{5}\d{4}$/u.test(masked)) return invalid();
  return {
    id: integer(v.id), displayName: text(v.display_name, 160), role: role(v.role), loginPhoneMasked: masked,
    avatar: nullable(v.avatar, image), location: nullable(v.location, taxonomy),
    specialist: nullable(v.specialist, raw => { const s = object(raw); return { id: integer(s.id), slug: slug(s.slug), status: status(s.status) }; }),
  };
}
export function parseGallery(value: unknown): GalleryDto {
  const v = object(value);
  const galleryAvailable = boolean(v.gallery_available);
  const galleryRevision = nullable(v.gallery_revision, x => integer(x, 0));
  if (galleryAvailable && galleryRevision === null) return invalid();
  return {
    gallery: list(v.gallery, 20, raw => { const i = object(raw); return { ...image(i), caption: multiline(i.caption, 300) }; }),
    galleryRevision, galleryAvailable, status: status(v.status),
  };
}
export function parseProfile(value: unknown): ProfileDto {
  const v = object(value); const availability = v.availability;
  if (availability !== "" && availability !== "available" && availability !== "busy" && availability !== "away") return invalid();
  return {
    ...parseGallery(v), id: integer(v.id), slug: slug(v.slug), title: text(v.title, 160),
    categories: list(v.categories, 10, taxonomy), cities: list(v.cities, 1, taxonomy), avatar: nullable(v.avatar, image),
    bio: multiline(v.bio, 4000), skills: multiline(v.skills, 1000), address: multiline(v.address, 500), availability,
    priceHint: multiline(v.price_hint, 200), experienceYears: nullable(v.experience_years, x => integer(x, 0, 80)),
    ...(Object.hasOwn(v, "verified") ? { verified: boolean(v.verified) } : {}),
  };
}
export function parseUpload(value: unknown): UploadDto {
  const v = object(value); return { ...image(v), mime: mime(v.mime), purpose: purpose(v.purpose) };
}
export function parseCapabilities(value: unknown): MediaCapabilitiesDto {
  const v = object(value); const video = object(v.video);
  if (!Array.isArray(v.purposes) || v.purposes.length < 1 || v.purposes.length > 2 ||
    !Array.isArray(v.image_mimes) || v.image_mimes.length < 1 || v.image_mimes.length > 4 ||
    v.max_files !== 1 || v.image_decoder_required !== true || video.enabled !== false || video.reason !== "video_unsupported") return invalid();
  const purposes = v.purposes.map(purpose); const imageMimes = v.image_mimes.map(mime);
  if (new Set(purposes).size !== purposes.length || new Set(imageMimes).size !== imageMimes.length) return invalid();
  return { purposes, imageMimes, maxBytes: integer(v.max_bytes, 1, MAX_FILE_BYTES), maxDimension: integer(v.max_dimension, 1, 8192),
    maxPixels: integer(v.max_pixels, 1, 24_000_000), maxFiles: 1, maxGalleryItems: integer(v.max_gallery_items, 1, 20),
    video: { enabled: false, reason: "video_unsupported" }, imageDecoderRequired: true };
}

export type InputKind = "account" | "profile" | "submit" | "gallery" | "delete";
const allowed: Record<InputKind, readonly string[]> = {
  account: ["display_name", "account_city_id", "avatar_id"],
  profile: ["title", "bio", "skills", "category_ids", "city_id", "availability", "experience_years", "price_hint", "address", "avatar_id"],
  submit: [], gallery: ["media_id", "caption", "kind", "expected_revision"], delete: ["expected_revision"],
};
/** Output uses the backend's fixed field names. No caller-selected authority or URL. */
export function parseInput(kind: InputKind, value: unknown): Record<string, unknown> {
  const v = object(value); const out: Record<string, unknown> = {};
  for (const key of Object.keys(v)) {
    if (!allowed[kind].includes(key)) return invalid();
    const x = v[key];
    switch (key) {
      case "display_name": out[key] = text(x, 100, true); break;
      case "title": out[key] = text(x, 160, true); break;
      case "bio": out[key] = multiline(x, 4000); break;
      case "skills": out[key] = multiline(x, 1000); break;
      case "price_hint": out[key] = multiline(x, 200); break;
      case "address": out[key] = multiline(x, 500); break;
      case "caption": out[key] = multiline(x, 300); break;
      case "avatar_id": case "account_city_id": case "city_id": out[key] = nullable(x, integer); break;
      case "media_id": out[key] = integer(x); break;
      case "expected_revision": out[key] = integer(x, 0); break;
      case "experience_years": out[key] = nullable(x, y => integer(y, 0, 80)); break;
      case "category_ids": {
        if (!Array.isArray(x) || x.length > 10) return invalid();
        const ids = x.map(y => integer(y)); if (new Set(ids).size !== ids.length) return invalid(); out[key] = ids; break;
      }
      case "availability": if (!["", "available", "busy", "away"].includes(x as string)) return invalid(); out[key] = x; break;
      case "kind": if (x !== "image") return invalid(); out[key] = "image"; break;
    }
  }
  if (kind === "gallery" && !Object.hasOwn(out, "media_id")) return invalid();
  return out;
}
export function parseMediaId(value: string): number {
  if (!/^[1-9]\d{0,15}$/u.test(value)) return invalid();
  return integer(Number(value));
}
