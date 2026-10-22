import assert from "node:assert/strict";
import { test } from "node:test";
import { createLocalAuthDiagnostic } from "./auth-local-diagnostic.ts";

const instance = "06fc5e9b-dfca-45be-a24a-4ccabbb639d8";
const reasons = ["access_expired", "fence_busy", "fence_seal_mismatch", "fence_changed_during_read"] as const;

test("temporary local diagnostic projects only fixed categories and unrelated instance label", () => {
  const lines: string[] = [];
  for (const executionSurface of ["rsc_account", "rsc_profile", "handler"] as const) {
    const observe = createLocalAuthDiagnostic({ nodeEnv: "development", localDevelopmentEnabled: "true", executionSurface, coordinatorInstance: instance, write: line => { lines.push(line); } });
    for (const reason of reasons) observe(reason);
  }
  assert.equal(lines.length, 12);
  for (const line of lines) {
    assert.ok(line.startsWith("[karban-auth-diag] "));
    const fields = JSON.parse(line.slice("[karban-auth-diag] ".length));
    assert.deepEqual(Object.keys(fields), ["reason", "executionSurface", "coordinatorInstance"]);
    assert.ok(reasons.includes(fields.reason));
    assert.equal(fields.coordinatorInstance, instance);
  }
});

test("diagnostics require explicit local flag and known nonproduction mode", () => {
  for (const nodeEnv of [undefined, "production", "development", "test"]) {
    for (const localDevelopmentEnabled of [undefined, "false", "TRUE", "true"]) {
      let count = 0;
      const observe = createLocalAuthDiagnostic({ nodeEnv, localDevelopmentEnabled, executionSurface: "handler", coordinatorInstance: instance, write: () => { count++; } });
      observe("access_expired");
      assert.equal(count, (nodeEnv === "development" || nodeEnv === "test") && localDevelopmentEnabled === "true" ? 1 : 0);
    }
  }
});

test("unknown values and extra untrusted payloads cannot reach the log", () => {
  const lines: string[] = [];
  const options = { nodeEnv: "development", localDevelopmentEnabled: "true", executionSurface: "handler" as const, coordinatorInstance: instance, write: (line: string) => { lines.push(line); } };
  const observe = createLocalAuthDiagnostic(options);
  for (const unknown of ["private-access", { reason: "access_expired", token: "private-access" }, new Error("private error"), null]) {
    observe(unknown as never);
  }
  createLocalAuthDiagnostic({ ...options, executionSurface: "private-profile" as never })("access_expired");
  createLocalAuthDiagnostic({ ...options, coordinatorInstance: "private-cookie" })("access_expired");
  assert.deepEqual(lines, []);
  assert.doesNotThrow(() => createLocalAuthDiagnostic({ ...options, write: () => { throw Error("private sink error"); } })("access_expired"));
});
