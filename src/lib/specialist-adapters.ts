import type {
  PublicSpecialistCard,
  PublicSpecialistDetail,
  PublicSpecialistAvailability,
} from "./contracts/specialists.ts";
import { WordPressApiError } from "../services/wordpress/errors.ts";

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;
const PHONE_DIGITS = /[\s().-]/g;
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export class PublicDataContractError extends WordPressApiError {
  constructor(message = "ساختار دادهٔ عمومی متخصص معتبر نیست.") {
    super({ status: 502, code: "invalid_public_contract", message });
    this.name = "PublicDataContractError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0 || CONTROL_CHARACTERS.test(value)) {
    throw new PublicDataContractError(`فیلد عمومی ${field} معتبر نیست.`);
  }
  return value.trim();
}

function requiredSafeInteger(value: unknown, field: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new PublicDataContractError(`فیلد عمومی ${field} معتبر نیست.`);
  }
  return value as number;
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new PublicDataContractError(`فیلد عمومی ${field} معتبر نیست.`);
  }
  return value;
}

function requiredStrings(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || CONTROL_CHARACTERS.test(item))) {
    throw new PublicDataContractError(`فهرست عمومی ${field} معتبر نیست.`);
  }
  return value.map((item) => item.trim()).filter(Boolean);
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && !CONTROL_CHARACTERS.test(text) ? text : null;
}

function optionalPositiveInteger(value: unknown): number | null {
  return Number.isSafeInteger(value) && (value as number) > 0 ? (value as number) : null;
}

function optionalFiniteCoordinate(value: unknown, maximum: number): number | null {
  return typeof value === "number" && Number.isFinite(value) && value !== 0 && Math.abs(value) <= maximum
    ? value
    : null;
}

export function normalizePublicUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0 || CONTROL_CHARACTERS.test(value)) return null;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function translatedDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = PERSIAN_DIGITS.indexOf(digit);
    return String(persian >= 0 ? persian : ARABIC_DIGITS.indexOf(digit));
  });
}

/** Accepts only an ordinary dialing string from the published `phone_display` field. */
export function normalizePublicPhone(value: unknown): string | null {
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) return null;
  const normalized = translatedDigits(value.trim());
  if (/[^\d+\s().-]/.test(normalized) || normalized.includes("+") && !normalized.startsWith("+")) return null;
  const compact = normalized.replace(PHONE_DIGITS, "");
  if (!/^\+?\d{7,15}$/.test(compact)) return null;
  return compact;
}

function availability(value: unknown): PublicSpecialistAvailability {
  return value === "available" || value === "busy" || value === "away" ? value : "unknown";
}

function rating(average: unknown, count: unknown): PublicSpecialistCard["rating"] {
  if (
    typeof average !== "number" || !Number.isFinite(average) || average < 0 || average > 5 ||
    !Number.isSafeInteger(count) || (count as number) <= 0
  ) return null;
  return { average, count: count as number };
}

export function parseSpecialistCard(value: unknown): PublicSpecialistCard {
  if (!isRecord(value)) throw new PublicDataContractError();
  return {
    id: requiredSafeInteger(value.id, "id", 1),
    slug: requiredString(value.slug, "slug"),
    title: requiredString(value.title, "title"),
    verified: requiredBoolean(value.is_verified, "is_verified"),
    rating: rating(value.rating_avg, value.rating_count),
    avatarUrl: normalizePublicUrl(value.avatar_url),
    availability: availability(value.availability),
    categories: requiredStrings(value.categories, "categories"),
    cities: requiredStrings(value.cities, "cities"),
  };
}

function publicGallery(value:unknown):PublicSpecialistDetail['gallery'] {
  if(!Array.isArray(value)||value.length>20) return 'unavailable';
  if(!value.length) return 'empty';
  const seen=new Set<number>();
  const items=[];
  for(const raw of value){
    if(!isRecord(raw) || !Number.isSafeInteger(raw.id) || (raw.id as number)<1 || seen.has(raw.id as number) || raw.type!=='image' || typeof raw.url!=='string' || raw.url.length>2048 || /[\s\\\p{Cc}]/u.test(raw.url) || typeof raw.caption!=='string' || [...raw.caption].length>300 || /[<>\p{Cc}\p{Cs}]/u.test(raw.caption)) return 'unavailable';
    let url:URL;try{url=new URL(raw.url);}catch{return 'unavailable';}
    if(!['http:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password||url.hash)return 'unavailable';
    seen.add(raw.id as number);items.push({id:raw.id as number,url:raw.url,type:'image' as const,caption:raw.caption});
  }
  return items;
}

export function parseSpecialistDetail(value: unknown): PublicSpecialistDetail {
  if (!isRecord(value)) throw new PublicDataContractError();
  const card = parseSpecialistCard(value);
  const lat = optionalFiniteCoordinate(value.lat, 90);
  const lng = optionalFiniteCoordinate(value.lng, 180);
  return {
    ...card,
    description: optionalText(value.description),
    bio: optionalText(value.bio),
    skills: optionalText(value.skills),
    experienceYears: optionalPositiveInteger(value.experience_years),
    responseMinutes: optionalPositiveInteger(value.response_minutes),
    priceHint: optionalText(value.price_hint),
    address: optionalText(value.address),
    phoneDisplay: normalizePublicPhone(value.phone_display),
    coordinates: lat !== null && lng !== null ? { lat, lng } : null,
    verifiedAt: optionalText(value.verified_at),
    gallery: publicGallery(value.gallery),
    reviews: "unavailable",
  };
}
