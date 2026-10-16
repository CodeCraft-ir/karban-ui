const SENSITIVE_KEY_PATTERN =
  /(authorization|access[_-]?token|refresh[_-]?token|id[_-]?token|token|secret|password|cookie|credential|api[_-]?key)/i;
const BEARER_PATTERN = /\bBearer\s+[^\s,;]+/gi;
const JWT_KEY_PATTERN = /eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/;

export type SafeWordPressErrorData =
  | null
  | boolean
  | number
  | string
  | SafeWordPressErrorData[]
  | { [key: string]: SafeWordPressErrorData };

export interface WordPressApiErrorOptions {
  status: number;
  code: string;
  message: string;
  data?: unknown;
  /** Values that must not appear in the error message or safe data. */
  sensitiveValues?: readonly string[];
}

function redactString(value: string, sensitiveValues: readonly string[] = []): string {
  let redacted = value.replace(BEARER_PATTERN, "Bearer [redacted]");

  for (const sensitiveValue of sensitiveValues) {
    if (sensitiveValue.length > 0) {
      redacted = redacted.split(sensitiveValue).join("[redacted]");
    }
  }

  return redacted;
}

/**
 * Keep backend error details useful without allowing credentials into an error
 * object that may be rendered or sent to an error monitor.
 */
export function toSafeWordPressErrorData(
  value: unknown,
  sensitiveValues: readonly string[] = [],
  seen = new WeakSet<object>(),
): SafeWordPressErrorData | undefined {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return redactString(value, sensitiveValues);
  }

  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return "[circular]";
    }

    seen.add(value);
    const safeArray = value.map((item) =>
      toSafeWordPressErrorData(item, sensitiveValues, seen),
    );
    seen.delete(value);
    return safeArray.map((item) => item ?? null);
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[circular]";
    }

    seen.add(value);
    const safeObject: { [key: string]: SafeWordPressErrorData } = {};

    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      // Backends may echo credentials in property names as well as values.
      if (
        SENSITIVE_KEY_PATTERN.test(key) ||
        redactString(key, sensitiveValues) !== key ||
        JWT_KEY_PATTERN.test(key)
      ) {
        continue;
      }

      const safeItem = toSafeWordPressErrorData(item, sensitiveValues, seen);
      if (safeItem !== undefined) {
        safeObject[key] = safeItem;
      }
    }

    seen.delete(value);
    return safeObject;
  }

  return undefined;
}

export function sanitizeWordPressErrorMessage(
  message: string,
  sensitiveValues: readonly string[] = [],
): string {
  const redacted = redactString(message, sensitiveValues).trim();
  return redacted || "خطا در ارتباط با وردپرس.";
}

function normalizeStatus(status: number): number {
  return Number.isFinite(status) && status >= 0 ? Math.trunc(status) : 0;
}

function normalizeCode(
  code: string,
  sensitiveValues: readonly string[] = [],
): string {
  const normalized = redactString(code, sensitiveValues).trim();
  return normalized.length > 0 ? normalized : "wordpress_error";
}

export class WordPressApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly data?: SafeWordPressErrorData;

  constructor(options: WordPressApiErrorOptions);
  constructor(
    status: number,
    code: string,
    message: string,
    data?: unknown,
    sensitiveValues?: readonly string[],
  );
  constructor(
    optionsOrStatus: WordPressApiErrorOptions | number,
    positionalCode?: string,
    positionalMessage?: string,
    positionalData?: unknown,
    positionalSensitiveValues: readonly string[] = [],
  ) {
    const options: WordPressApiErrorOptions =
      typeof optionsOrStatus === "number"
        ? {
            status: optionsOrStatus,
            code: positionalCode ?? "wordpress_error",
            message: positionalMessage ?? "خطا در ارتباط با وردپرس.",
            data: positionalData,
            sensitiveValues: positionalSensitiveValues,
          }
        : optionsOrStatus;
    const sensitiveValues = options.sensitiveValues ?? [];

    super(sanitizeWordPressErrorMessage(options.message, sensitiveValues));
    this.name = "WordPressApiError";
    this.status = normalizeStatus(options.status);
    this.code = normalizeCode(options.code, sensitiveValues);

    const safeData = toSafeWordPressErrorData(options.data, sensitiveValues);
    if (safeData !== undefined) {
      this.data = safeData;
    }

    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function isWordPressApiError(error: unknown): error is WordPressApiError {
  return error instanceof WordPressApiError;
}
