import {
  AuthValidationError,
  normalizeIranianPhone,
  normalizeOtpCode,
} from "../../lib/auth-policy.ts";
import type { RegistrationRole } from "../../lib/contracts/auth.ts";
import { assertWordPressServerOnly } from "../wordpress/config.ts";
import { WordPressApiError } from "../wordpress/errors.ts";
import type { WordPressRequestOptions } from "../wordpress/rest-client.ts";
import {
  AuthResponseError,
  parseUpstreamOtpReadiness,
  type UpstreamOtpReadiness,
  parseUpstreamLocalStatus,
  parseUpstreamLogoutResult,
  parseUpstreamMeUser,
  parseUpstreamOtpChallenge,
  parseUpstreamRefreshResult,
  parseUpstreamVerifyResult,
  type UpstreamLocalStatus,
  type UpstreamLogoutResult,
  type UpstreamMeUser,
  type UpstreamOtpChallenge,
  type UpstreamRefreshResult,
  type UpstreamVerifyResult,
} from "./contracts.ts";

export type WordPressAuthRequest = (
  path: string,
  options?: WordPressRequestOptions,
) => Promise<unknown>;

export interface StoredOtpChallengeContext {
  /**
   * Derived only from the server-stored requestOtp response. Never accept this
   * value from browser JSON, form state, or any client-controlled flag.
   */
  expectedCodeLength: 5 | 6;
}

export interface WordPressAuthGateway {
  requestOtp(phone: string): Promise<UpstreamOtpChallenge>;
  verifyOtp(
    input: {
      trackingCode: string;
      code: string;
      role: RegistrationRole;
      deviceId?: string;
    },
    storedChallenge?: StoredOtpChallengeContext,
  ): Promise<UpstreamVerifyResult>;
  refresh(refreshToken: string): Promise<UpstreamRefreshResult>;
  me(accessToken: string): Promise<UpstreamMeUser>;
  otpReadiness(): Promise<UpstreamOtpReadiness>;
  localStatus(): Promise<UpstreamLocalStatus>;
  logoutRefresh(refreshToken: string): Promise<UpstreamLogoutResult>;
  logout(accessToken: string, refreshToken: string): Promise<UpstreamLogoutResult>;
}

const pluginErrors = {
  sms_misconfigured: { status: 503, message: "تنظیمات ارسال پیامک آماده نیست؛ با پشتیبانی تماس بگیرید." },
  sms_transport_error: { status: 503, message: "ارتباط با سرویس پیامک تأیید نشد؛ پیش از درخواست دوباره صبر کنید." },
  sms_provider_error: { status: 503, message: "پاسخ سرویس پیامک تأیید نشد؛ با پشتیبانی تماس بگیرید." },
  invalid_phone: { status: 422, message: "شماره موبایل معتبر نیست." },
  otp_rate_limited: { status: 429, message: "تعداد درخواست‌های این شماره زیاد است. کمی صبر کنید." },
  otp_rate_limited_ip: { status: 429, message: "تعداد درخواست‌های این اتصال زیاد است. کمی صبر کنید." },
  otp_throttled: { status: 429, message: "برای درخواست دوباره کد، کمی صبر کنید." },
  otp_not_found: { status: 404, message: "درخواست تأیید یافت نشد. کد تازه درخواست کنید." },
  otp_consumed: { status: 410, message: "این کد قبلاً استفاده شده است. کد تازه درخواست کنید." },
  otp_expired: { status: 410, message: "کد تأیید منقضی شده است. کد تازه درخواست کنید." },
  otp_invalid: { status: 422, message: "کد تأیید معتبر نیست." },
  otp_too_many_attempts: { status: 429, message: "تعداد تلاش‌های تأیید بیش از حد مجاز است." },
  invalid_refresh: { status: 401, message: "اعتبار ورود معتبر نیست. دوباره وارد شوید." },
  revoked_refresh: { status: 401, message: "اعتبار ورود لغو شده است. دوباره وارد شوید." },
  expired_refresh: { status: 401, message: "اعتبار ورود منقضی شده است. دوباره وارد شوید." },
  unauthenticated: { status: 401, message: "برای ادامه، وارد حساب شوید." },
} as const;

const errorPresentations = {
  ...pluginErrors,
  invalid_request: { status: 422, message: "اطلاعات درخواست تأیید معتبر نیست." },
  invalid_tracking_code: { status: 422, message: "شناسه درخواست تأیید معتبر نیست." },
  invalid_role: { status: 422, message: "نقش ثبت‌نام معتبر نیست." },
  invalid_device_id: { status: 422, message: "شناسه دستگاه معتبر نیست." },
  invalid_credentials: { status: 422, message: "اطلاعات احراز هویت معتبر نیست." },
  invalid_response: { status: 502, message: "پاسخ سرویس احراز هویت معتبر نیست." },
  network_error: { status: 503, message: "ارتباط با سرویس احراز هویت برقرار نشد. دوباره تلاش کنید." },
  auth_unavailable: { status: 502, message: "سرویس احراز هویت در دسترس نیست. دوباره تلاش کنید." },
  server_only: { status: 500, message: "این عملیات فقط در سرور مجاز است." },
} as const;

export type AuthGatewayErrorCode = keyof typeof errorPresentations;

export class AuthGatewayError extends Error {
  readonly code: AuthGatewayErrorCode;
  readonly status: number;

  constructor(code: AuthGatewayErrorCode) {
    const safeCode = Object.hasOwn(errorPresentations, code) ? code : "auth_unavailable";
    const presentation = errorPresentations[safeCode];
    super(presentation.message);
    this.name = "AuthGatewayError";
    this.code = safeCode;
    this.status = presentation.status;
  }
}

function safeFailure(error: unknown): AuthGatewayError {
  if (error instanceof AuthGatewayError) {
    return new AuthGatewayError(error.code);
  }
  if (error instanceof AuthValidationError) {
    if (error.code === "invalid_phone" || error.code === "otp_invalid") {
      return new AuthGatewayError(error.code);
    }
  }
  if (error instanceof AuthResponseError) {
    return new AuthGatewayError("invalid_response");
  }
  if (error instanceof WordPressApiError) {
    if (Object.hasOwn(pluginErrors, error.code)) {
      return new AuthGatewayError(error.code as keyof typeof pluginErrors);
    }
    switch (error.code) {
      case "invalid_json":
      case "invalid_envelope":
        return new AuthGatewayError("invalid_response");
      case "network_error":
      case "timeout":
      case "aborted":
      case "fetch_unavailable":
        return new AuthGatewayError("network_error");
    }
  }
  return new AuthGatewayError("auth_unavailable");
}

function assertServerRuntime(): void {
  try {
    assertWordPressServerOnly();
  } catch {
    throw new AuthGatewayError("server_only");
  }
}

async function run<T>(operation: () => Promise<T>): Promise<T> {
  try {
    assertServerRuntime();
    return await operation();
  } catch (error) {
    // Always construct a fresh allowlisted error, without upstream data or cause.
    throw safeFailure(error);
  }
}

function requireCredential(
  value: unknown,
  code: "invalid_credentials" | "invalid_tracking_code" = "invalid_credentials",
): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || /[\s\p{Cc}]/u.test(value)) {
    throw new AuthGatewayError(code);
  }
}

const lazyWordPressRest: WordPressAuthRequest = async (path, options) => {
  const { wordpressRest } = await import("../wordpress/rest-client.ts");
  return wordpressRest(path, options);
};

export function createWordPressAuthGateway(
  request: WordPressAuthRequest = lazyWordPressRest,
): WordPressAuthGateway {
  assertServerRuntime();

  return {
    requestOtp: (phone) => run(async () => {
      const normalizedPhone = normalizeIranianPhone(phone);
      return parseUpstreamOtpChallenge(await request("auth/otp/request", {
        method: "POST",
        body: { phone: normalizedPhone },
      }));
    }),

    verifyOtp: (input, storedChallenge) => run(async () => {
      if (input === null || typeof input !== "object" || Array.isArray(input)) {
        throw new AuthGatewayError("invalid_request");
      }
      const expectedCodeLength = storedChallenge?.expectedCodeLength ?? 5;
      if (expectedCodeLength !== 5 && expectedCodeLength !== 6) {
        throw new AuthGatewayError("invalid_request");
      }
      requireCredential(input.trackingCode, "invalid_tracking_code");
      const code = normalizeOtpCode(input.code, expectedCodeLength);
      if (input.role !== "client" && input.role !== "specialist") {
        throw new AuthGatewayError("invalid_role");
      }
      if (input.deviceId !== undefined &&
          (typeof input.deviceId !== "string" || input.deviceId.length > 64)) {
        throw new AuthGatewayError("invalid_device_id");
      }
      const body: {
        tracking_code: string;
        code: string;
        role: RegistrationRole;
        device_id?: string;
      } = { tracking_code: input.trackingCode, code, role: input.role };
      if (input.deviceId !== undefined) {
        body.device_id = input.deviceId;
      }
      return parseUpstreamVerifyResult(await request("auth/otp/verify", {
        method: "POST",
        body,
      }));
    }),

    refresh: (refreshToken) => run(async () => {
      requireCredential(refreshToken);
      return parseUpstreamRefreshResult(await request("auth/refresh", {
        method: "POST",
        body: { refresh_token: refreshToken },
      }));
    }),

    me: (accessToken) => run(async () => {
      requireCredential(accessToken);
      return parseUpstreamMeUser(await request("auth/me", {
        method: "GET",
        token: accessToken,
      }));
    }),

    otpReadiness: () => run(async () => (
      parseUpstreamOtpReadiness(await request("auth/otp/readiness", { method: "GET" }))
    )),

    localStatus: () => run(async () => (
      parseUpstreamLocalStatus(await request("auth/local-status", { method: "GET" }))
    )),

    logoutRefresh: (refreshToken) => run(async () => {
      requireCredential(refreshToken);
      return parseUpstreamLogoutResult(await request("auth/logout/refresh", {
        method: "POST",
        body: { refresh_token: refreshToken },
      }));
    }),

    logout: (accessToken, refreshToken) => run(async () => {
      requireCredential(accessToken);
      requireCredential(refreshToken);
      return parseUpstreamLogoutResult(await request("auth/logout", {
        method: "POST",
        token: accessToken,
        body: { refresh_token: refreshToken, all_devices: false },
      }));
    }),
  };
}
