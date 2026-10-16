import type {
  PublicSpecialistSearchInput,
  PublicSpecialistSearchParams,
} from "./contracts/specialists.ts";
import { PublicDataContractError } from "./specialist-adapters.ts";

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 30;
const MAX_QUERY_LENGTH = 200;
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function firstScalar(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function translateDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const index = PERSIAN_DIGITS.indexOf(digit);
    return String(index >= 0 ? index : ARABIC_DIGITS.indexOf(digit));
  });
}

function boundedText(value: string | undefined, maximum: number): string {
  if (typeof value !== "string" || CONTROL_CHARACTERS.test(value)) return "";
  return value.trim().slice(0, maximum);
}

function pageValue(value: string | undefined, fallback: number): number {
  const text = translateDigits(value ?? "").trim();
  if (!/^\d+$/.test(text)) return fallback;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function parseSpecialistSearchParams(input: PublicSpecialistSearchInput): PublicSpecialistSearchParams {
  const perPage = pageValue(firstScalar(input.per_page), DEFAULT_PER_PAGE);
  return {
    q: boundedText(firstScalar(input.q), MAX_QUERY_LENGTH),
    category: boundedText(firstScalar(input.category), MAX_QUERY_LENGTH),
    city: boundedText(firstScalar(input.city), MAX_QUERY_LENGTH),
    verified: ["1", "true"].includes(firstScalar(input.verified)?.trim().toLowerCase() ?? ""),
    page: pageValue(firstScalar(input.page), 1),
    perPage: Math.min(Math.max(perPage, 1), MAX_PER_PAGE),
  };
}

export function buildSpecialistSearchQuery(params: PublicSpecialistSearchParams): string {
  const query = new URLSearchParams();
  if (params.q) query.set("q", params.q);
  if (params.category) query.set("category", params.category);
  if (params.city) query.set("city", params.city);
  if (params.verified) query.set("verified", "1");
  query.set("page", String(params.page));
  query.set("per_page", String(params.perPage));
  return query.toString();
}

export function buildSpecialistPaginationQuery(
  params: PublicSpecialistSearchParams,
  page: number,
  changedFilters?: Partial<Pick<PublicSpecialistSearchParams, "q" | "category" | "city" | "verified" | "perPage">>,
): string {
  const filtersChanged = changedFilters !== undefined;
  const next = { ...params, ...changedFilters, page: filtersChanged ? 1 : page };
  return buildSpecialistSearchQuery({
    ...next,
    page: Number.isSafeInteger(next.page) && next.page > 0 ? next.page : 1,
    perPage: Math.min(Math.max(next.perPage, 1), MAX_PER_PAGE),
  });
}

export function buildSpecialistDetailPath(slug: string): string {
  if (
    typeof slug !== "string" || slug.trim().length === 0 || CONTROL_CHARACTERS.test(slug) ||
    /[\\/?#]/.test(slug) || slug.includes("..")
  ) {
    throw new PublicDataContractError("شناسهٔ عمومی متخصص معتبر نیست.");
  }
  return `specialists/${encodeURIComponent(slug.trim())}`;
}

export const DEFAULT_SPECIALIST_PER_PAGE = DEFAULT_PER_PAGE;
