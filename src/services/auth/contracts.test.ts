import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AuthResponseError,
  parseUpstreamLogoutResult,
  parseUpstreamMeUser,
  parseUpstreamOtpChallenge,
  parseUpstreamRefreshResult,
  parseUpstreamTokenPair,
  parseUpstreamVerifyResult,
} from "./contracts.ts";

const tokens = Object.freeze({
  access_token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjQ3LCJ0eXBlIjoiYWNjZXNzIn0.synthetic-signature",
  access_expires_in: 900,
  refresh_token: "f5c26ab3447d73a4d90dcaa352d8ecf51b064dbd4731f34abc5c98a351d7de22",
  refresh_expires_in: 2_592_000,
  token_type: "Bearer",
});
const verifiedUser = Object.freeze({
  id: 47,
  display_name: "آزاده نمونه",
  roles: Object.freeze(["nahan_specialist"]),
  phone: "09129876543",
});
const verified = Object.freeze({ tokens, is_new: false, user: verifiedUser });
const currentUser = Object.freeze({ ...verifiedUser, specialist_post_id: 71 });
const challenge = Object.freeze({
  tracking_code: "f64a7a08-a32a-4d61-9be7-c425a8b8ee4c",
  expires_in: 120,
});
const invalidPositiveIntegers: readonly unknown[] = [
  0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "120", null, undefined,
];

function assertInvalidResponse(operation: () => unknown): void {
  assert.throws(operation, (error: unknown) => {
    assert.ok(error instanceof AuthResponseError);
    assert.equal(error.code, "invalid_response");
    assert.equal(error.status, 502);
    assert.match(error.message, /[؀-ۿ]/u);
    assert.equal("cause" in error, false);
    assert.equal("data" in error, false);
    const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
    for (const secret of [
      tokens.access_token,
      tokens.refresh_token,
      verifiedUser.phone,
      challenge.tracking_code,
      "58319",
      "synthetic-raw-response",
      "access_token",
      "refresh_token",
    ]) {
      assert.equal(serialized.includes(secret), false);
    }
    return true;
  });
}

function assertRequiredFields(
  parse: (value: unknown) => unknown,
  fixture: Record<string, unknown>,
): void {
  for (const field of Object.keys(fixture)) {
    const incomplete = { ...fixture };
    delete incomplete[field];
    assertInvalidResponse(() => parse(incomplete));
  }
}

// Break caught: passing raw data through preserves unknown fields or invents a resend TTL.
test("parses a challenge with its actual TTL and discards unknown fields", () => {
  const input = Object.freeze({
    ...challenge,
    expires_in: 37,
    resend_after: 60,
    unknown_backend_field: "synthetic-raw-response",
  });
  assert.deepEqual(parseUpstreamOtpChallenge(input), {
    tracking_code: "f64a7a08-a32a-4d61-9be7-c425a8b8ee4c",
    expires_in: 37,
  });
});

test("rejects missing, empty or malformed challenge fields and unsafe TTLs", () => {
  assertRequiredFields(parseUpstreamOtpChallenge, challenge);
  for (const expires_in of invalidPositiveIntegers) {
    assertInvalidResponse(() => parseUpstreamOtpChallenge({ ...challenge, expires_in }));
  }
  for (const tracking_code of ["", "   ", null, 23, undefined]) {
    assertInvalidResponse(() => parseUpstreamOtpChallenge({ ...challenge, tracking_code }));
  }
});

test("parses all token-pair fields without hardcoding backend lifetimes", () => {
  assert.deepEqual(
    parseUpstreamTokenPair(Object.freeze({
      ...tokens,
      access_expires_in: 73,
      refresh_expires_in: 86401,
      unknown_backend_field: "synthetic-raw-response",
    })),
    {
      access_token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjQ3LCJ0eXBlIjoiYWNjZXNzIn0.synthetic-signature",
      access_expires_in: 73,
      refresh_token: "f5c26ab3447d73a4d90dcaa352d8ecf51b064dbd4731f34abc5c98a351d7de22",
      refresh_expires_in: 86401,
      token_type: "Bearer",
    },
  );
});

test("rejects missing or malformed token-pair fields with no defaults", () => {
  assertRequiredFields(parseUpstreamTokenPair, tokens);
  for (const field of ["access_expires_in", "refresh_expires_in"]) {
    for (const value of invalidPositiveIntegers) {
      assertInvalidResponse(() => parseUpstreamTokenPair({ ...tokens, [field]: value }));
    }
  }
  for (const field of ["access_token", "refresh_token"]) {
    for (const value of ["", " \n", null, 47, undefined]) {
      assertInvalidResponse(() => parseUpstreamTokenPair({ ...tokens, [field]: value }));
    }
  }
  for (const token_type of ["bearer", "Basic", "", null, true, undefined]) {
    assertInvalidResponse(() => parseUpstreamTokenPair({ ...tokens, token_type }));
  }
});

test("parses a complete verify result into fresh nested DTOs", () => {
  const input = Object.freeze({
    ...verified,
    tokens: Object.freeze({ ...tokens, unknown_backend_field: "synthetic-raw-response" }),
    user: Object.freeze({ ...verifiedUser, unknown_backend_field: "synthetic-raw-response" }),
    unknown_backend_field: "synthetic-raw-response",
  });
  const parsed = parseUpstreamVerifyResult(input);
  assert.deepEqual(parsed, {
    tokens: {
      access_token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjQ3LCJ0eXBlIjoiYWNjZXNzIn0.synthetic-signature",
      access_expires_in: 900,
      refresh_token: "f5c26ab3447d73a4d90dcaa352d8ecf51b064dbd4731f34abc5c98a351d7de22",
      refresh_expires_in: 2_592_000,
      token_type: "Bearer",
    },
    is_new: false,
    user: {
      id: 47,
      display_name: "آزاده نمونه",
      roles: ["nahan_specialist"],
      phone: "09129876543",
    },
  });
  assert.notEqual(parsed, input);
  assert.notEqual(parsed.tokens, input.tokens);
  assert.notEqual(parsed.user, input.user);
  assert.notEqual(parsed.user.roles, input.user.roles);
  assert.equal(parseUpstreamVerifyResult({ ...verified, is_new: true }).is_new, true);
});

test("rejects missing verify fields, nonboolean is_new and malformed nested tokens", () => {
  assertRequiredFields(parseUpstreamVerifyResult, verified);
  for (const is_new of ["false", 0, 1, null, undefined]) {
    assertInvalidResponse(() => parseUpstreamVerifyResult({ ...verified, is_new }));
  }
  for (const value of [null, {}, { ...tokens, refresh_expires_in: 0 }]) {
    assertInvalidResponse(() => parseUpstreamVerifyResult({ ...verified, tokens: value }));
  }
});

test("rejects incomplete verified users, unsafe IDs and wrong field types", () => {
  for (const field of Object.keys(verifiedUser)) {
    const user: Record<string, unknown> = { ...verifiedUser };
    delete user[field];
    assertInvalidResponse(() => parseUpstreamVerifyResult({ ...verified, user }));
  }
  for (const id of invalidPositiveIntegers) {
    assertInvalidResponse(() => parseUpstreamVerifyResult({ ...verified, user: { ...verifiedUser, id } }));
  }
  for (const [field, values] of [
    ["display_name", [null, 47, undefined]],
    ["phone", [null, 47, undefined]],
    ["roles", [null, "nahan_client", ["nahan_client", 42], [null], new Array(1)]],
  ] as const) {
    for (const value of values) {
      assertInvalidResponse(() => parseUpstreamVerifyResult({ ...verified, user: { ...verifiedUser, [field]: value } }));
    }
  }
  assertInvalidResponse(() => parseUpstreamVerifyResult({ ...verified, user: null }));
});

test("keeps backend role strings and empty display names for conservative policy", () => {
  const parsed = parseUpstreamVerifyResult({
    ...verified,
    user: { ...verifiedUser, display_name: "", roles: ["administrator", "nahan_specialist"] },
  });
  assert.equal(parsed.user.display_name, "");
  assert.deepEqual(parsed.user.roles, ["administrator", "nahan_specialist"]);
});

test("parses the required refresh wrapper and discards unknown fields", () => {
  assert.deepEqual(
    parseUpstreamRefreshResult(Object.freeze({ tokens, unknown_backend_field: "synthetic-raw-response" })),
    { tokens: {
      access_token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjQ3LCJ0eXBlIjoiYWNjZXNzIn0.synthetic-signature",
      access_expires_in: 900,
      refresh_token: "f5c26ab3447d73a4d90dcaa352d8ecf51b064dbd4731f34abc5c98a351d7de22",
      refresh_expires_in: 2_592_000,
      token_type: "Bearer",
    } },
  );
});

test("rejects naked, missing or malformed refresh token pairs", () => {
  for (const value of [tokens, {}, { tokens: null }, { tokens: {} }, { tokens: { ...tokens, token_type: "Basic" } }]) {
    assertInvalidResponse(() => parseUpstreamRefreshResult(value));
  }
});

test("parses current-user phone null and specialist ID zero only where documented", () => {
  assert.deepEqual(
    parseUpstreamMeUser(Object.freeze({ ...currentUser, phone: null, specialist_post_id: 0, unknown_backend_field: "synthetic-raw-response" })),
    { id: 47, display_name: "آزاده نمونه", roles: ["nahan_specialist"], phone: null, specialist_post_id: 0 },
  );
  assert.deepEqual(parseUpstreamMeUser(currentUser), {
    id: 47,
    display_name: "آزاده نمونه",
    roles: ["nahan_specialist"],
    phone: "09129876543",
    specialist_post_id: 71,
  });
});

test("rejects incomplete current users and invalid IDs, roles, names or phone types", () => {
  assertRequiredFields(parseUpstreamMeUser, currentUser);
  for (const id of invalidPositiveIntegers) {
    assertInvalidResponse(() => parseUpstreamMeUser({ ...currentUser, id }));
  }
  for (const specialist_post_id of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, "0", null, undefined]) {
    assertInvalidResponse(() => parseUpstreamMeUser({ ...currentUser, specialist_post_id }));
  }
  for (const [field, values] of [
    ["display_name", [null, 47, undefined]],
    ["phone", [47, false, undefined]],
    ["roles", [null, {}, "nahan_specialist", [47], new Array(1)]],
  ] as const) {
    for (const value of values) {
      assertInvalidResponse(() => parseUpstreamMeUser({ ...currentUser, [field]: value }));
    }
  }
});

test("requires a true logout acknowledgment rather than pretending success", () => {
  assert.deepEqual(parseUpstreamLogoutResult(Object.freeze({ logged_out: true, unknown_backend_field: "synthetic-raw-response" })), { logged_out: true });
  for (const value of [{}, { logged_out: false }, { logged_out: "true" }, { logged_out: 1 }, { logged_out: null }]) {
    assertInvalidResponse(() => parseUpstreamLogoutResult(value));
  }
});

test("rejects null, array and primitive payloads for every upstream operation", () => {
  for (const parse of [
    parseUpstreamOtpChallenge,
    parseUpstreamTokenPair,
    parseUpstreamVerifyResult,
    parseUpstreamRefreshResult,
    parseUpstreamMeUser,
    parseUpstreamLogoutResult,
  ]) {
    for (const value of [null, undefined, [], "synthetic-raw-response", 47, true]) {
      assertInvalidResponse(() => parse(value));
    }
  }
});
