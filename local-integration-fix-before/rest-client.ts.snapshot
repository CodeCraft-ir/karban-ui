import {
  assertWordPressServerOnly,
  getWordPressRestBaseUrl,
} from "./config.ts";
import {
  isWordPressFailureEnvelope,
  isWordPressSuccessEnvelope,
  type WordPressFailureEnvelope,
} from "./contracts.ts";
import { WordPressApiError } from "./errors.ts";

export const DEFAULT_WORDPRESS_TIMEOUT_MS = 10_000;

export type WordPressFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface WordPressRequestOptions<TBody = unknown> {
  method?: string;
  body?: TBody;
  token?: string;
  accessToken?: string;
  authToken?: string;
  authorizationToken?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  fetch?: WordPressFetch;
  fetchImpl?: WordPressFetch;
}

export interface WordPressRestRequest<TBody = unknown>
  extends WordPressRequestOptions<TBody> {
  path: string;
}

type WordPressResponseLike = Response & {
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
};

function invalidRequestError(code: string, message: string): WordPressApiError {
  return new WordPressApiError({ status: 400, code, message });
}

function resolveToken(options: WordPressRequestOptions): string | undefined {
  const token =
    options.token ??
    options.accessToken ??
    options.authToken ??
    options.authorizationToken;

  if (token === undefined || token === "") {
    return undefined;
  }

  if (typeof token !== "string") {
    throw invalidRequestError(
      "invalid_token",
      "توکن احراز هویت باید یک رشته باشد.",
    );
  }

  return token;
}

function resolveTimeout(options: WordPressRequestOptions): number {
  if (options.timeoutMs === undefined) {
    return DEFAULT_WORDPRESS_TIMEOUT_MS;
  }

  if (
    typeof options.timeoutMs !== "number" ||
    !Number.isFinite(options.timeoutMs) ||
    options.timeoutMs <= 0
  ) {
    throw invalidRequestError(
      "invalid_timeout",
      "مهلت درخواست باید یک عدد مثبت باشد.",
    );
  }

  return options.timeoutMs;
}

function normalizeMethod(method: string | undefined): string {
  if (method === undefined) {
    return "GET";
  }

  const normalizedMethod = method.trim().toUpperCase();
  if (!/^[A-Z]+$/.test(normalizedMethod)) {
    throw invalidRequestError("invalid_method", "روش درخواست معتبر نیست.");
  }

  return normalizedMethod;
}

function hasPathTraversal(path: string): boolean {
  if (path.includes("\\")) {
    return true;
  }

  const pathWithoutQuery = path.split(/[?#]/, 1)[0] ?? path;
  let decodedPath = pathWithoutQuery;

  try {
    decodedPath = decodeURIComponent(pathWithoutQuery);
  } catch {
    return true;
  }

  return decodedPath.split("/").some((segment) => segment === "..");
}

function hasReservedRestQuery(searchParams: URLSearchParams): boolean {
  for (const key of searchParams.keys()) {
    // URLSearchParams decodes percent escapes and '+'. PHP then truncates at
    // NUL, skips leading spaces, and normalizes dots/spaces in top-level names.
    const phpKey = (key.split("\0", 1)[0] ?? "")
      .replace(/^ +/, "")
      .replace(/[ .]/g, "_");
    const topLevelKey = phpKey.split("[", 1)[0];

    // Array suffixes still address the reserved root. An unmatched '[' is
    // normalized to '_' by PHP, so `rest[route` also becomes `rest_route`.
    if (
      topLevelKey === "rest_route" ||
      phpKey.replace(/\[/g, "_") === "rest_route"
    ) {
      return true;
    }
  }

  return false;
}

export function buildWordPressRestUrl(path: string, configuredUrl?: string): string {
  if (typeof path !== "string") {
    throw invalidRequestError("invalid_path", "مسیر درخواست معتبر نیست.");
  }

  const trimmedPath = path.trim();
  if (
    trimmedPath.length === 0 ||
    /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(trimmedPath) ||
    hasPathTraversal(trimmedPath) ||
    trimmedPath.includes("#")
  ) {
    if (trimmedPath.length === 0) {
      return getWordPressRestBaseUrl(configuredUrl);
    }

    throw invalidRequestError(
      "invalid_path",
      "مسیر درخواست باید زیرمسیر امن وردپرس باشد.",
    );
  }

  const baseUrl = getWordPressRestBaseUrl(configuredUrl);
  const base = new URL(baseUrl);
  const relativePath = trimmedPath.replace(/^\/+/, "");
  const resolved = new URL(relativePath, base);

  if (
    resolved.origin !== base.origin ||
    !resolved.pathname.startsWith(base.pathname) ||
    hasReservedRestQuery(resolved.searchParams)
  ) {
    throw invalidRequestError(
      "invalid_path",
      "مسیر درخواست باید زیرمسیر امن وردپرس باشد.",
    );
  }

  return resolved.toString();
}

async function readJson(response: WordPressResponseLike): Promise<unknown> {
  if (typeof response.text === "function") {
    const text = await response.text();
    if (text.trim().length === 0) {
      throw new SyntaxError("Empty JSON response");
    }
    return JSON.parse(text) as unknown;
  }

  if (typeof response.json === "function") {
    return response.json();
  }

  throw new SyntaxError("Response has no JSON body reader");
}

function responseStatus(response: WordPressResponseLike): number {
  return Number.isFinite(response.status) ? response.status : 0;
}

function isSuccessfulHttpResponse(response: WordPressResponseLike): boolean {
  if (typeof response.ok === "boolean") {
    return response.ok;
  }

  const status = responseStatus(response);
  return status >= 200 && status < 300;
}

function pluginErrorToApiError(
  envelope: WordPressFailureEnvelope,
  status: number,
  token: string | undefined,
): WordPressApiError {
  return new WordPressApiError({
    status,
    code: envelope.error.code,
    message: envelope.error.message,
    data: envelope.error.data,
    sensitiveValues: token ? [token] : [],
  });
}

function httpError(status: number, token: string | undefined): WordPressApiError {
  return new WordPressApiError({
    status,
    code: "http_error",
    message: "درخواست وردپرس با خطا روبه‌رو شد.",
    sensitiveValues: token ? [token] : [],
  });
}

function invalidJsonError(status: number, token: string | undefined): WordPressApiError {
  return new WordPressApiError({
    status,
    code: "invalid_json",
    message: "پاسخ وردپرس JSON معتبر نیست.",
    sensitiveValues: token ? [token] : [],
  });
}

function invalidEnvelopeError(
  status: number,
  token: string | undefined,
): WordPressApiError {
  return new WordPressApiError({
    status,
    code: "invalid_envelope",
    message: "ساختار پاسخ وردپرس معتبر نیست.",
    sensitiveValues: token ? [token] : [],
  });
}

function timeoutError(status: number, token: string | undefined): WordPressApiError {
  return new WordPressApiError({
    status,
    code: "timeout",
    message: "مهلت درخواست وردپرس به پایان رسید.",
    sensitiveValues: token ? [token] : [],
  });
}

function abortedError(status: number, token: string | undefined): WordPressApiError {
  return new WordPressApiError({
    status,
    code: "aborted",
    message: "درخواست وردپرس لغو شد.",
    sensitiveValues: token ? [token] : [],
  });
}

function networkError(token: string | undefined): WordPressApiError {
  return new WordPressApiError({
    status: 0,
    code: "network_error",
    message: "ارتباط با وردپرس برقرار نشد.",
    sensitiveValues: token ? [token] : [],
  });
}

function getFetchImplementation(
  options: WordPressRequestOptions,
): WordPressFetch {
  const fetchImplementation = options.fetch ?? options.fetchImpl;
  if (fetchImplementation) {
    return fetchImplementation;
  }

  if (typeof globalThis.fetch === "function") {
    return globalThis.fetch.bind(globalThis) as WordPressFetch;
  }

  throw new WordPressApiError({
    status: 0,
    code: "fetch_unavailable",
    message: "امکان ارسال درخواست وردپرس وجود ندارد.",
  });
}

interface RequestSignal {
  signal: AbortSignal;
  didTimeout: () => boolean;
  cleanup: () => void;
}

function createRequestSignal(
  timeoutMs: number,
  callerSignal: AbortSignal | undefined,
): RequestSignal {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const onCallerAbort = () => controller.abort(callerSignal?.reason);
  if (callerSignal) {
    if (callerSignal.aborted) {
      onCallerAbort();
    } else {
      callerSignal.addEventListener("abort", onCallerAbort, { once: true });
    }
  }

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timeoutId);
      callerSignal?.removeEventListener("abort", onCallerAbort);
    },
  };
}

function normalizeRestArguments<TBody>(
  pathOrRequest: string | WordPressRestRequest<TBody>,
  options: WordPressRequestOptions<TBody> | undefined,
): { path: string; options: WordPressRequestOptions<TBody> } {
  if (typeof pathOrRequest === "string") {
    return { path: pathOrRequest, options: options ?? {} };
  }

  if (
    pathOrRequest !== null &&
    typeof pathOrRequest === "object" &&
    typeof pathOrRequest.path === "string"
  ) {
    return { path: pathOrRequest.path, options: pathOrRequest };
  }

  throw invalidRequestError("invalid_path", "مسیر درخواست معتبر نیست.");
}

export async function wordpressRest<TData = unknown, TBody = unknown>(
  pathOrRequest: string | WordPressRestRequest<TBody>,
  options?: WordPressRequestOptions<TBody>,
): Promise<TData> {
  assertWordPressServerOnly();

  const request = normalizeRestArguments(pathOrRequest, options);
  const token = resolveToken(request.options);
  const timeoutMs = resolveTimeout(request.options);
  const method = normalizeMethod(request.options.method);
  const url = buildWordPressRestUrl(request.path);
  const fetchImplementation = getFetchImplementation(request.options);
  const hasBody = request.options.body !== undefined;

  let body: string | undefined;
  if (hasBody) {
    try {
      body = JSON.stringify(request.options.body);
    } catch {
      throw invalidRequestError("invalid_body", "بدنه درخواست قابل پردازش نیست.");
    }

    if (body === undefined) {
      throw invalidRequestError("invalid_body", "بدنه درخواست قابل پردازش نیست.");
    }
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const requestSignal = createRequestSignal(timeoutMs, request.options.signal);
  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
    signal: requestSignal.signal,
  };
  if (hasBody) {
    init.body = body;
  }

  try {
    const response = (await fetchImplementation(url, init)) as WordPressResponseLike;
    const status = responseStatus(response);
    let payload: unknown;

    try {
      payload = await readJson(response);
    } catch (error) {
      // Body consumption can reject after headers when the request is aborted.
      // Preserve that cause for the shared cancellation mapping below.
      if (requestSignal.signal.aborted) {
        throw error;
      }
      throw invalidJsonError(status, token);
    }

    if (!isSuccessfulHttpResponse(response)) {
      if (isWordPressFailureEnvelope(payload)) {
        throw pluginErrorToApiError(payload, status, token);
      }
      throw httpError(status, token);
    }

    if (isWordPressFailureEnvelope(payload)) {
      throw pluginErrorToApiError(payload, status, token);
    }

    if (!isWordPressSuccessEnvelope<TData>(payload)) {
      throw invalidEnvelopeError(status, token);
    }

    return payload.data;
  } catch (error) {
    if (requestSignal.didTimeout()) {
      throw timeoutError(408, token);
    }

    if (request.options.signal?.aborted) {
      throw abortedError(499, token);
    }

    if (error instanceof WordPressApiError) {
      throw error;
    }

    throw networkError(token);
  } finally {
    requestSignal.cleanup();
  }
}

export const requestWordPressRest = wordpressRest;
export const wordpressRestRequest = wordpressRest;
export const fetchWordPressRest = wordpressRest;
