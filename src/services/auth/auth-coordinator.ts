import { parseSealedAuthSession } from "./auth-session-schema.ts";
import {
  AuthValidationError,
  deadlineFromTtl,
  getAccountHome,
  normalizeOtpCode,
  toAccountSummary,
} from "../../lib/auth-policy.ts";
import type { AccountSummary, RegistrationRole } from "../../lib/contracts/auth.ts";
import type {
  OtpReadinessReceipt,
  OtpCodeLength,
  OtpDeliveryMode,
  UpstreamMeUser,
  UpstreamOtpChallenge,
  UpstreamRefreshResult,
  UpstreamVerifyResult,
} from "./contracts.ts";

export interface AuthChallengeContext {
  trackingCode: string;
  role: RegistrationRole;
  codeLength: OtpCodeLength;
  deliveryMode: OtpDeliveryMode;
  expiresAt: number;
}

export interface AuthCredentialContext {
  accessToken: string;
  accessExpiresAt: number;
  refreshToken: string;
  refreshExpiresAt: number;
  account: AccountSummary;
  generation: string;
}

export interface AuthSessionData {
  sessionId: string;
  version: 1;
  challenge?: AuthChallengeContext;
  auth?: AuthCredentialContext;
}

export interface AuthSessionPort {
  read(): AuthSessionData | undefined;
  save(session: AuthSessionData): Promise<void>;
  destroy(): void;
}

export interface AuthGatewayPort {
  requestOtp(phone: string): Promise<UpstreamOtpChallenge>;
  verifyOtp(input: { trackingCode: string; code: string; role: RegistrationRole }, storedChallenge: { expectedCodeLength: OtpCodeLength }): Promise<UpstreamVerifyResult>;
  refresh(refreshToken: string): Promise<UpstreamRefreshResult>;
  me(accessToken: string): Promise<UpstreamMeUser>;
  logoutRefresh(refreshToken: string): Promise<{ logged_out: true }>;
}

export type AuthCoordinatorCode = "sms_misconfigured" | "sms_transport_error" | "sms_provider_error" | "rate_limited" | "invalid_request" | "auth_unavailable" | "challenge_missing" | "challenge_expired" | "invalid_code" | "unsupported_role" | "unauthenticated" | "refresh_required" | "refresh_cancelled";

const statusByCode: Record<AuthCoordinatorCode, number> = {
  sms_misconfigured: 503,
  sms_transport_error: 503,
  sms_provider_error: 503,
  rate_limited: 429,
  invalid_request: 422,
  auth_unavailable: 503,
  challenge_missing: 401,
  challenge_expired: 410,
  invalid_code: 422,
  unsupported_role: 403,
  unauthenticated: 401,
  refresh_required: 401,
  refresh_cancelled: 401,
};

export class AuthCoordinatorError extends Error {
  readonly code: AuthCoordinatorCode;
  readonly status: number;

  constructor(code: AuthCoordinatorCode, status = statusByCode[code]) {
    super("عملیات احراز هویت در حال حاضر قابل انجام نیست.");
    this.name = "AuthCoordinatorError";
    this.code = code;
    this.status = status;
  }
}

// Temporary server-composed diagnostic categories; never attach to public errors/results.
export type AuthRefreshRequiredReason = "access_expired" | "fence_busy" | "fence_seal_mismatch" | "fence_changed_during_read";
export type AuthRefreshRequiredObserver = (reason: AuthRefreshRequiredReason) => void;
function notifyRefreshRequired(observer: AuthRefreshRequiredObserver | undefined, reason: AuthRefreshRequiredReason): void {
  try { observer?.(reason); } catch { /* Diagnostics must never change authorization decisions. */ }
}

export interface RefreshCoordinator {
  run<T>(key: string, operation: (isCancelled: () => boolean) => Promise<T>): Promise<T>;
  cancelAndWait(key: string, credentialExpiresAt?: number): Promise<void>;
  isCancelled(key: string): boolean;
  claim(key: string, auth: AuthCredentialContext, write: boolean, observer?: AuthRefreshRequiredObserver): {
    check(): void;
    commit(next: AuthCredentialContext): void;
    release(): void;
  };
}

interface RefreshEntry {
  cancelled: boolean;
  expiresAt: number;
  settled: boolean;
  promise?: Promise<unknown>;
}

const REFRESH_REPLAY_GRACE_MS = 5_000;
const MAX_REFRESH_ENTRIES = 512;
const MAX_CANCELLED_TOMBSTONES = 512;

export function createRefreshCoordinator(now: () => number): RefreshCoordinator {
  const entries = new Map<string, RefreshEntry>();
  const cancellations = new Map<string, number>();
  // Per-generation fences cover independent cookie/response ports, not just one
  // closure's session snapshot. Retain until refresh expiry; never evict a live
  // fence to admit another writer. Multi-process deployments need shared affinity.
  const fences = new Map<string, { seal: string; busy: boolean; cancelled: boolean; expiresAt: number }>();
  let cancellationAdmissionBlocked = false;
  let fenceAdmissionBlockedUntil = 0;
  function prune(): void {
    const time = now();
    for (const [key, fence] of fences) {
      if (!fence.busy && fence.expiresAt <= time) fences.delete(key);
    }
    for (const [key, entry] of entries) {
      if (entry.settled && entry.expiresAt <= time) entries.delete(key);
    }
    for (const [key, expiresAt] of cancellations) {
      if (expiresAt <= time) cancellations.delete(key);
    }
    if (cancellations.size < MAX_CANCELLED_TOMBSTONES) {
      cancellationAdmissionBlocked = false;
    }
    while (entries.size > MAX_REFRESH_ENTRIES) {
      const settledKey = [...entries].find(([, entry]) => entry.settled)?.[0];
      if (!settledKey) break;
      entries.delete(settledKey);
    }
  }
  function entryFor(key: string): RefreshEntry | undefined {
    const existing = entries.get(key);
    if (existing) return existing;
    prune();
    if (entries.size >= MAX_REFRESH_ENTRIES) return undefined;
    const entry: RefreshEntry = { cancelled: false, expiresAt: now() + REFRESH_REPLAY_GRACE_MS, settled: true };
    entries.set(key, entry);
    return entry;
  }
  return {
    run<T>(
      key: string,
      operation: (isCancelled: () => boolean) => Promise<T>,
    ): Promise<T> {
      prune();
      if (cancellations.has(key)) return Promise.reject(new AuthCoordinatorError("refresh_cancelled"));
      if (cancellationAdmissionBlocked) return Promise.reject(new AuthCoordinatorError("auth_unavailable"));
      const entry = entryFor(key);
      if (!entry) return Promise.reject(new AuthCoordinatorError("auth_unavailable"));
      if (entry.cancelled) return Promise.reject(new AuthCoordinatorError("refresh_cancelled"));
      if (entry.promise) return entry.promise as Promise<T>;
      entry.settled = false;
      const task = operation(() => entry.cancelled).finally(() => {
        entry.settled = true;
        entry.expiresAt = now() + REFRESH_REPLAY_GRACE_MS;
        prune();
      });
      entry.promise = task;
      return task;
    },
    async cancelAndWait(key, credentialExpiresAt) {
      prune();
      const fence = fences.get(key);
      if (fence) fence.cancelled = true;
      else if (credentialExpiresAt !== undefined && credentialExpiresAt > now()) {
        if (fences.size >= MAX_REFRESH_ENTRIES) {
          // Lost cancellation admission must never make an old valid seal usable.
          fenceAdmissionBlockedUntil = Math.max(fenceAdmissionBlockedUntil, credentialExpiresAt);
        } else {
          fences.set(key, { seal: "", busy: false, cancelled: true, expiresAt: credentialExpiresAt });
        }
      }
      const existing = entries.get(key);
      if (existing) {
        existing.cancelled = true;
        existing.expiresAt = now() + REFRESH_REPLAY_GRACE_MS;
        try { await existing.promise; } catch { /* Cancellation waits for finalization, not its outcome. */ }
        return;
      }
      if (!cancellations.has(key)) {
        if (cancellations.size >= MAX_CANCELLED_TOMBSTONES) {
          cancellationAdmissionBlocked = true;
          return;
        }
        cancellations.set(key, now() + REFRESH_REPLAY_GRACE_MS);
      }
    },
    isCancelled(key) {
      prune();
      return cancellations.has(key) || entries.get(key)?.cancelled === true || fences.get(key)?.cancelled === true;
    },
    claim(key, auth, write, observer) {
      prune();
      if (this.isCancelled(key)) throw new AuthCoordinatorError("refresh_cancelled");
      if (fenceAdmissionBlockedUntil > now()) throw new AuthCoordinatorError("auth_unavailable");
      let fence = fences.get(key);
      const seal = JSON.stringify(auth);
      if (!fence) {
        if (fences.size >= MAX_REFRESH_ENTRIES || cancellationAdmissionBlocked) throw new AuthCoordinatorError("auth_unavailable");
        fence = { seal, busy: false, cancelled: false, expiresAt: auth.refreshExpiresAt };
        fences.set(key, fence);
      }
      if (fence.busy || fence.seal !== seal) {
        notifyRefreshRequired(observer, fence.busy ? "fence_busy" : "fence_seal_mismatch");
        throw new AuthCoordinatorError("refresh_required");
      }
      if (write) fence.busy = true;
      const held = fence;
      let expected = seal;
      return {
        check: () => {
          if (this.isCancelled(key) || held.cancelled) throw new AuthCoordinatorError("refresh_cancelled");
          if (held.seal !== expected) {
            notifyRefreshRequired(observer, "fence_changed_during_read");
            throw new AuthCoordinatorError("refresh_required");
          }
        },
        commit: (next) => { expected = JSON.stringify(next); held.seal = expected; held.expiresAt = next.refreshExpiresAt; },
        release: () => { if (write) held.busy = false; },
      };
    },
  };
}

export interface AuthCoordinatorDependencies {
  gateway: AuthGatewayPort;
  session: AuthSessionPort;
  now: () => number;
  uuid: () => string;
  ensureOtpReady: () => Promise<OtpReadinessReceipt>;
  refreshCoordinator: RefreshCoordinator;
  observeRefreshRequired?: AuthRefreshRequiredObserver;
}

export interface PublicChallenge { expiresAt: number; codeLength: OtpCodeLength; isSimulated: boolean; }
export interface PublicAuthResult { account: AccountSummary; redirectTo: "/dashboard" | "/pro"; onboardingTo?: "/account" | "/pro/profile"; }

function upstreamCode(error: unknown): string | undefined {
  return error !== null && typeof error === "object" && typeof (error as { code?: unknown }).code === "string"
    ? (error as { code: string }).code
    : undefined;
}
function safeError(error: unknown): AuthCoordinatorError {
  if (error instanceof AuthCoordinatorError) return error;
  const code = upstreamCode(error);
  if (code === "sms_misconfigured" || code === "sms_transport_error" || code === "sms_provider_error") return new AuthCoordinatorError(code);
  if (error instanceof AuthValidationError || upstreamCode(error) === "otp_invalid") return new AuthCoordinatorError("invalid_code");
  if (["invalid_refresh", "revoked_refresh", "expired_refresh"].includes(upstreamCode(error) ?? "")) return new AuthCoordinatorError("unauthenticated");
  if (["otp_expired", "otp_consumed", "otp_not_found"].includes(upstreamCode(error) ?? "")) return new AuthCoordinatorError("challenge_expired");
  if (["otp_rate_limited", "otp_rate_limited_ip", "otp_throttled", "otp_too_many_attempts"].includes(upstreamCode(error) ?? "")) return new AuthCoordinatorError("rate_limited");
  if (["invalid_phone", "invalid_request", "invalid_tracking_code", "invalid_role", "invalid_device_id"].includes(upstreamCode(error) ?? "")) return new AuthCoordinatorError("invalid_request");
  return new AuthCoordinatorError("auth_unavailable");
}
function terminalVerificationFailure(error: unknown): boolean {
  return ["otp_consumed", "otp_expired", "otp_not_found", "otp_too_many_attempts"].includes(upstreamCode(error) ?? "");
}
function publicChallenge(challenge: AuthChallengeContext): PublicChallenge {
  return { expiresAt: challenge.expiresAt, codeLength: challenge.codeLength, isSimulated: challenge.deliveryMode === "local_simulated" };
}
function accountFrom(user: { id: number; display_name: string; roles: readonly string[] }): AccountSummary {
  const account = toAccountSummary(user);
  if (account.role === null) throw new AuthCoordinatorError("unsupported_role");
  return account;
}
function publicAuth(account: AccountSummary): PublicAuthResult {
  const redirectTo = getAccountHome(account.role);
  if (!redirectTo) throw new AuthCoordinatorError("unsupported_role");
  return { account, redirectTo };
}
function withoutChallenge(session: AuthSessionData): AuthSessionData { const next = { ...session }; delete next.challenge; return next; }
function refreshKey(session: AuthSessionData, auth: AuthCredentialContext): string { return `${session.sessionId}:${auth.generation}`; }

export interface AuthCoordinator {
  requestOtp(phone: string, role: RegistrationRole): Promise<{ challenge: PublicChallenge }>;
  verifyOtp(code: string): Promise<PublicAuthResult>;
  challenge(): PublicChallenge;
  me(): Promise<{ account: AccountSummary }>;
  refresh(): Promise<{ account: AccountSummary }>;
  logout(): Promise<void>;
}

export interface SealedAuthCoordinator extends AuthCoordinator {
  /** Internal server composition only. Never expose as a Server Action. No retry/refresh. */
  authenticatedOperation<T>(operation: (accessToken: string, account: AccountSummary, assertActive: () => void) => Promise<T>, summary?: (result: T) => AccountSummary, mutation?: boolean): Promise<T>;
}

export function createAuthCoordinator(dependencies: AuthCoordinatorDependencies): SealedAuthCoordinator {
  const { gateway, session, now, uuid, ensureOtpReady, refreshCoordinator } = dependencies;
  function readSession(): AuthSessionData | undefined {
    const current = session.read();
    if (current?.auth && refreshCoordinator.isCancelled(refreshKey(current, current.auth))) {
      session.destroy();
      return undefined;
    }
    return current;
  }
  function requireSession(): AuthSessionData { const current = readSession(); if (!current) throw new AuthCoordinatorError("unauthenticated"); return current; }
  function requireChallenge(): AuthChallengeContext {
    const challenge = requireSession().challenge;
    if (!challenge) throw new AuthCoordinatorError("challenge_missing");
    if (challenge.expiresAt <= now()) throw new AuthCoordinatorError("challenge_expired");
    return challenge;
  }
  function requireAuth(): { base: AuthSessionData; auth: AuthCredentialContext; key: string } {
    const base = requireSession();
    if (!base.auth) throw new AuthCoordinatorError("unauthenticated");
    const key = refreshKey(base, base.auth);
    if (refreshCoordinator.isCancelled(key)) { session.destroy(); throw new AuthCoordinatorError("unauthenticated"); }
    return { base, auth: base.auth, key };
  }
  async function revokeNewRefresh(refreshToken: string): Promise<void> { try { await gateway.logoutRefresh(refreshToken); } catch { /* local terminal state wins */ } }

  return {
    async authenticatedOperation(operation, summary, mutation = false) {
      if (!parseSealedAuthSession(session.read(), now())?.auth) throw new AuthCoordinatorError("unauthenticated");
      const { base, auth, key } = requireAuth();
      if (auth.accessExpiresAt <= now()) {
        notifyRefreshRequired(dependencies.observeRefreshRequired, "access_expired");
        throw new AuthCoordinatorError("refresh_required");
      }
      if (auth.refreshExpiresAt <= now()) throw new AuthCoordinatorError("unauthenticated");
      const lease = refreshCoordinator.claim(key, auth, mutation || !!summary, dependencies.observeRefreshRequired);
      try {
        lease.check();
        let result;
        try { result = await operation(auth.accessToken, { ...auth.account }, lease.check); }
        catch (error) { lease.check(); throw error; }
        lease.check();
        if (summary) {
          const account = summary(result);
          if (account.id !== auth.account.id || account.role !== auth.account.role ||
            typeof account.displayName !== "string" || account.displayName.length > 160 || /[\p{Cc}]/u.test(account.displayName)) {
            throw new AuthCoordinatorError("auth_unavailable");
          }
          const current = session.read();
          if (!current?.auth || JSON.stringify(current.auth) !== JSON.stringify(auth)) throw new AuthCoordinatorError("refresh_required");
          const next = { ...withoutChallenge(base), auth: { ...auth, account: { id: account.id, displayName: account.displayName, role: account.role } } };
          try { await session.save(next); } catch { throw new AuthCoordinatorError("auth_unavailable"); }
          lease.check();
          lease.commit(next.auth);
        }
        return result;
      } finally { lease.release(); }
    },
    async requestOtp(phone, role) {
      try {
        const previous = readSession();
        if (session.read() && !previous) throw new AuthCoordinatorError("unauthenticated");
        const expected = await ensureOtpReady();
        if (!expected || !((expected.mode === "sms" && expected.codeLength === 5) || (expected.mode === "local_simulated" && expected.codeLength === 6))) throw new AuthCoordinatorError("auth_unavailable");
        const issued = await gateway.requestOtp(phone);
        if (issued.delivery_mode !== expected.mode || issued.code_length !== expected.codeLength) throw new AuthCoordinatorError("auth_unavailable");
        const challenge: AuthChallengeContext = { trackingCode: issued.tracking_code, role, codeLength: issued.code_length, deliveryMode: issued.delivery_mode, expiresAt: deadlineFromTtl(now(), issued.expires_in) };
        const next: AuthSessionData = { sessionId: previous?.sessionId ?? uuid(), version: 1, challenge };
        await session.save(next);
        return { challenge: publicChallenge(challenge) };
      } catch (error) { throw safeError(error); }
    },
    async verifyOtp(code) {
      let base: AuthSessionData;
      let challenge: AuthChallengeContext;
      try {
        base = requireSession();
        challenge = requireChallenge();
        const normalizedCode = normalizeOtpCode(code, challenge.codeLength);
        let verified: UpstreamVerifyResult;
        try {
          verified = await gateway.verifyOtp({ trackingCode: challenge.trackingCode, code: normalizedCode, role: challenge.role }, { expectedCodeLength: challenge.codeLength });
        } catch (error) {
          if (terminalVerificationFailure(error)) await session.save(withoutChallenge(base));
          throw error;
        }
        const account = accountFrom(verified.user);
        const tokens = verified.tokens;
        const next: AuthSessionData = { ...withoutChallenge(base), auth: { accessToken: tokens.access_token, accessExpiresAt: deadlineFromTtl(now(), tokens.access_expires_in), refreshToken: tokens.refresh_token, refreshExpiresAt: deadlineFromTtl(now(), tokens.refresh_expires_in), account, generation: uuid() } };
        await session.save(next);
        return { ...publicAuth(account), ...(verified.is_new ? { onboardingTo: account.role === "specialist" ? "/pro/profile" as const : "/account" as const } : {}) };
      } catch (error) { throw safeError(error); }
    },
    challenge() { return publicChallenge(requireChallenge()); },
    async me() {
      try {
        const { auth } = requireAuth();
        if (auth.accessExpiresAt <= now()) throw new AuthCoordinatorError("refresh_required");
        return { account: accountFrom(await gateway.me(auth.accessToken)) };
      } catch (error) { throw safeError(error); }
    },
    async refresh() {
      let base: AuthSessionData; let auth: AuthCredentialContext; let key: string;
      try { ({ base, auth, key } = requireAuth()); } catch (error) { throw safeError(error); }
      if (auth.refreshExpiresAt <= now()) throw new AuthCoordinatorError("unauthenticated");
      try {
        return await refreshCoordinator.run(key, async (isCancelled) => {
          if (isCancelled()) throw new AuthCoordinatorError("refresh_cancelled");
          const lease = refreshCoordinator.claim(key, auth, true);
          let refreshed: UpstreamRefreshResult | undefined;
          try {
            refreshed = await gateway.refresh(auth.refreshToken);
            const account = accountFrom(await gateway.me(refreshed.tokens.access_token));
            const current = session.read()?.auth;
            if (isCancelled() || !current || current.generation !== auth.generation || current.refreshToken !== auth.refreshToken) throw new AuthCoordinatorError("refresh_cancelled");
            const next: AuthSessionData = { ...withoutChallenge(base), auth: { accessToken: refreshed.tokens.access_token, accessExpiresAt: deadlineFromTtl(now(), refreshed.tokens.access_expires_in), refreshToken: refreshed.tokens.refresh_token, refreshExpiresAt: deadlineFromTtl(now(), refreshed.tokens.refresh_expires_in), account, generation: auth.generation } };
            await session.save(next);
            if (isCancelled()) throw new AuthCoordinatorError("refresh_cancelled");
            lease.check();
            lease.commit(next.auth!);
            return { account };
          } catch (error) {
            if (refreshed) await revokeNewRefresh(refreshed.tokens.refresh_token);
            throw safeError(error);
          } finally { lease.release(); }
        });
      } catch (error) { throw safeError(error); }
    },
    async logout() {
      const current = session.read();
      const auth = current?.auth;
      if (!current || !auth) { session.destroy(); return; }
      const key = refreshKey(current, auth);
      await refreshCoordinator.cancelAndWait(key, auth.refreshExpiresAt);
      session.destroy();
      await revokeNewRefresh(auth.refreshToken);
    },
  };
}
