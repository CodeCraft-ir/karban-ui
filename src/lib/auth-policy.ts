import type { AccountSummary, RegistrationRole } from "./contracts/auth.ts";

type AuthValidationCode = "invalid_phone" | "otp_invalid" | "invalid_deadline";

const validationMessages: Record<AuthValidationCode, string> = {
  invalid_phone: "شماره موبایل معتبر نیست.",
  otp_invalid: "کد تأیید باید دقیقاً پنج رقم باشد.",
  invalid_deadline: "زمان اعتبار قابل محاسبه نیست.",
};

export class AuthValidationError extends Error {
  readonly status = 422;
  readonly code: AuthValidationCode;

  constructor(code: AuthValidationCode) {
    super(validationMessages[code]);
    this.name = "AuthValidationError";
    this.code = code;
  }
}

function toAsciiDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/gu, (digit) =>
    String(digit.charCodeAt(0) - (digit >= "۰" ? 0x06f0 : 0x0660)),
  );
}

export function normalizeIranianPhone(value: string): string {
  if (typeof value === "string") {
    const digits = toAsciiDigits(value).replace(/[\s()-]/gu, "");
    const match = /^(?:0|98|\+98|0098)?(9\d{9})$/u.exec(digits);
    if (match) {
      return `0${match[1]}`;
    }
  }
  throw new AuthValidationError("invalid_phone");
}

export function normalizeOtpCode(value: string): string {
  if (typeof value === "string") {
    const digits = toAsciiDigits(value);
    if (digits.length === 5 && /^\d{5}$/u.test(digits)) {
      return digits;
    }
  }
  throw new AuthValidationError("otp_invalid");
}

export function resolveAccountRole(roles: readonly string[]): RegistrationRole | null {
  if (roles.length !== 1) {
    return null;
  }
  switch (roles[0]) {
    case "nahan_client":
      return "client";
    case "nahan_specialist":
      return "specialist";
    default:
      return null;
  }
}

export function getAccountHome(
  role: RegistrationRole | null,
): "/dashboard" | "/pro" | null {
  switch (role) {
    case "client":
      return "/dashboard";
    case "specialist":
      return "/pro";
    default:
      return null;
  }
}

export function toAccountSummary(user: {
  id: number;
  display_name: string;
  roles: readonly string[];
}): AccountSummary {
  return {
    id: user.id,
    displayName: user.display_name,
    role: resolveAccountRole(user.roles),
  };
}

export function deadlineFromTtl(nowMs: number, ttlSeconds: number): number {
  if (
    !Number.isSafeInteger(nowMs) || nowMs < 0 ||
    !Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0
  ) {
    throw new AuthValidationError("invalid_deadline");
  }
  const ttlMs = ttlSeconds * 1000;
  const deadline = nowMs + ttlMs;
  if (!Number.isSafeInteger(ttlMs) || !Number.isSafeInteger(deadline)) {
    throw new AuthValidationError("invalid_deadline");
  }
  return deadline;
}
