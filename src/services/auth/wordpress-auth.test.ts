import assert from "node:assert/strict";
import { test } from "node:test";
import { toAccountSummary } from "../../lib/auth-policy.ts";
import { WordPressApiError } from "../wordpress/errors.ts";
import type { WordPressRequestOptions } from "../wordpress/rest-client.ts";
import {
  AuthGatewayError,
  createWordPressAuthGateway,
  type WordPressAuthGateway,
  type WordPressAuthRequest,
} from "./wordpress-auth.ts";

const PHONE = "09129876543";
const OTP = "58319";
const TRACKING = "f64a7a08-a32a-4d61-9be7-c425a8b8ee4c";
const ACCESS = "synthetic-opaque-access-credential";
const REFRESH = "f5c26ab3447d73a4d90dcaa352d8ecf51b064dbd4731f34abc5c98a351d7de22";
const tokens = Object.freeze({
  access_token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjQ3LCJ0eXBlIjoiYWNjZXNzIn0.synthetic-signature",
  access_expires_in: 900,
  refresh_token: REFRESH,
  refresh_expires_in: 2_592_000,
  token_type: "Bearer",
});
const user = Object.freeze({
  id: 47,
  display_name: "آزاده نمونه",
  roles: Object.freeze(["nahan_specialist"]),
  phone: PHONE,
});
const verified = Object.freeze({ tokens, is_new: false, user });
const verificationInput = Object.freeze({
  trackingCode: TRACKING,
  code: OTP,
  role: "specialist" as const,
});

function captureRequest(response: unknown): {
  request: WordPressAuthRequest;
  calls: { path: string; options?: WordPressRequestOptions }[];
} {
  const calls: { path: string; options?: WordPressRequestOptions }[] = [];
  return {
    calls,
    request: async (path, options) => {
      calls.push({ path, options });
      return response;
    },
  };
}

async function assertSafeFailure(
  operation: () => Promise<unknown>,
  expectedCode: string,
  expectedStatus: number,
): Promise<AuthGatewayError> {
  let captured: AuthGatewayError | undefined;
  await assert.rejects(operation, (error: unknown) => {
    assert.ok(error instanceof AuthGatewayError);
    assert.equal(error.code, expectedCode);
    assert.equal(error.status, expectedStatus);
    assert.match(error.message, /[؀-ۿ]/u);
    assert.equal("data" in error, false);
    assert.equal("cause" in error, false);
    const serialized = JSON.stringify(error, Object.getOwnPropertyNames(error));
    for (const secret of [
      PHONE, "+98 912 987 6543", "۰۹۱۲۹۸۷۶۵۴۳", OTP, "۰۱۲۳۴", TRACKING,
      ACCESS, REFRESH, tokens.access_token, "synthetic-raw-backend-payload",
      "arbitrary_backend_error", "access_token", "refresh_token", "authorization",
    ]) {
      assert.equal(serialized.includes(secret), false);
    }
    captured = error;
    return true;
  });
  assert.ok(captured);
  return captured;
}

// Break caught: double namespace, wrong method/body, or unnormalized credentials.
test("requests an OTP with only the canonical phone at the fixed REST boundary", async () => {
  const external = captureRequest({ tracking_code: TRACKING, expires_in: 37, resend_after: 60 });
  const gateway = createWordPressAuthGateway(external.request);
  assert.deepEqual(await gateway.requestOtp("+98 912 987 6543"), {
    tracking_code: "f64a7a08-a32a-4d61-9be7-c425a8b8ee4c",
    expires_in: 37,
    delivery_mode: "sms",
    code_length: 5,
  });
  assert.deepEqual(external.calls, [{
    path: "auth/otp/request",
    options: { method: "POST", body: { phone: "09129876543" } },
  }]);
});

test("verifies a normalized OTP with explicit registration intent and bounded device ID", async () => {
  const external = captureRequest({ ...verified, is_new: true, unknown_backend_field: "discard" });
  const gateway = createWordPressAuthGateway(external.request);
  const result = await gateway.verifyOtp({
    trackingCode: TRACKING,
    code: "۰۱۲۳۴",
    role: "specialist",
    deviceId: "d".repeat(64),
  });
  assert.deepEqual(result, {
    tokens: {
      access_token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjQ3LCJ0eXBlIjoiYWNjZXNzIn0.synthetic-signature",
      access_expires_in: 900,
      refresh_token: "f5c26ab3447d73a4d90dcaa352d8ecf51b064dbd4731f34abc5c98a351d7de22",
      refresh_expires_in: 2_592_000,
      token_type: "Bearer",
    },
    is_new: true,
    user: { id: 47, display_name: "آزاده نمونه", roles: ["nahan_specialist"], phone: "09129876543" },
  });
  assert.deepEqual(external.calls, [{
    path: "auth/otp/verify",
    options: {
      method: "POST",
      body: { tracking_code: TRACKING, code: "01234", role: "specialist", device_id: "d".repeat(64) },
    },
  }]);
});

test("omits an absent device ID and follows existing-account backend roles rather than intent", async () => {
  const external = captureRequest({ ...verified, user: { ...user, roles: ["nahan_client"] } });
  const gateway = createWordPressAuthGateway(external.request);
  const result = await gateway.verifyOtp(verificationInput);
  assert.ok(result);
  assert.equal(result.is_new, false);
  assert.deepEqual(toAccountSummary(result.user), { id: 47, displayName: "آزاده نمونه", role: "client" });
  assert.deepEqual(external.calls, [{
    path: "auth/otp/verify",
    options: { method: "POST", body: { tracking_code: TRACKING, code: "58319", role: "specialist" } },
  }]);
});

test("refreshes with an opaque credential in the body and no access-token option", async () => {
  const external = captureRequest({ tokens, unknown_backend_field: "discard" });
  const result = await createWordPressAuthGateway(external.request).refresh(REFRESH);
  assert.deepEqual(result, { tokens: {
    access_token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjQ3LCJ0eXBlIjoiYWNjZXNzIn0.synthetic-signature",
    access_expires_in: 900,
    refresh_token: "f5c26ab3447d73a4d90dcaa352d8ecf51b064dbd4731f34abc5c98a351d7de22",
    refresh_expires_in: 2_592_000,
    token_type: "Bearer",
  } });
  assert.deepEqual(external.calls, [{
    path: "auth/refresh",
    options: { method: "POST", body: { refresh_token: REFRESH } },
  }]);
});

test("gets the current user with the transport token option without decoding identity", async () => {
  const external = captureRequest({ ...user, phone: null, specialist_post_id: 0, unknown_backend_field: "discard" });
  assert.deepEqual(await createWordPressAuthGateway(external.request).me(ACCESS), {
    id: 47, display_name: "آزاده نمونه", roles: ["nahan_specialist"], phone: null, specialist_post_id: 0,
  });
  assert.deepEqual(external.calls, [{ path: "auth/me", options: { method: "GET", token: ACCESS } }]);
});

test("logs out only the explicit refresh credential with authenticated all_devices false", async () => {
  const external = captureRequest({ logged_out: true, unknown_backend_field: "discard" });
  assert.deepEqual(await createWordPressAuthGateway(external.request).logout(ACCESS, REFRESH), { logged_out: true });
  assert.deepEqual(external.calls, [{
    path: "auth/logout",
    options: { method: "POST", token: ACCESS, body: { refresh_token: REFRESH, all_devices: false } },
  }]);
});

// Break caught: validating after dispatch causes avoidable OTP/mutation requests.
test("rejects invalid phones before making any external request", async () => {
  const external = captureRequest({ tracking_code: TRACKING, expires_in: 120 });
  const gateway = createWordPressAuthGateway(external.request);
  for (const phone of ["", "09129876543-secret", "+97 912 987 6543", null, 47]) {
    await assertSafeFailure(() => gateway.requestOtp(phone as string), "invalid_phone", 422);
  }
  assert.equal(external.calls.length, 0);
});

test("requires valid tracking, five-digit code, explicit role and at-most-64-character device ID before verification", async () => {
  const external = captureRequest(verified);
  const gateway = createWordPressAuthGateway(external.request);
  type VerifyInput = Parameters<WordPressAuthGateway["verifyOtp"]>[0];
  const invalidInputs: { input: unknown; code: string }[] = [
    { input: null, code: "invalid_request" },
    { input: undefined, code: "invalid_request" },
    ...["", "   ", "invalid\ntracking", null, 47].map((trackingCode) => ({
      input: { ...verificationInput, trackingCode }, code: "invalid_tracking_code",
    })),
    ...["1234", "123456", "58a19", null, 58319].map((code) => ({
      input: { ...verificationInput, code }, code: "otp_invalid",
    })),
    ...[undefined, null, "pro", "administrator", "nahan_client", 47].map((role) => ({
      input: { ...verificationInput, role }, code: "invalid_role",
    })),
    ...["d".repeat(65), null, 47].map((deviceId) => ({
      input: { ...verificationInput, deviceId }, code: "invalid_device_id",
    })),
  ];
  for (const { input, code } of invalidInputs) {
    await assertSafeFailure(() => gateway.verifyOtp(input as VerifyInput), code, 422);
  }
  assert.equal(external.calls.length, 0);
});

test("accepts client registration intent without aliasing it to a backend role", async () => {
  const external = captureRequest({ ...verified, user: { ...user, roles: ["nahan_client"] } });
  const result = await createWordPressAuthGateway(external.request).verifyOtp({ ...verificationInput, role: "client" });
  assert.ok(result);
  assert.deepEqual(toAccountSummary(result.user), { id: 47, displayName: "آزاده نمونه", role: "client" });
  assert.deepEqual(external.calls, [{
    path: "auth/otp/verify",
    options: { method: "POST", body: { tracking_code: TRACKING, code: "58319", role: "client" } },
  }]);
});

test("rejects invalid required server credentials before refresh, me or logout dispatch", async () => {
  const external = captureRequest({ logged_out: true });
  const gateway = createWordPressAuthGateway(external.request);
  for (const invalid of ["", "   ", "invalid\ncredential", "Bearer duplicated-prefix", null, undefined, 47]) {
    await assertSafeFailure(() => gateway.refresh(invalid as string), "invalid_credentials", 422);
    await assertSafeFailure(() => gateway.me(invalid as string), "invalid_credentials", 422);
    await assertSafeFailure(() => gateway.logout(invalid as string, REFRESH), "invalid_credentials", 422);
    await assertSafeFailure(() => gateway.logout(ACCESS, invalid as string), "invalid_credentials", 422);
  }
  assert.equal(external.calls.length, 0);
});

test("never accepts a syntactically valid OTP as a local magic-code success", async () => {
  const codes: string[] = [];
  const gateway = createWordPressAuthGateway(async (_path, options) => {
    codes.push((options?.body as { code: string }).code);
    throw new WordPressApiError({ status: 422, code: "otp_invalid", message: "synthetic-raw-backend-payload" });
  });
  for (const code of ["12345", "00000", "58319", "01234"]) {
    await assertSafeFailure(() => gateway.verifyOtp({ ...verificationInput, code }), "otp_invalid", 422);
  }
  assert.deepEqual(codes, ["12345", "00000", "58319", "01234"]);
});

const pluginFailures = [
  ["invalid_phone", 422],
  ["otp_rate_limited", 429],
  ["otp_rate_limited_ip", 429],
  ["otp_throttled", 429],
  ["otp_not_found", 404],
  ["otp_consumed", 410],
  ["otp_expired", 410],
  ["otp_invalid", 422],
  ["otp_too_many_attempts", 429],
  ["invalid_refresh", 401],
  ["revoked_refresh", 401],
  ["expired_refresh", 401],
  ["unauthenticated", 401],
] as const;

// Break caught: forwarding arbitrary upstream code/status/message/data/cause leaks secrets.
for (const [code, status] of pluginFailures) {
  test(`preserves safe ${code} semantics without retaining the upstream error`, async () => {
    const upstream = new WordPressApiError({
      status: 599,
      code,
      message: `${PHONE} ${OTP} ${REFRESH} Bearer ${ACCESS} synthetic-raw-backend-payload`,
      data: { phone: PHONE, code: OTP, tracking: TRACKING, [`raw_${REFRESH}`]: "synthetic-raw-backend-payload" },
    });
    const gateway = createWordPressAuthGateway(async () => { throw upstream; });
    const result = await assertSafeFailure(() => gateway.verifyOtp(verificationInput), code, status);
    assert.notEqual(result, upstream);
    const alternative = createWordPressAuthGateway(async () => {
      throw new WordPressApiError({ status, code, message: "different arbitrary_backend_error" });
    });
    const other = await assertSafeFailure(() => alternative.verifyOtp(verificationInput), code, status);
    assert.equal(result.message, other.message);
  });
}

test("turns unknown failures and prototype-name error codes into explicit safe failures", async () => {
  for (const failure of [
    new Error(`${REFRESH} ${PHONE} ${OTP} Bearer ${ACCESS} synthetic-raw-backend-payload`),
    new WordPressApiError({ status: 598, code: `arbitrary_backend_error_${REFRESH}`, message: PHONE, data: { secret: OTP } }),
    new WordPressApiError({ status: 401, code: "constructor", message: REFRESH }),
    new WordPressApiError({ status: 401, code: "toString", message: ACCESS }),
    { code: "unauthenticated", message: REFRESH, data: { phone: PHONE } },
    null,
  ]) {
    const gateway = createWordPressAuthGateway(async () => { throw failure; });
    await assertSafeFailure(() => gateway.refresh(REFRESH), "auth_unavailable", 502);
  }
});

test("classifies transport network and malformed-response failures without leaking details", async () => {
  for (const [upstreamCode, expectedCode, expectedStatus] of [
    ["network_error", "network_error", 503],
    ["timeout", "network_error", 503],
    ["aborted", "network_error", 503],
    ["fetch_unavailable", "network_error", 503],
    ["invalid_json", "invalid_response", 502],
    ["invalid_envelope", "invalid_response", 502],
  ] as const) {
    const gateway = createWordPressAuthGateway(async () => {
      throw new WordPressApiError({ status: 0, code: upstreamCode, message: REFRESH, data: { [ACCESS]: PHONE } });
    });
    await assertSafeFailure(() => gateway.me(ACCESS), expectedCode, expectedStatus);
  }
});

test("rejects a malformed success response for every operation rather than inventing auth success", async () => {
  const gateway = createWordPressAuthGateway(async () => ({
    tokens: { ...tokens, access_expires_in: 0 },
    user: { ...user, id: 0 },
    is_new: false,
    tracking_code: TRACKING,
    expires_in: 0,
    logged_out: false,
    raw_backend_payload: { phone: PHONE, code: OTP, refresh_token: REFRESH },
  }));
  for (const operation of [
    () => gateway.requestOtp(PHONE),
    () => gateway.verifyOtp(verificationInput),
    () => gateway.refresh(REFRESH),
    () => gateway.me(ACCESS),
    () => gateway.logout(ACCESS, REFRESH),
  ]) {
    await assertSafeFailure(operation, "invalid_response", 502);
  }
});

test("constructs the default gateway without reading WordPress configuration eagerly", (context) => {
  const original = process.env.WORDPRESS_URL;
  context.after(() => {
    if (original === undefined) delete process.env.WORDPRESS_URL;
    else process.env.WORDPRESS_URL = original;
  });
  delete process.env.WORDPRESS_URL;
  assert.doesNotThrow(() => createWordPressAuthGateway());
});

test("guards factory and every credential-bearing invocation with window defined before dispatch", async (context) => {
  const external = captureRequest(verified);
  const gateways = [createWordPressAuthGateway(external.request), createWordPressAuthGateway()];
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  context.after(() => {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });
  assert.throws(() => createWordPressAuthGateway(external.request), (error: unknown) => {
    assert.ok(error instanceof AuthGatewayError);
    assert.equal(error.code, "server_only");
    assert.equal(error.status, 500);
    assert.match(error.message, /[؀-ۿ]/u);
    return true;
  });
  for (const gateway of gateways) {
    for (const operation of [
      () => gateway.requestOtp(PHONE),
      () => gateway.verifyOtp(verificationInput),
      () => gateway.refresh(REFRESH),
      () => gateway.me(ACCESS),
      () => gateway.logout(ACCESS, REFRESH),
      () => gateway.me(""),
    ]) {
      await assertSafeFailure(operation, "server_only", 500);
    }
  }
  assert.equal(external.calls.length, 0);
});

test("sends a server-stored six-digit challenge upstream and never treats 145632 as a local success", async () => {
  const sentCodes: string[] = [];
  const gateway = createWordPressAuthGateway(async (_path, options) => {
    sentCodes.push((options?.body as { code: string }).code);
    throw new WordPressApiError({
      status: 422,
      code: "otp_invalid",
      message: "synthetic-raw-backend-payload",
    });
  });

  await assertSafeFailure(
    () => gateway.verifyOtp(
      { ...verificationInput, code: "۱۴۵۶۳۲" },
      { expectedCodeLength: 6 },
    ),
    "otp_invalid",
    422,
  );
  assert.deepEqual(sentCodes, ["145632"]);
});
