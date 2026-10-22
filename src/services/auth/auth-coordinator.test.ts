import assert from "node:assert/strict";
import { test } from "node:test";
import type { AccountSummary } from "../../lib/contracts/auth.ts";
import {
  AuthCoordinatorError,
  createAuthCoordinator,
  createRefreshCoordinator,
  type AuthGatewayPort,
  type AuthSessionData,
  type AuthSessionPort,
} from "./auth-coordinator.ts";

const now = 1_700_000_000_000;
const account: AccountSummary = { id: 47, displayName: "آزاده نمونه", role: "specialist" };

function tokenPair(suffix = "a") {
  return {
    access_token: `access-${suffix}`,
    access_expires_in: 900,
    refresh_token: `refresh-${suffix}`,
    refresh_expires_in: 2_592_000,
    token_type: "Bearer" as const,
  };
}

function session(initial?: AuthSessionData): AuthSessionPort & { saved: AuthSessionData[]; destroyed: number } {
  let state = initial;
  const saved: AuthSessionData[] = [];
  let destroyed = 0;
  return {
    get saved() { return saved; },
    get destroyed() { return destroyed; },
    read: () => state,
    save: async (next) => { state = structuredClone(next); saved.push(structuredClone(next)); },
    destroy: () => { state = undefined; destroyed += 1; },
  };
}

function gateway(overrides: Partial<AuthGatewayPort> = {}): AuthGatewayPort & { calls: Record<string, number> } {
  const calls = { requestOtp: 0, verifyOtp: 0, refresh: 0, me: 0, logoutRefresh: 0 };
  return {
    calls,
    requestOtp: async () => {
      calls.requestOtp += 1;
      return { tracking_code: "tracking-private", expires_in: 120, delivery_mode: "sms", code_length: 5 };
    },
    verifyOtp: async () => {
      calls.verifyOtp += 1;
      return { tokens: tokenPair(), is_new: false, user: { id: 47, display_name: "آزاده نمونه", roles: ["nahan_specialist"], phone: "09121234567" } };
    },
    refresh: async () => {
      calls.refresh += 1;
      return { tokens: tokenPair("rotated") };
    },
    me: async () => {
      calls.me += 1;
      return { id: 47, display_name: "آزاده نمونه", roles: ["nahan_specialist"], phone: null, specialist_post_id: 0 };
    },
    logoutRefresh: async () => { calls.logoutRefresh += 1; return { logged_out: true }; },
    ...overrides,
  };
}

function coordinator(
  authGateway = gateway(),
  authSession = session(),
  readiness: () => Promise<{mode:"sms";codeLength:5}> = async () => ({mode:"sms",codeLength:5}),
) {
  return {
    gateway: authGateway,
    session: authSession,
    coordinator: createAuthCoordinator({
      gateway: authGateway,
      session: authSession,
      now: () => now,
      uuid: () => "session-or-generation-id",
      ensureOtpReady: readiness,
      refreshCoordinator: createRefreshCoordinator(() => now),
    }),
  };
}

async function rejects(operation: () => Promise<unknown>, code: string, status: number): Promise<void> {
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof AuthCoordinatorError);
    assert.equal(error.code, code);
    assert.equal(error.status, status);
    const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
    for (const secret of ["tracking-private", "09121234567", "access-a", "refresh-a", "access-rotated", "refresh-rotated"]) {
      assert.equal(serialized.includes(secret), false);
    }
    return true;
  });
}

test("preserves safe upstream validation and rate semantics through actual callbacks", async () => {
  for (const [upstream, code, status] of [
    ["otp_rate_limited", "rate_limited", 429], ["otp_rate_limited_ip", "rate_limited", 429],
    ["otp_throttled", "rate_limited", 429], ["otp_too_many_attempts", "rate_limited", 429],
    ["invalid_phone", "invalid_request", 422], ["otp_consumed", "challenge_expired", 410],
  ] as const) {
    const fixture = coordinator(gateway({ verifyOtp: async () => { throw { code: upstream, message: "private" }; } }));
    await fixture.coordinator.requestOtp("09121234567", "client");
    await rejects(() => fixture.coordinator.verifyOtp("12345"), code, status);
  }
});

test('lost refresh credentials are 401, provider/config failures stay 503',async()=>{
 for(const upstream of ['invalid_refresh','revoked_refresh','expired_refresh','invalid_response']){
  const fixture=coordinator(gateway({refresh:async()=>{throw {code:upstream,message:'private'};}}));
  await fixture.coordinator.requestOtp('09121234567','client');await fixture.coordinator.verifyOtp('12345');
  await rejects(()=>fixture.coordinator.refresh(),upstream==='invalid_response'?'auth_unavailable':'unauthenticated',upstream==='invalid_response'?503:401);
 }
});

test("new-account onboarding is presentation from server role, not selected role permission", async () => {
  const fixture = coordinator(gateway({ verifyOtp: async () => ({tokens:tokenPair(),is_new:true,user:{id:47,display_name:"نام",roles:["nahan_specialist"],phone:"09121234567"}}) }));
  await fixture.coordinator.requestOtp("09121234567", "client");
  const result = await fixture.coordinator.verifyOtp("12345");
  assert.equal(result.account.role, "specialist");
  assert.equal((result as unknown as {onboardingTo:string}).onboardingTo, "/pro/profile");
});

test("gates OTP issuance before dispatch and stores only sealed challenge context", async () => {
  const blocked = coordinator(gateway(), session(), async () => { throw new AuthCoordinatorError("auth_unavailable", 503); });
  await rejects(() => blocked.coordinator.requestOtp("09121234567", "client"), "auth_unavailable", 503);
  assert.equal(blocked.gateway.calls.requestOtp, 0);

  const active = coordinator();
  assert.deepEqual(await active.coordinator.requestOtp("09121234567", "client"), {
    challenge: { expiresAt: now + 120_000, codeLength: 5, isSimulated: false },
  });
  assert.equal(active.gateway.calls.requestOtp, 1);
  assert.deepEqual(active.session.saved[0], {
    sessionId: "session-or-generation-id",
    version: 1,
    challenge: {
      trackingCode: "tracking-private",
      role: "client",
      codeLength: 5,
      deliveryMode: "sms",
      expiresAt: now + 120_000,
    },
  });
  assert.equal(JSON.stringify(active.session.saved[0]).includes("09121234567"), false);
});

test("uses server-stored challenge dimensions, consumes it before verification, and honors backend role", async () => {
  const active = coordinator();
  await active.coordinator.requestOtp("09121234567", "client");
  const verified = await active.coordinator.verifyOtp("۱۲۳۴۵");
  assert.deepEqual(verified, { account, redirectTo: "/pro" });
  assert.equal(active.gateway.calls.verifyOtp, 1);
  const sealed = active.session.saved[1];
  assert.deepEqual(sealed.auth?.account, account);
  assert.equal(sealed.challenge, undefined);
  assert.equal(JSON.stringify(sealed).includes("tracking-private"), false);

  const six = coordinator();
  await six.session.save({
    sessionId: "six-session",
    version: 1,
    challenge: { trackingCode: "tracking-6", role: "specialist", codeLength: 6, deliveryMode: "local_simulated", expiresAt: now + 1 },
  });
  await rejects(() => six.coordinator.verifyOtp("12345"), "invalid_code", 422);
  assert.equal(six.gateway.calls.verifyOtp, 0);
});

test("never grants a session from expired, missing, or unsupported-role challenge results", async () => {
  const expired = coordinator();
  await expired.session.save({ sessionId: "expired", version: 1, challenge: { trackingCode: "t", role: "client", codeLength: 5, deliveryMode: "sms", expiresAt: now } });
  await rejects(() => expired.coordinator.verifyOtp("12345"), "challenge_expired", 410);
  assert.equal(expired.gateway.calls.verifyOtp, 0);

  const invalidRoleGateway = gateway({
    verifyOtp: async () => ({ tokens: tokenPair(), is_new: false, user: { id: 47, display_name: "x", roles: ["administrator"], phone: "09121234567" } }),
  });
  const invalidRole = coordinator(invalidRoleGateway);
  await invalidRole.coordinator.requestOtp("09121234567", "client");
  await rejects(() => invalidRole.coordinator.verifyOtp("12345"), "unsupported_role", 403);
  assert.equal(invalidRole.session.read()?.auth, undefined);
});

test("returns safe GET projections without exposing tracking or saving on reads", async () => {
  const active = coordinator();
  await active.coordinator.requestOtp("09121234567", "client");
  assert.deepEqual(active.coordinator.challenge(), { expiresAt: now + 120_000, codeLength: 5, isSimulated: false });
  assert.equal(JSON.stringify(active.coordinator.challenge()).includes("tracking"), false);
  const savedBefore = active.session.saved.length;
  await active.coordinator.verifyOtp("12345");
  assert.deepEqual(await active.coordinator.me(), { account });
  assert.equal(active.session.saved.length, savedBefore + 1);

  const stale = coordinator(undefined, session({ sessionId: "s", version: 1, auth: {
    accessToken: "expired", accessExpiresAt: now, refreshToken: "refresh", refreshExpiresAt: now + 1, account, generation: "g",
  } }));
  await rejects(() => stale.coordinator.me(), "refresh_required", 401);
  assert.equal(stale.gateway.calls.me, 0);
});

test("coalesces refresh by generation and prevents a logout race from restoring local auth", async () => {
  let releaseRefresh: (() => void) | undefined;
  const refreshStarted = new Promise<void>((resolve) => { releaseRefresh = resolve; });
  const rotatingGateway = gateway({
    refresh: async () => {
      rotatingGateway.calls.refresh += 1;
      await refreshStarted;
      return { tokens: tokenPair("rotated") };
    },
  });
  const authSession = session({
    sessionId: "race-session",
    version: 1,
    auth: { accessToken: "access-a", accessExpiresAt: now + 1, refreshToken: "refresh-a", refreshExpiresAt: now + 2, account, generation: "generation-a" },
  });
  const refreshCoordinator = createRefreshCoordinator(() => now);
  const active = createAuthCoordinator({ gateway: rotatingGateway, session: authSession, now: () => now, uuid: () => "unused", ensureOtpReady: async () => ({ mode: "sms", codeLength: 5 }), refreshCoordinator });
  const first = active.refresh();
  const second = active.refresh();
  assert.equal(rotatingGateway.calls.refresh, 1);
  const logout = active.logout();
  releaseRefresh?.();
  await rejects(() => first, "refresh_cancelled", 401);
  await rejects(() => second, "refresh_cancelled", 401);
  await logout;
  assert.equal(authSession.destroyed, 1);
  assert.equal(authSession.read(), undefined);
  assert.equal(rotatingGateway.calls.logoutRefresh, 2);
  assert.equal(authSession.saved.some((entry) => entry.auth?.refreshToken === "refresh-rotated"), false);
});

test("keeps retryable challenges but clears only successful or terminal verification outcomes", async () => {
  let firstAttempt = true;
  const retryGateway = gateway({
    verifyOtp: async () => {
      retryGateway.calls.verifyOtp += 1;
      if (firstAttempt) {
        firstAttempt = false;
        throw Object.assign(new Error("wrong code"), { code: "otp_invalid" });
      }
      return { tokens: tokenPair(), is_new: false, user: { id: 47, display_name: "آزاده نمونه", roles: ["nahan_specialist"], phone: "09121234567" } };
    },
  });
  const retry = coordinator(retryGateway);
  await retry.coordinator.requestOtp("09121234567", "client");
  await rejects(() => retry.coordinator.verifyOtp("00000"), "invalid_code", 422);
  assert.equal(retry.session.read()?.challenge?.trackingCode, "tracking-private");
  assert.deepEqual(await retry.coordinator.verifyOtp("12345"), { account, redirectTo: "/pro" });
  assert.equal(retry.session.read()?.challenge, undefined);
  assert.equal(retry.session.read()?.auth?.account.role, "specialist");

  const terminalGateway = gateway({
    verifyOtp: async () => { throw Object.assign(new Error("expired"), { code: "otp_expired" }); },
  });
  const terminal = coordinator(terminalGateway);
  await terminal.coordinator.requestOtp("09121234567", "client");
  await rejects(() => terminal.coordinator.verifyOtp("12345"), "challenge_expired", 410);
  assert.equal(terminal.session.read()?.challenge, undefined);
  assert.equal(terminal.session.read()?.auth, undefined);
});

test("serializes refresh finalization across distinct route session ports and rejects stale sealed auth", async () => {
  const initial: AuthSessionData = {
    sessionId: "9aa0a1b2-c3d4-4e5f-8a90-b1c2d3e4f5a6",
    version: 1,
    auth: { accessToken: "access-a", accessExpiresAt: now + 1, refreshToken: "refresh-a", refreshExpiresAt: now + 2, account, generation: "84e86fd2-2205-4880-a65c-4b8da64489f1" },
  };
  const events: string[] = [];
  let saveEntered!: () => void;
  let releaseSave!: () => void;
  const saveStarted = new Promise<void>((resolve) => { saveEntered = resolve; });
  const saveRelease = new Promise<void>((resolve) => { releaseSave = resolve; });
  function routePort(name: string, blockSave: boolean): AuthSessionPort & { readonly destroyed: number; state(): AuthSessionData | undefined } {
    let state: AuthSessionData | undefined = structuredClone(initial);
    let destroyed = 0;
    return {
      get destroyed() { return destroyed; },
      state: () => state,
      read: () => state,
      save: async (next) => {
        events.push(`${name}:save-start`);
        if (blockSave) {
          saveEntered();
          await saveRelease;
        }
        state = structuredClone(next);
        events.push(`${name}:save-end`);
      },
      destroy: () => { state = undefined; destroyed += 1; events.push(`${name}:destroy`); },
    };
  }
  const refreshPort = routePort("refresh", true);
  const logoutPort = routePort("logout", false);
  const stalePort = routePort("stale", false);
  const refreshCoordinator = createRefreshCoordinator(() => now);
  const rotatingGateway = gateway();
  const refreshing = createAuthCoordinator({ gateway: rotatingGateway, session: refreshPort, now: () => now, uuid: () => "unused", ensureOtpReady: async () => ({ mode: "sms", codeLength: 5 }), refreshCoordinator });
  const loggingOut = createAuthCoordinator({ gateway: rotatingGateway, session: logoutPort, now: () => now, uuid: () => "unused", ensureOtpReady: async () => ({ mode: "sms", codeLength: 5 }), refreshCoordinator });
  const stale = createAuthCoordinator({ gateway: rotatingGateway, session: stalePort, now: () => now, uuid: () => "unused", ensureOtpReady: async () => ({ mode: "sms", codeLength: 5 }), refreshCoordinator });

  const refresh = refreshing.refresh();
  await saveStarted;
  const logout = loggingOut.logout();
  await Promise.resolve();
  assert.equal(logoutPort.destroyed, 0);
  releaseSave();
  await rejects(() => refresh, "refresh_cancelled", 401);
  await logout;
  assert.equal(logoutPort.destroyed, 1);
  assert.equal(events.at(-1), "logout:destroy");
  assert.equal(rotatingGateway.calls.logoutRefresh, 2);
  const meCalls = rotatingGateway.calls.me;
  await rejects(() => stale.me(), "unauthenticated", 401);
  assert.equal(stalePort.destroyed, 1);
  assert.equal(rotatingGateway.calls.me, meCalls);
});



test("never evicts unsettled refresh generations when the bounded coordinator crosses 512 live entries", async () => {
  const refreshCoordinator = createRefreshCoordinator(() => now);
  const releases: Array<() => void> = [];
  const operations: Array<Promise<void>> = [];
  for (let index = 0; index < 513; index += 1) {
    const key = `live-generation-${index}`;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    releases.push(release);
    operations.push(refreshCoordinator.run(key, async (isCancelled) => {
      await pending;
      if (isCancelled()) {
        throw new AuthCoordinatorError("refresh_cancelled");
      }
    }));
  }
  await Promise.resolve();

  const cancellation = refreshCoordinator.cancelAndWait("live-generation-0");
  await Promise.resolve();
  releases[0]();
  await cancellation;
  await assert.rejects(operations[0], (error: unknown) => {
    assert.ok(error instanceof AuthCoordinatorError);
    assert.equal(error.code, "refresh_cancelled");
    return true;
  });

  for (let index = 1; index < releases.length; index += 1) {
    releases[index]();
  }
  const settled = await Promise.allSettled(operations);
  assert.equal(settled.filter((result) => result.status === "rejected").length, 2);
});




test("records an absent cancellation tombstone at live-capacity saturation and expires it safely", async () => {
  let clock = now;
  const refreshCoordinator = createRefreshCoordinator(() => clock);
  const releases: Array<() => void> = [];
  const operations: Array<Promise<void>> = [];
  for (let index = 0; index < 512; index += 1) {
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    releases.push(release);
    operations.push(refreshCoordinator.run(`saturated-generation-${index}`, async () => pending));
  }
  await Promise.resolve();

  await refreshCoordinator.cancelAndWait("absent-after-saturation");
  releases[0]();
  await operations[0];
  let staleOperationStarted = false;
  await assert.rejects(
    refreshCoordinator.run("absent-after-saturation", async () => { staleOperationStarted = true; }),
    (error: unknown) => {
      assert.ok(error instanceof AuthCoordinatorError);
      assert.equal(error.code, "refresh_cancelled");
      return true;
    },
  );
  assert.equal(staleOperationStarted, false);

  for (let index = 1; index < releases.length; index += 1) releases[index]();
  await Promise.all(operations.slice(1));
  clock += 5_001;
  await assert.doesNotReject(refreshCoordinator.run("absent-after-saturation", async () => undefined));
});


test("keeps remote logout failure local-terminal and never serializes credentials", async () => {
  const failingGateway = gateway({ logoutRefresh: async () => { throw new Error("refresh-a remote failure"); } });
  const active = coordinator(failingGateway, session({
    sessionId: "logout-session", version: 1,
    auth: { accessToken: "access-a", accessExpiresAt: now + 1, refreshToken: "refresh-a", refreshExpiresAt: now + 2, account, generation: "generation-a" },
  }));
  await assert.doesNotReject(() => active.coordinator.logout());
  assert.equal(active.session.destroyed, 1);
  assert.equal(active.session.read(), undefined);
});
