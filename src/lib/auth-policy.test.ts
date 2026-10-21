import assert from "node:assert/strict";
import { test } from "node:test";
import {
  deadlineFromTtl,
  getAccountHome,
  normalizeIranianPhone,
  normalizeOtpCode,
  resolveAccountRole,
  toAccountSummary,
} from "./auth-policy.ts";
import type { RegistrationRole } from "./contracts/auth.ts";

function assertSafeValidationFailure(
  operation: () => unknown,
  code: string,
  rejectedValue: unknown,
): void {
  assert.throws(operation, (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.equal((error as Error & { status: number }).status, 422);
    assert.equal((error as Error & { code: string }).code, code);
    assert.match(error.message, /[؀-ۿ]/u);
    assert.equal("cause" in error, false);
    assert.equal("data" in error, false);
    if (typeof rejectedValue === "string" && rejectedValue.trim().length > 0) {
      const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
      assert.equal(serialized.includes(rejectedValue), false);
    }
    return true;
  });
}

// Break caught: stripping letters or misreading a prefix grants an invalid phone.
for (const [name, input] of [
  ["Persian digits", "۰۹۱۲۱۲۳۴۵۶۷"],
  ["Arabic digits", "٠٩١٢١٢٣٤٥٦٧"],
  ["plus-country prefix", "+98 912 123 4567"],
  ["international dialing prefix", "0098(912)123-4567"],
  ["bare mobile", "9121234567"],
  ["country prefix", "989121234567"],
  ["domestic punctuation", " (0912) 123-4567 "],
  ["nonbreaking spaces", "+98 912 123 4567"],
] as const) {
  test(`normalizes ${name} to the literal domestic mobile number`, () => {
    assert.equal(normalizeIranianPhone(input), "09121234567");
  });
}

test("rejects malformed phones without reflecting the rejected value", () => {
  for (const input of [
    "phone-secret-text",
    "09121234567abc",
    "08121234567",
    "02112345678",
    "0912123456",
    "091212345678",
    "+97 912 123 4567",
    "+9809121234567",
    "009809121234567",
    "++989121234567",
    "98+9121234567",
    "0912.123.4567",
    "",
    "   ",
    null,
    undefined,
    9121234567,
  ]) {
    assertSafeValidationFailure(
      () => normalizeIranianPhone(input as string),
      "invalid_phone",
      input,
    );
  }
});

// Break caught: numeric coercion drops a leading zero or admits non-five-digit codes.
for (const [name, input, expected] of [
  ["Persian leading zero", "۰۱۲۳۴", "01234"],
  ["Arabic leading zero", "٠١٢٣٤", "01234"],
  ["ASCII leading zero", "01234", "01234"],
  ["arbitrary code", "58319", "58319"],
  ["all zeros", "00000", "00000"],
] as const) {
  test(`normalizes the ${name} OTP as a string`, () => {
    assert.equal(normalizeOtpCode(input), expected);
  });
}

test("rejects wrong-length and non-digit OTPs with a safe validation error", () => {
  for (const input of [
    "1234",
    "123456",
    "12a34",
    "otp-secret-text",
    " 01234",
    "01234 ",
    "01 234",
    "01234\n",
    "",
    null,
    undefined,
    12345,
  ]) {
    assertSafeValidationFailure(
      () => normalizeOtpCode(input as string),
      "otp_invalid",
      input,
    );
  }
});

// Break caught: defaulting, de-duplicating or prioritizing roles grants unintended access.
for (const [name, roles, expected] of [
  ["client only", ["nahan_client"], "client"],
  ["specialist only", ["nahan_specialist"], "specialist"],
  ["no roles", [], null],
  ["unknown role", ["subscriber"], null],
  ["administrator", ["administrator"], null],
  ["UI alias", ["pro"], null],
  ["registration role is not a backend role", ["client"], null],
  ["both supported roles", ["nahan_client", "nahan_specialist"], null],
  ["admin mixed with client", ["administrator", "nahan_client"], null],
  ["unknown mixed with specialist", ["nahan_specialist", "subscriber"], null],
  ["duplicate client", ["nahan_client", "nahan_client"], null],
  ["duplicate specialist", ["nahan_specialist", "nahan_specialist"], null],
] as const) {
  test(`resolves ${name} conservatively`, () => {
    assert.equal(resolveAccountRole(roles), expected);
  });
}

test("returns only fixed allowlisted account home paths", () => {
  assert.equal(getAccountHome("client"), "/dashboard");
  assert.equal(getAccountHome("specialist"), "/pro");
  assert.equal(getAccountHome(null), null);
  assert.equal(getAccountHome("https://evil.example/" as RegistrationRole), null);
});

test("projects only the declared account fields from backend roles", () => {
  const user = Object.freeze({
    id: 47,
    display_name: "آزاده نمونه",
    roles: Object.freeze(["nahan_specialist"]),
    phone: "09129876543",
    access_token: "synthetic-summary-access-secret",
    refresh_token: "synthetic-summary-refresh-secret",
    tracking_code: "synthetic-summary-tracking-secret",
    unknown_backend_field: "synthetic-raw-secret",
  });

  const summary = toAccountSummary(user);
  assert.deepEqual(summary, {
    id: 47,
    displayName: "آزاده نمونه",
    role: "specialist",
  });
  assert.equal(
    JSON.stringify(summary),
    '{"id":47,"displayName":"آزاده نمونه","role":"specialist"}',
  );
  assert.notEqual(summary, user);
});

test("does not invent a display name or fallback role for an unsupported account", () => {
  assert.deepEqual(
    toAccountSummary({ id: 51, display_name: "", roles: ["administrator"] }),
    { id: 51, displayName: "", role: null },
  );
});

// Break caught: using a fixed lifetime, converting twice, or allowing unsafe arithmetic.
for (const [name, nowMs, ttlSeconds, expected] of [
  ["OTP lifetime", 1_700_000_000_000, 120, 1_700_000_120_000],
  ["access lifetime", 1_700_000_000_000, 900, 1_700_000_900_000],
  ["refresh lifetime", 1_700_000_000_000, 2_592_000, 1_702_592_000_000],
  ["alternate backend lifetime", 1_700_000_000_000, 37, 1_700_000_037_000],
  ["epoch", 0, 1, 1000],
  ["safe upper boundary", 9_007_199_254_739_991, 1, 9_007_199_254_740_991],
] as const) {
  test(`computes the ${name} deadline from the caller's clock`, () => {
    assert.equal(deadlineFromTtl(nowMs, ttlSeconds), expected);
  });
}

test("rejects invalid clocks, TTLs and overflowing deadlines", () => {
  for (const [nowMs, ttlSeconds] of [
    [-1, 120],
    [1.5, 120],
    [NaN, 120],
    [Infinity, 120],
    [-Infinity, 120],
    [Number.MAX_SAFE_INTEGER + 1, 1],
    [1_700_000_000_000, 0],
    [1_700_000_000_000, -1],
    [1_700_000_000_000, 1.5],
    [1_700_000_000_000, NaN],
    [1_700_000_000_000, Infinity],
    [0, Number.MAX_SAFE_INTEGER],
    [Number.MAX_SAFE_INTEGER, 1],
  ]) {
    assertSafeValidationFailure(
      () => deadlineFromTtl(nowMs, ttlSeconds),
      "invalid_deadline",
      undefined,
    );
  }
});

test("normalizes exactly the stored five- or six-digit OTP length", () => {
  assert.equal(normalizeOtpCode("۰۱۲۳۴", 5), "01234");
  assert.equal(normalizeOtpCode("١٤٥٦٣٢", 6), "145632");

  for (const [value, expectedLength] of [
    ["145632", 5],
    ["01234", 6],
    ["12345", 7],
    ["123456", 0],
  ] as const) {
    assertSafeValidationFailure(
      () => normalizeOtpCode(value, expectedLength as 5 | 6),
      "otp_invalid",
      value,
    );
  }
});
