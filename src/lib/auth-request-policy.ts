import type { RegistrationRole } from "./contracts/auth.ts";

export const MAX_AUTH_JSON_BYTES = 4_096;

export type AuthRequestPolicyCode =
  | "invalid_request"
  | "invalid_origin"
  | "invalid_request_metadata"
  | "invalid_content_type"
  | "request_too_large";

const errorStatus: Record<AuthRequestPolicyCode, number> = {
  invalid_request: 400,
  invalid_origin: 403,
  invalid_request_metadata: 403,
  invalid_content_type: 415,
  request_too_large: 413,
};

export class AuthRequestPolicyError extends Error {
  readonly code: AuthRequestPolicyCode;
  readonly status: number;

  constructor(code: AuthRequestPolicyCode) {
    super("درخواست احراز هویت معتبر نیست.");
    this.name = "AuthRequestPolicyError";
    this.code = code;
    this.status = errorStatus[code];
  }
}

export interface OtpRequestBody {
  phone: string;
  role: RegistrationRole;
}

export interface OtpVerifyBody {
  code: string;
}

function reject(code: AuthRequestPolicyCode): never {
  throw new AuthRequestPolicyError(code);
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => Object.hasOwn(value, key));
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return reject("invalid_request");
  }
  return value as Record<string, unknown>;
}

function boundedString(value: unknown, maximumLength: number): string {
  if (typeof value !== "string" || value.length === 0 || value.length > maximumLength) {
    return reject("invalid_request");
  }
  return value;
}

async function readLimitedBody(request: Request): Promise<string> {
  if (request.body === null) {
    return reject("invalid_request");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > MAX_AUTH_JSON_BYTES) {
        await reader.cancel();
        return reject("request_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  return new TextDecoder().decode(Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
}

export function assertAuthMutationOrigin(request: Request, appOrigin: string): void {
  if (request.headers.get("origin") !== appOrigin) {
    return reject("invalid_origin");
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite !== null && fetchSite !== "same-origin") {
    return reject("invalid_request_metadata");
  }
}

async function parseBody(request: Request, appOrigin: string): Promise<Record<string, unknown>> {
  assertAuthMutationOrigin(request, appOrigin);
  const mediaType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    return reject("invalid_content_type");
  }

  const raw = await readLimitedBody(request);
  try {
    return record(JSON.parse(raw) as unknown);
  } catch (error) {
    if (error instanceof AuthRequestPolicyError) {
      throw error;
    }
    return reject("invalid_request");
  }
}

export async function parseOtpRequest(request: Request, appOrigin: string): Promise<OtpRequestBody> {
  const body = await parseBody(request, appOrigin);
  if (!exactKeys(body, ["phone", "role"]) || (body.role !== "client" && body.role !== "specialist")) {
    return reject("invalid_request");
  }
  return { phone: boundedString(body.phone, 32), role: body.role };
}

export async function parseOtpVerifyRequest(request: Request, appOrigin: string): Promise<OtpVerifyBody> {
  const body = await parseBody(request, appOrigin);
  if (!exactKeys(body, ["code"])) {
    return reject("invalid_request");
  }
  return { code: boundedString(body.code, 6) };
}

async function parseEmptyObject(request: Request, appOrigin: string): Promise<Record<never, never>> {
  const body = await parseBody(request, appOrigin);
  if (!exactKeys(body, [])) {
    return reject("invalid_request");
  }
  return {};
}

export const parseRefreshRequest = parseEmptyObject;
export const parseLogoutRequest = parseEmptyObject;
