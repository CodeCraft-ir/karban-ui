import assert from "node:assert/strict";
import { test } from "node:test";
import * as policy from "./profile-request-policy.ts";
const origin = "https://app.example";
const req = (body: BodyInit, type = "application/json", headers: Record<string,string> = {}) => new Request(origin + "/api/profile/me", { method: "POST", headers: { origin, "content-type": type, ...headers }, body });
function form(purpose = "public-avatar", filename = "avatar.png", mime = "image/png") {
  const data = new FormData(); data.append("file", new File([new Uint8Array([1,2,3])], filename, { type: mime })); data.append("purpose", purpose); return data;
}
function multipart(data: FormData) { return new Request(origin + "/api/profile/media", { method: "POST", headers: { origin }, body: data }); }

test("JSON boundary shares exact Origin and Fetch Metadata policy and bounds actual bytes to 16KiB", async () => {
  assert.equal(typeof policy.parseProfileJson, "function", "bounded profile request reader missing");
  assert.deepEqual(await policy.parseProfileJson(req(JSON.stringify({bio: "ب".repeat(4000)})), origin, "profile"), { bio: "ب".repeat(4000) });
  for (const headers of [{origin: "https://evil.example"}, {origin: "null"}, {"sec-fetch-site": "cross-site"}] as Record<string,string>[]) await assert.rejects(policy.parseProfileJson(req("{}", "application/json", headers), origin, "submit"), { status: 403 });
  await assert.rejects(policy.parseProfileJson(req("{}", "text/plain"), origin, "submit"), { status: 415 });
  await assert.rejects(policy.parseProfileJson(req(" ".repeat(16385), "application/json", {"content-length":"1"}), origin, "submit"), { status: 413 });
  await assert.rejects(policy.parseProfileJson(req(JSON.stringify({ bio: "\ud800" })), origin, "profile"));
});

test("multipart accepts only one public-purpose image and rejects repeats, unknown authority and unsafe filenames", async () => {
  const valid = await policy.parseProfileMultipart(multipart(form()), origin);
  assert.equal(valid.purpose, "public-avatar"); assert.equal(valid.file.name, "avatar.png");
  for (const extra of ["purpose", "file", "owner", "context", "status"]) {
    const data = form(); data.append(extra, extra === "file" ? new File(["x"], "b.png", {type:"image/png"}) : "public-avatar");
    await assert.rejects(policy.parseProfileMultipart(multipart(data), origin));
  }
  for (const data of [form("private"), form("public-avatar", "bad.svg", "image/svg+xml"), form("public-avatar", "movie.mp4", "video/mp4"), form("public-avatar", "x".repeat(201)+".png")]) await assert.rejects(policy.parseProfileMultipart(multipart(data), origin));
  const empty = new FormData(); empty.append("file", new File([], "empty.png", {type:"image/png"})); empty.append("purpose", "public-avatar");
  await assert.rejects(policy.parseProfileMultipart(multipart(empty), origin));
  await assert.rejects(policy.parseProfileMultipart(req("broken", "multipart/form-data; boundary=bad"), origin));
  await assert.rejects(policy.parseProfileMultipart(req("broken", "multipart/form-data"), origin));
});

test("streamed multipart overflow cancels the reader before platform allocation despite a fake Content-Length", async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ pull(c) { c.enqueue(new Uint8Array(1024*1024)); }, cancel() { cancelled = true; } });
  const request = new Request(origin, { method: "POST", headers: {origin,"content-type":"multipart/form-data; boundary=safe","content-length":"1"}, body: stream, duplex:"half" } as RequestInit);
  await assert.rejects(policy.parseProfileMultipart(request, origin), { status: 413 });
  assert.equal(cancelled, true);
});

test("bounded request reader handles abort and a stalled body without hanging", async () => {
  let cancelled = false;
  const stream = () => new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  const stalled = new Request(origin, {method:"POST", headers:{origin,"content-type":"application/json"},body:stream(),duplex:"half"} as RequestInit);
  await assert.rejects(policy.readBoundedBody(stalled, 16384, 10), { code: "body_timeout" });
  assert.equal(cancelled, true);
  const controller = new AbortController();
  const aborted = new Request(origin, {method:"POST",body:stream(),signal:controller.signal,duplex:"half"} as RequestInit);
  const pending = policy.readBoundedBody(aborted, 16384, 1000); controller.abort();
  await assert.rejects(pending, {code:"request_aborted"});
});
