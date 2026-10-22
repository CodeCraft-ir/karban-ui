import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, symlinkSync, linkSync, unlinkSync, chmodSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { appendLocalAuthDiagnostic } from "./auth-local-diagnostic-sink.ts";

const line = '[karban-auth-diag] {"reason":"access_expired","executionSurface":"rsc_account","coordinatorInstance":"06fc5e9b-dfca-45be-a24a-4ccabbb639d8"}';

test("bounded diagnostic file is private; unsafe files and full files are untouched", () => {
  const directory = mkdtempSync(join(tmpdir(), "karban-diag-test-"));
  try {
    const path = join(directory, "diagnostic.log");
    appendLocalAuthDiagnostic(line, path);
    assert.equal(readFileSync(path, "utf8"), `${line}\n`);
    assert.equal(statSync(path).mode & 0o777, 0o600);
    chmodSync(path, 0o644);
    appendLocalAuthDiagnostic(line, path);
    assert.equal(readFileSync(path, "utf8"), `${line}\n`);
    chmodSync(path, 0o600);
    appendLocalAuthDiagnostic("private unprojected payload", path);
    assert.equal(readFileSync(path, "utf8"), `${line}\n`);
    const hardlink = join(directory, "hardlink.log");
    linkSync(path, hardlink);
    appendLocalAuthDiagnostic(line, hardlink);
    assert.equal(readFileSync(path, "utf8"), `${line}\n`);
    unlinkSync(hardlink);
    writeFileSync(path, "x".repeat(65536));
    appendLocalAuthDiagnostic(line, path);
    assert.equal(statSync(path).size, 65536);
    const alias = join(directory, "alias.log");
    symlinkSync(path, alias);
    assert.doesNotThrow(() => appendLocalAuthDiagnostic(line, alias));
    assert.equal(statSync(path).size, 65536);
    assert.doesNotThrow(() => appendLocalAuthDiagnostic(line, join(directory, "missing", "log")));
    appendLocalAuthDiagnostic("private unprojected payload", path);
    assert.equal(statSync(path).size, 65536);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
