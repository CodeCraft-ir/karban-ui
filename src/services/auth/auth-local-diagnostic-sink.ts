import { closeSync, constants, fstatSync, openSync, writeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Per-process filename keeps synchronous size-check + append bounded across module copies.
// No rotation, unlink, or overwrite: unsafe/full/unavailable files simply receive nothing.
export function appendLocalAuthDiagnostic(line: string, path = join(tmpdir(), `karban-auth-diag-${process.pid}.log`)): void {
  if (!/^\[karban-auth-diag\] \{"reason":"(?:access_expired|fence_busy|fence_seal_mismatch|fence_changed_during_read)","executionSurface":"(?:rsc_account|rsc_profile|handler)","coordinatorInstance":"[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"\}$/.test(line)) return;
  let fd: number | undefined;
  try {
    fd = openSync(path, constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT | constants.O_NOFOLLOW | constants.O_NONBLOCK, 0o600);
    const file = fstatSync(fd);
    const entry = `${line}\n`;
    if (!file.isFile() || file.uid !== process.getuid?.() || file.nlink !== 1 || (file.mode & 0o777) !== 0o600 || file.size + Buffer.byteLength(entry) > 65_536) return;
    writeSync(fd, entry);
  } catch { /* Local-only best effort; never log filesystem errors or alter auth. */ }
  finally {
    if (fd !== undefined) { try { closeSync(fd); } catch { /* No auth effect. */ } }
  }
}
