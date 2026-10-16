import {
  assertWordPressServerOnly,
  getWordPressGraphqlEndpoint,
} from "./config.ts";
import {
  isWordPressGraphqlResponse,
  type WordPressGraphqlError,
} from "./contracts.ts";
import { WordPressApiError } from "./errors.ts";
import {
  DEFAULT_WORDPRESS_TIMEOUT_MS,
  type WordPressFetch,
  type WordPressRequestOptions,
} from "./rest-client.ts";

export type WordPressGraphqlVariables = Record<string, unknown>;

export type WordPressGraphqlRequestOptions = Omit<
  WordPressRequestOptions,
  "body" | "method"
>;

type WordPressResponseLike = Response & {
  json?: () => Promise<unknown>;
  text?: () => Promise<string>;
};

function invalidRequestError(code: string, message: string): WordPressApiError {
  return new WordPressApiError({ status: 400, code, message });
}

function resolveToken(
  options: WordPressGraphqlRequestOptions,
): string | undefined {
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

function resolveTimeout(options: WordPressGraphqlRequestOptions): number {
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

function getFetchImplementation(
  options: WordPressGraphqlRequestOptions,
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

function graphqlErrorToApiError(
  errors: WordPressGraphqlError[],
  status: number,
  token: string | undefined,
): WordPressApiError {
  const code = errors.find(
    (error) =>
      typeof error.extensions?.code === "string" &&
      error.extensions.code.trim().length > 0,
  )?.extensions?.code;
  const message = errors.map((error) => error.message).join("؛ ");

  return new WordPressApiError({
    status,
    code: typeof code === "string" ? code : "graphql_error",
    message,
    data: errors.length === 1 ? errors[0] : errors,
    sensitiveValues: token ? [token] : [],
  });
}

function httpError(status: number, token: string | undefined): WordPressApiError {
  return new WordPressApiError({
    status,
    code: "http_error",
    message: "درخواست GraphQL وردپرس با خطا روبه‌رو شد.",
    sensitiveValues: token ? [token] : [],
  });
}

function invalidJsonError(status: number, token: string | undefined): WordPressApiError {
  return new WordPressApiError({
    status,
    code: "invalid_json",
    message: "پاسخ GraphQL وردپرس JSON معتبر نیست.",
    sensitiveValues: token ? [token] : [],
  });
}

function invalidResponseError(
  status: number,
  token: string | undefined,
): WordPressApiError {
  return new WordPressApiError({
    status,
    code: "invalid_graphql_response",
    message: "ساختار پاسخ GraphQL وردپرس معتبر نیست.",
    sensitiveValues: token ? [token] : [],
  });
}

function timeoutError(token: string | undefined): WordPressApiError {
  return new WordPressApiError({
    status: 408,
    code: "timeout",
    message: "مهلت درخواست GraphQL وردپرس به پایان رسید.",
    sensitiveValues: token ? [token] : [],
  });
}

function abortedError(token: string | undefined): WordPressApiError {
  return new WordPressApiError({
    status: 499,
    code: "aborted",
    message: "درخواست GraphQL وردپرس لغو شد.",
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

export async function wordpressGraphql<
  TData = unknown,
  TVariables extends WordPressGraphqlVariables = WordPressGraphqlVariables,
>(
  query: string,
  variables: TVariables = {} as TVariables,
  options: WordPressGraphqlRequestOptions = {},
): Promise<TData> {
  assertWordPressServerOnly();

  if (typeof query !== "string" || query.trim().length === 0) {
    throw invalidRequestError("invalid_query", "پرس‌وجوی GraphQL معتبر نیست.");
  }

  if (
    variables === null ||
    typeof variables !== "object" ||
    Array.isArray(variables)
  ) {
    throw invalidRequestError(
      "invalid_variables",
      "متغیرهای GraphQL باید یک شیء باشند.",
    );
  }

  const token = resolveToken(options);
  const timeoutMs = resolveTimeout(options);
  const fetchImplementation = getFetchImplementation(options);
  let body: string | undefined;
  try {
    body = JSON.stringify({ query, variables });
  } catch {
    throw invalidRequestError(
      "invalid_variables",
      "بدنه GraphQL قابل پردازش نیست.",
    );
  }

  if (body === undefined) {
    throw invalidRequestError(
      "invalid_variables",
      "بدنه GraphQL قابل پردازش نیست.",
    );
  }

  const endpoint = getWordPressGraphqlEndpoint();

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const requestSignal = createRequestSignal(timeoutMs, options.signal);
  const init: RequestInit = {
    method: "POST",
    headers,
    body,
    cache: "no-store",
    signal: requestSignal.signal,
  };

  try {
    const response = (await fetchImplementation(endpoint, init)) as WordPressResponseLike;
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
      if (isWordPressGraphqlResponse(payload) && payload.errors?.length) {
        throw graphqlErrorToApiError(payload.errors, status, token);
      }
      throw httpError(status, token);
    }

    if (!isWordPressGraphqlResponse<TData>(payload)) {
      throw invalidResponseError(status, token);
    }

    if (payload.errors && payload.errors.length > 0) {
      throw graphqlErrorToApiError(payload.errors, status, token);
    }

    if (!("data" in payload)) {
      throw invalidResponseError(status, token);
    }

    return payload.data as TData;
  } catch (error) {
    if (requestSignal.didTimeout()) {
      throw timeoutError(token);
    }

    if (options.signal?.aborted) {
      throw abortedError(token);
    }

    if (error instanceof WordPressApiError) {
      throw error;
    }

    throw networkError(token);
  } finally {
    requestSignal.cleanup();
  }
}

export const requestWordPressGraphql = wordpressGraphql;
export const wordpressGraphQL = wordpressGraphql;
