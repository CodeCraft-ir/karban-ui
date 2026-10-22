import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getAuthRuntimeConfig,
  isLoopbackWordPressOrigin,
  isLocalSmsAllowed,
  isLoopbackOtpAllowed,
} from "./auth-runtime-config.ts";

function env(values: Record<string, string | undefined>): NodeJS.ProcessEnv {
  return { ...values } as NodeJS.ProcessEnv;
}

test("reads auth runtime configuration lazily and rejects missing or weak deployment secrets without throwing", () => {
  assert.equal(getAuthRuntimeConfig(env({})), undefined);
  assert.equal(getAuthRuntimeConfig(env({ APP_ORIGIN: "https://app.example.test", IRON_SESSION_PASSWORD: "short" })), undefined);
  assert.equal(getAuthRuntimeConfig(env({ APP_ORIGIN: "not a URL", IRON_SESSION_PASSWORD: "x".repeat(32) })), undefined);
  assert.deepEqual(getAuthRuntimeConfig(env({
    APP_ORIGIN: "https://app.example.test/",
    IRON_SESSION_PASSWORD: "x".repeat(32),
  })), {
    appOrigin: "https://app.example.test",
    ironPassword: "x".repeat(32),
  });
});

test("permits loopback OTP only with exact development opt-in and a non-production environment", () => {
  for (const origin of ["http://localhost:8080/kar", "http://127.0.0.1/kar", "http://[::1]:8080/kar"]) {
    assert.equal(isLoopbackWordPressOrigin(origin), true);
    assert.equal(isLoopbackOtpAllowed(env({ KARBAN_LOCAL_DEVELOPMENT: "true", NODE_ENV: "development" }), origin), true);
  }
  for (const envValues of [
    {},
    { KARBAN_LOCAL_DEVELOPMENT: "false", NODE_ENV: "development" },
    { KARBAN_LOCAL_DEVELOPMENT: "TRUE", NODE_ENV: "development" },
    { KARBAN_LOCAL_DEVELOPMENT: "true", NODE_ENV: "production" },
  ]) {
    assert.equal(isLoopbackOtpAllowed(env(envValues), "http://localhost/kar"), false);
  }
  assert.equal(isLoopbackOtpAllowed(env({ KARBAN_LOCAL_DEVELOPMENT: "true", NODE_ENV: "development" }), "https://codecraft.ir/kar"), false);
});

test("separate local SMS flag never bypasses local nonproduction canonical loopback policy", () => {
  const allowed = env({ KARBAN_LOCAL_DEVELOPMENT: "true", KARBAN_ALLOW_LOCAL_SMS: "true", NODE_ENV: "development" });
  assert.equal(isLocalSmsAllowed(allowed, "http://localhost/kar"), true);
  assert.equal(isLocalSmsAllowed(allowed, "https://[::1]/kar"), true);
  for (const overrides of [{ KARBAN_ALLOW_LOCAL_SMS: undefined }, { KARBAN_ALLOW_LOCAL_SMS: "TRUE" }, { KARBAN_LOCAL_DEVELOPMENT: undefined }, { NODE_ENV: "production" }]) {
    assert.equal(isLocalSmsAllowed(env({ ...allowed, ...overrides }), "http://localhost/kar"), false);
  }
  for (const origin of ["https://example.test", "http://localhost.evil.test", "http://user:pass@localhost", "http://localhost/?mode=sms"]) assert.equal(isLocalSmsAllowed(allowed, origin), false);
});
