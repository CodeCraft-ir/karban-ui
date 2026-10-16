export interface WordPressSuccessEnvelope<TData = unknown> {
  success: true;
  data: TData;
}

export interface WordPressErrorPayload {
  code: string;
  message: string;
  data?: unknown;
}

export interface WordPressFailureEnvelope {
  success: false;
  error: WordPressErrorPayload;
}

export type WordPressEnvelope<TData = unknown> =
  | WordPressSuccessEnvelope<TData>
  | WordPressFailureEnvelope;

export interface WordPressGraphqlError {
  message: string;
  locations?: unknown;
  path?: unknown;
  extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface WordPressGraphqlResponse<TData = unknown> {
  data?: TData;
  errors?: WordPressGraphqlError[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function isWordPressSuccessEnvelope<TData = unknown>(
  value: unknown,
): value is WordPressSuccessEnvelope<TData> {
  return (
    isRecord(value) &&
    value.success === true &&
    hasOwn(value, "data")
  );
}

export function isWordPressErrorPayload(value: unknown): value is WordPressErrorPayload {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.message === "string"
  );
}

export function isWordPressFailureEnvelope(
  value: unknown,
): value is WordPressFailureEnvelope {
  return (
    isRecord(value) &&
    value.success === false &&
    isWordPressErrorPayload(value.error)
  );
}

export function isWordPressEnvelope<TData = unknown>(
  value: unknown,
): value is WordPressEnvelope<TData> {
  return isWordPressSuccessEnvelope<TData>(value) || isWordPressFailureEnvelope(value);
}

export function isWordPressGraphqlError(value: unknown): value is WordPressGraphqlError {
  return isRecord(value) && typeof value.message === "string";
}

export function isWordPressGraphqlResponse<TData = unknown>(
  value: unknown,
): value is WordPressGraphqlResponse<TData> {
  if (!isRecord(value)) {
    return false;
  }

  const hasData = hasOwn(value, "data");
  const hasErrors = hasOwn(value, "errors");

  if (!hasData && !hasErrors) {
    return false;
  }

  return (
    !hasErrors ||
    (Array.isArray(value.errors) && value.errors.every(isWordPressGraphqlError))
  );
}

// Short aliases keep the runtime guards convenient for internal adapters.
export const isSuccessEnvelope = isWordPressSuccessEnvelope;
export const isFailureEnvelope = isWordPressFailureEnvelope;
export const isGraphqlResponse = isWordPressGraphqlResponse;
