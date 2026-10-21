import type { AccountSummary, RegistrationRole } from "./contracts/auth.ts";

type AuthenticatedAccount = Omit<AccountSummary, "role"> & { role: RegistrationRole };

export interface AuthChallengePresentation {
  expiresAt: number;
  codeLength: 5 | 6;
  isSimulated: boolean;
}

export interface PublicAuthResult {
  account: AccountSummary;
  redirectTo: "/dashboard" | "/pro";
  onboardingTo?: "/account" | "/pro/profile";
}

const redirectByRole: Record<Exclude<RegistrationRole, never>, "/dashboard" | "/pro"> = {
  client: "/dashboard",
  specialist: "/pro",
};

export function buildOtpRequest(phone: string, role: RegistrationRole): { phone: string; role: RegistrationRole } {
  return { phone, role };
}

export function otpSlots(codeLength: 5 | 6): number[] {
  return Array.from({ length: codeLength }, (_, index) => index);
}

export function parseAuthChallenge(value: unknown): AuthChallengePresentation {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_challenge");
  const input = value as Record<string, unknown>;
  if (!Number.isSafeInteger(input.expiresAt) || (input.codeLength !== 5 && input.codeLength !== 6) || typeof input.isSimulated !== "boolean") {
    throw new Error("invalid_challenge");
  }
  return { expiresAt: input.expiresAt as number, codeLength: input.codeLength, isSimulated: input.isSimulated };
}

function parseAccount(value: unknown): AuthenticatedAccount {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_auth_result");
  const account = value as Record<string, unknown>;
  const id = account.id;
  if (!Number.isSafeInteger(id) || (id as number) < 1 || typeof account.displayName !== "string" ||
      (account.role !== "client" && account.role !== "specialist")) throw new Error("invalid_auth_result");
  return { id: id as number, displayName: account.displayName, role: account.role };
}

export function parseAuthResult(value: unknown): PublicAuthResult {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_auth_result");
  const result = value as Record<string, unknown>;
  if (result.redirectTo !== "/dashboard" && result.redirectTo !== "/pro") throw new Error("invalid_auth_result");
  const account = parseAccount(result.account);
  if (redirectByRole[account.role] !== result.redirectTo) throw new Error("invalid_auth_result");
  const onboardingTo = account.role === 'specialist' ? '/pro/profile' : '/account';
  if (result.onboardingTo !== undefined && result.onboardingTo !== onboardingTo) throw new Error('invalid_auth_result');
  return { account, redirectTo: result.redirectTo, ...(result.onboardingTo ? {onboardingTo} : {}) };
}

export function parseAccountSummary(value: unknown): AccountSummary {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_account");
  const account = (value as Record<string, unknown>).account;
  return parseAccount(account);
}

export async function readVerificationChallenge(fetcher: (path:string, init?:RequestInit)=>Promise<Response>, signal?:AbortSignal): Promise<AuthChallengePresentation> {
  const response = await fetcher('/api/auth/challenge', {credentials:'same-origin',cache:'no-store',signal});
  const body = await response.json().catch(()=>null);
  if(!response.ok) throw new Error(mapAuthError(response.status,body?.error?.code));
  return parseAuthChallenge(body?.challenge);
}
export function canResendCode(phone:string,pending:boolean,seconds:number):boolean { return Boolean(phone) && !pending && seconds<=0; }

export function mapAuthError(status: number, code: unknown): string {
  if(status === 429) return 'تعداد تلاش‌ها زیاد است؛ کمی صبر کنید و دوباره درخواست کنید.';
  if(status === 422 && code !== 'invalid_code') return 'اطلاعات درخواست معتبر نیست؛ شماره و ورودی‌ها را بررسی کنید.';
  if(status === 401 && code !== 'challenge_missing') return 'نشست ورود معتبر نیست؛ دوباره وارد شوید.';
  if (code === "invalid_challenge") return "اطلاعات کد معتبر نیست؛ کد جدید درخواست کن.";
  if (code === "challenge_missing" || (status === 401 && code === "challenge_missing")) return "کد تایید در دسترس نیست؛ دوباره درخواست کد کن.";
  if (status === 410 || code === "challenge_expired") return "زمان کد تمام شده است؛ کد جدید درخواست کن.";
  if (status === 422 && code === "invalid_code") return "کد وارد شده صحیح نیست. دوباره تلاش کن.";
  if (status === 503 || code === "auth_unavailable") return "سرویس ورود موقتاً در دسترس نیست.";
  return "عملیات ورود انجام نشد. دوباره تلاش کن.";
}

export function fixedHomeForRole(role: RegistrationRole): "/dashboard" | "/pro" {
  return redirectByRole[role];
}
