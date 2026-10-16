import {
  parseSpecialistCard,
  parseSpecialistDetail,
  PublicDataContractError,
} from "../../lib/specialist-adapters.ts";
import {
  buildSpecialistDetailPath,
  buildSpecialistSearchQuery,
  parseSpecialistSearchParams,
} from "../../lib/specialist-search.ts";
import type {
  PublicSpecialistCatalog,
  PublicSpecialistDetail,
  PublicSpecialistSearchInput,
} from "../../lib/contracts/specialists.ts";
import { WordPressApiError } from "./errors.ts";
import { wordpressRest } from "./rest-client.ts";

export type PublicSpecialistRequest = (path: string) => Promise<unknown>;

export interface PublicSpecialistsOptions {
  request?: PublicSpecialistRequest;
}

function requestBoundary(options: PublicSpecialistsOptions): PublicSpecialistRequest {
  return options.request ?? ((path) => wordpressRest(path));
}

function requiredSafeInteger(value: unknown, field: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new PublicDataContractError(`صفحه‌بندی عمومی ${field} معتبر نیست.`);
  }
  return value as number;
}

function parseCatalog(value: unknown): PublicSpecialistCatalog {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new PublicDataContractError("فهرست عمومی متخصصان معتبر نیست.");
  }
  const catalog = value as Record<string, unknown>;
  if (!Array.isArray(catalog.items)) {
    throw new PublicDataContractError("فهرست عمومی متخصصان معتبر نیست.");
  }
  const page = requiredSafeInteger(catalog.page, "page", 1);
  const total = requiredSafeInteger(catalog.total, "total");
  const pages = requiredSafeInteger(catalog.pages, "pages");
  if ((total === 0 && pages !== 0) || (total > 0 && (pages < 1 || page > pages))) {
    throw new PublicDataContractError("صفحه‌بندی عمومی متخصصان معتبر نیست.");
  }
  return { items: catalog.items.map(parseSpecialistCard), page, total, pages };
}

export async function loadPublicSpecialists(
  input: PublicSpecialistSearchInput = {},
  options: PublicSpecialistsOptions = {},
): Promise<PublicSpecialistCatalog> {
  const query = buildSpecialistSearchQuery(parseSpecialistSearchParams(input));
  const payload = await requestBoundary(options)(`specialists?${query}`);
  return parseCatalog(payload);
}

export async function loadPublicSpecialistDetail(
  slug: string,
  options: PublicSpecialistsOptions = {},
): Promise<PublicSpecialistDetail> {
  const payload = await requestBoundary(options)(buildSpecialistDetailPath(slug));
  return parseSpecialistDetail(payload);
}

/** Helps UI callers distinguish a true public 404 from upstream failure. */
export function isPublicSpecialistNotFound(error: unknown): error is WordPressApiError {
  return error instanceof WordPressApiError && error.status === 404 && error.code === "not_found";
}
