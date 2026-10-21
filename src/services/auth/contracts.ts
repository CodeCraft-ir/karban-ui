export type OtpDeliveryMode = "sms" | "local_simulated";
export type OtpCodeLength = 5 | 6;

export interface UpstreamOtpChallenge {
  tracking_code: string;
  expires_in: number;
  delivery_mode: OtpDeliveryMode;
  code_length: OtpCodeLength;
}

export interface UpstreamTokenPair {
  access_token: string;
  access_expires_in: number;
  refresh_token: string;
  refresh_expires_in: number;
  token_type: "Bearer";
}

export interface UpstreamVerifiedUser {
  id: number;
  display_name: string;
  roles: string[];
  phone: string;
}

export interface UpstreamMeUser {
  id: number;
  display_name: string;
  roles: string[];
  phone: string | null;
  specialist_post_id: number;
}

export interface UpstreamVerifyResult {
  tokens: UpstreamTokenPair;
  is_new: boolean;
  user: UpstreamVerifiedUser;
}

export interface UpstreamRefreshResult {
  tokens: UpstreamTokenPair;
}

export interface UpstreamLogoutResult {
  logged_out: true;
}

export interface UpstreamLocalStatus {
  otpReady: boolean;
  credentialProvenanceReady: boolean;
}

export class AuthResponseError extends Error {
  readonly code = "invalid_response";
  readonly status = 502;

  constructor() {
    super("پاسخ سرویس احراز هویت معتبر نیست.");
    this.name = "AuthResponseError";
  }
}

function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new AuthResponseError();
  }
  return value as Record<string, unknown>;
}

function string(value: unknown): string {
  if (typeof value !== "string") {
    throw new AuthResponseError();
  }
  return value;
}

function nonemptyString(value: unknown): string {
  const parsed = string(value);
  if (parsed.trim().length === 0) {
    throw new AuthResponseError();
  }
  return parsed;
}

function safeInteger(value: unknown, minimum: number): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < minimum) {
    throw new AuthResponseError();
  }
  return value;
}

function roles(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new AuthResponseError();
  }
  const parsed: string[] = [];
  for (const role of value) {
    parsed.push(string(role));
  }
  return parsed;
}

function parseVerifiedUser(value: unknown): UpstreamVerifiedUser {
  const user = record(value);
  return {
    id: safeInteger(user.id, 1),
    display_name: string(user.display_name),
    roles: roles(user.roles),
    phone: string(user.phone),
  };
}

export function parseUpstreamOtpChallenge(value: unknown): UpstreamOtpChallenge {
  const challenge = record(value);
  const hasMode = Object.hasOwn(challenge, "delivery_mode");
  const hasLength = Object.hasOwn(challenge, "code_length");
  let delivery_mode: OtpDeliveryMode = "sms";
  let code_length: OtpCodeLength = 5;

  if (hasMode !== hasLength) {
    throw new AuthResponseError();
  }
  if (hasMode) {
    if (challenge.delivery_mode !== "sms" && challenge.delivery_mode !== "local_simulated") {
      throw new AuthResponseError();
    }
    if (challenge.code_length !== 5 && challenge.code_length !== 6) {
      throw new AuthResponseError();
    }
    delivery_mode = challenge.delivery_mode;
    code_length = challenge.code_length;
    if ((delivery_mode === "sms" && code_length !== 5) ||
        (delivery_mode === "local_simulated" && code_length !== 6)) {
      throw new AuthResponseError();
    }
  }

  return {
    tracking_code: nonemptyString(challenge.tracking_code),
    expires_in: safeInteger(challenge.expires_in, 1),
    delivery_mode,
    code_length,
  };
}

export function parseUpstreamTokenPair(value: unknown): UpstreamTokenPair {
  const tokens = record(value);
  if (tokens.token_type !== "Bearer") {
    throw new AuthResponseError();
  }
  return {
    access_token: nonemptyString(tokens.access_token),
    access_expires_in: safeInteger(tokens.access_expires_in, 1),
    refresh_token: nonemptyString(tokens.refresh_token),
    refresh_expires_in: safeInteger(tokens.refresh_expires_in, 1),
    token_type: "Bearer",
  };
}

export function parseUpstreamVerifyResult(value: unknown): UpstreamVerifyResult {
  const result = record(value);
  if (typeof result.is_new !== "boolean") {
    throw new AuthResponseError();
  }
  return {
    tokens: parseUpstreamTokenPair(result.tokens),
    is_new: result.is_new,
    user: parseVerifiedUser(result.user),
  };
}

export function parseUpstreamRefreshResult(value: unknown): UpstreamRefreshResult {
  const result = record(value);
  return { tokens: parseUpstreamTokenPair(result.tokens) };
}

export function parseUpstreamMeUser(value: unknown): UpstreamMeUser {
  const user = record(value);
  return {
    id: safeInteger(user.id, 1),
    display_name: string(user.display_name),
    roles: roles(user.roles),
    phone: user.phone === null ? null : string(user.phone),
    specialist_post_id: safeInteger(user.specialist_post_id, 0),
  };
}

export function parseUpstreamLogoutResult(value: unknown): UpstreamLogoutResult {
  const result = record(value);
  if (result.logged_out !== true) {
    throw new AuthResponseError();
  }
  return { logged_out: true };
}

export function parseUpstreamLocalStatus(value: unknown): UpstreamLocalStatus {
  const result = record(value);
  if (
    typeof result.otpReady !== "boolean" ||
    typeof result.credentialProvenanceReady !== "boolean"
  ) {
    throw new AuthResponseError();
  }
  return {
    otpReady: result.otpReady,
    credentialProvenanceReady: result.credentialProvenanceReady,
  };
}
