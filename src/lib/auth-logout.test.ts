import assert from "node:assert/strict";
import { test } from "node:test";
import { canStartLogout, settleLogout } from "./auth-logout.ts";

test("rejects duplicate logout submits while one request is pending", () => {
  assert.equal(canStartLogout(false), true);
  assert.equal(canStartLogout(true), false);
});

test("clears the local account state after successful or failed remote logout", () => {
  assert.deepEqual(settleLogout("success"), { pending: false, account: null, error: false, navigateTo: "/" });
  assert.deepEqual(settleLogout("failure"), { pending: false, account: null, error: true, navigateTo: null });
  const serialized = JSON.stringify(settleLogout("failure"));
  assert.equal(serialized.includes("refreshToken"), false);
  assert.equal(serialized.includes("phone"), false);
});
