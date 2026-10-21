import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveProtectedRoute, resolveProtectedRouteFromSession } from "./auth-page-guards.ts";
import type { AccountSummary } from "./contracts/auth.ts";

const client: AccountSummary = { id: 1, displayName: "کارفرما", role: "client" };
const specialist: AccountSummary = { id: 2, displayName: "متخصص", role: "specialist" };
const mixed: AccountSummary = { id: 3, displayName: "حساب چندنقشی", role: null };

test("guards anonymous accounts with a fixed login redirect", async () => {
  const port = { readAccount: async () => undefined };
  assert.deepEqual(await resolveProtectedRouteFromSession(port, "client"), {
    kind: "redirect",
    location: "/auth/login",
  });
});

test("allows only the matching client or specialist role", async () => {
  assert.deepEqual(await resolveProtectedRouteFromSession({ readAccount: async () => client }, "client"), { kind: "allow", account: client });
  assert.deepEqual(await resolveProtectedRouteFromSession({ readAccount: async () => specialist }, "specialist"), { kind: "allow", account: specialist });
  assert.deepEqual(await resolveProtectedRouteFromSession({ readAccount: async () => client }, "specialist"), { kind: "redirect", location: "/dashboard" });
  assert.deepEqual(await resolveProtectedRouteFromSession({ readAccount: async () => specialist }, "client"), { kind: "redirect", location: "/pro" });
});

test("fails closed for mixed or unknown roles without a user-controlled return path", async () => {
  assert.deepEqual(await resolveProtectedRouteFromSession({ readAccount: async () => mixed }, "client"), { kind: "redirect", location: "/auth/login" });
  assert.deepEqual(resolveProtectedRoute({ ...mixed, role: null }, "specialist"), { kind: "redirect", location: "/auth/login" });
  const serialized = JSON.stringify(await resolveProtectedRouteFromSession({ readAccount: async () => undefined }, "client"));
  assert.equal(serialized.includes("phone"), false);
  assert.equal(serialized.includes("return"), false);
});
