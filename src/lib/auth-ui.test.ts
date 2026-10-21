import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildOtpRequest,
  mapAuthError,
  parseAuthChallenge,
  parseAuthResult,
  otpSlots,
} from "./auth-ui.ts";

test("builds the exact request shape with the selected pre-verification role", () => {
  assert.deepEqual(buildOtpRequest("۰۹۱۲۱۲۳۴۵۶۷", "specialist"), {
    phone: "۰۹۱۲۱۲۳۴۵۶۷",
    role: "specialist",
  });
});

test("derives five or six presentation slots from the safe challenge", () => {
  assert.deepEqual(otpSlots(5), [0, 1, 2, 3, 4]);
  assert.deepEqual(otpSlots(6), [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(parseAuthChallenge({ expiresAt: 1_700_000_100_000, codeLength: 6, isSimulated: true }), {
    expiresAt: 1_700_000_100_000,
    codeLength: 6,
    isSimulated: true,
  });
  assert.throws(() => parseAuthChallenge({ expiresAt: 0, codeLength: 7, isSimulated: "yes" }));
});

test("accepts only authoritative fixed redirects and safe account summaries", () => {
  assert.deepEqual(parseAuthResult({
    account: { id: 12, displayName: "نمونه", role: "client" },
    redirectTo: "/dashboard",
  }), {
    account: { id: 12, displayName: "نمونه", role: "client" },
    redirectTo: "/dashboard",
  });
  assert.throws(() => parseAuthResult({
    account: { id: 12, displayName: "نمونه", role: "client" },
    redirectTo: "https://evil.example/steal",
  }));
  assert.equal(JSON.stringify({ account: { id: 12, displayName: "نمونه", role: "client" } }).includes("phone"), false);
});

test("maps pending-safe public errors without exposing response details", () => {
  assert.equal(mapAuthError(401, "challenge_missing"), "کد تایید در دسترس نیست؛ دوباره درخواست کد کن.");
  assert.equal(mapAuthError(422, "invalid_code"), "کد وارد شده صحیح نیست. دوباره تلاش کن.");
  assert.equal(mapAuthError(503, "auth_unavailable"), "سرویس ورود موقتاً در دسترس نیست.");
  assert.equal(mapAuthError(503, "invalid_challenge"), "اطلاعات کد معتبر نیست؛ کد جدید درخواست کن.");
  assert.equal(mapAuthError(500, "access-token-private"), "عملیات ورود انجام نشد. دوباره تلاش کن.");
});
