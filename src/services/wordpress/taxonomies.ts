import type { PublicTaxonomy, PublicTerm } from "../../lib/contracts/specialists.ts";
import { getWordPressOrigin } from "./config.ts";
import { WordPressApiError } from "./errors.ts";
import type { WordPressFetch } from "./rest-client.ts";

const TERM_PATHS: Readonly<Record<PublicTaxonomy, string>> = {
  job_category: "job_category",
  city: "city",
  neighborhood: "neighborhood",
};
const CORE_TERMS_TIMEOUT_MS = 10_000;
const MAX_TERM_PAGES = 100;

export interface PublicTermsOptions {
  fetch?: WordPressFetch;
  timeoutMs?: number;
}

function contractError(message = "ساختار دادهٔ عمومی دسته‌بندی معتبر نیست."): WordPressApiError {
  return new WordPressApiError({ status: 502, code: "invalid_public_contract", message });
}

function isTaxonomy(value: string): value is PublicTaxonomy {
  return Object.prototype.hasOwnProperty.call(TERM_PATHS, value);
}

function fetchImplementation(options: PublicTermsOptions): WordPressFetch {
  if (options.fetch) return options.fetch;
  if (typeof globalThis.fetch === "function") return globalThis.fetch.bind(globalThis) as WordPressFetch;
  throw new WordPressApiError({ status: 0, code: "fetch_unavailable", message: "امکان ارسال درخواست وردپرس وجود ندارد." });
}

function termUrl(taxonomy: PublicTaxonomy, page: number): string {
  const origin = getWordPressOrigin();
  const query = new URLSearchParams({ per_page: "100", page: String(page), _fields: "id,name,slug,count,parent" });
  return `${origin}/wp-json/wp/v2/${TERM_PATHS[taxonomy]}?${query.toString()}`;
}

function pageTotal(response: Response): number {
  const header = response.headers.get("x-wp-totalpages");
  if (!header || !/^\d+$/.test(header)) throw contractError("صفحه‌بندی دسته‌بندی معتبر نیست.");
  const pages = Number(header);
  if (!Number.isSafeInteger(pages) || pages < 1 || pages > MAX_TERM_PAGES) throw contractError("صفحه‌بندی دسته‌بندی معتبر نیست.");
  return pages;
}

function parseTerm(value: unknown, taxonomy: PublicTaxonomy): PublicTerm {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw contractError();
  const term = value as Record<string, unknown>;
  if (!Number.isSafeInteger(term.id) || (term.id as number) < 1 || typeof term.name !== "string" || !term.name.trim() || typeof term.slug !== "string" || !term.slug.trim() || !Number.isSafeInteger(term.count) || (term.count as number) < 0) throw contractError();
  if (taxonomy === "job_category") {
    if (!Number.isSafeInteger(term.parent) || (term.parent as number) < 0) throw contractError();
    return { id: term.id as number, name: term.name.trim(), slug: term.slug.trim(), count: term.count as number, parent: term.parent as number };
  }
  return { id: term.id as number, name: term.name.trim(), slug: term.slug.trim(), count: term.count as number };
}

async function fetchPage(taxonomy: PublicTaxonomy, page: number, fetcher: WordPressFetch, timeoutMs: number): Promise<{ terms: PublicTerm[]; pages: number }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetcher(termUrl(taxonomy, page), { method: "GET", headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal });
    } catch {
      throw new WordPressApiError({ status: controller.signal.aborted ? 408 : 0, code: controller.signal.aborted ? "timeout" : "network_error", message: controller.signal.aborted ? "مهلت درخواست وردپرس به پایان رسید." : "ارتباط با وردپرس برقرار نشد." });
    }
    if (!response.ok) throw new WordPressApiError({ status: response.status, code: "http_error", message: "درخواست وردپرس با خطا روبه‌رو شد." });
    const pages = pageTotal(response);
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      if (controller.signal.aborted) {
        throw new WordPressApiError({ status: 408, code: "timeout", message: "مهلت درخواست وردپرس به پایان رسید." });
      }
      throw new WordPressApiError({ status: response.status, code: "invalid_json", message: "پاسخ وردپرس JSON معتبر نیست." });
    }
    if (!Array.isArray(payload)) throw contractError();
    return { terms: payload.map((item) => parseTerm(item, taxonomy)), pages };
  } finally { clearTimeout(timeout); }
}

export async function loadPublicTerms(taxonomy: PublicTaxonomy, options: PublicTermsOptions = {}): Promise<PublicTerm[]> {
  if (!isTaxonomy(taxonomy)) throw new WordPressApiError({ status: 400, code: "invalid_taxonomy", message: "دسته‌بندی عمومی معتبر نیست." });
  const timeoutMs = options.timeoutMs ?? CORE_TERMS_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new WordPressApiError({ status: 400, code: "invalid_timeout", message: "مهلت درخواست باید یک عدد مثبت باشد." });
  const fetcher = fetchImplementation(options);
  const first = await fetchPage(taxonomy, 1, fetcher, timeoutMs);
  const remaining = Array.from({ length: first.pages - 1 }, (_, index) => index + 2);
  const later: PublicTerm[][] = [];
  for (let index = 0; index < remaining.length; index += 4) {
    const batch = await Promise.all(remaining.slice(index, index + 4).map(async (page) => (await fetchPage(taxonomy, page, fetcher, timeoutMs)).terms));
    later.push(...batch);
  }
  const deduplicated = new Map<number, PublicTerm>();
  for (const term of [first.terms, ...later].flat()) deduplicated.set(term.id, term);
  return [...deduplicated.values()];
}

export const PUBLIC_TAXONOMIES = Object.freeze(Object.keys(TERM_PATHS) as PublicTaxonomy[]);
export const PUBLIC_TERM_PAGE_LIMIT = MAX_TERM_PAGES;
