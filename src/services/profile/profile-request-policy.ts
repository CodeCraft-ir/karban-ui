import { assertAuthMutationOrigin } from "../../lib/auth-request-policy.ts";
import { IMAGE_MIMES, MAX_FILE_BYTES, MAX_PROFILE_JSON_BYTES, MULTIPART_OVERHEAD_BYTES, ProfileBoundaryError, parseInput, purpose, type InputKind, type PublicMediaPurpose } from "./profile-contracts.ts";

export interface PublicUploadInput { file: File; purpose: PublicMediaPurpose; }
const BODY_TIMEOUT_MS = 15_000;

/** Bound actual streaming bytes before parsing/allocating FormData. Content-Length is only an early rejection hint. */
export async function readBoundedBody(request: Request, maximum: number, timeoutMs = BODY_TIMEOUT_MS): Promise<Uint8Array> {
  const length = request.headers.get("content-length");
  if (length && /^\d+$/u.test(length) && Number(length) > maximum) {
    void request.body?.cancel().catch(() => {});
    throw new ProfileBoundaryError("request_too_large", 413);
  }
  if (!request.body) throw new ProfileBoundaryError("invalid_request", 400);
  const reader = request.body.getReader(); const chunks: Uint8Array[] = []; let total = 0;
  let fail!: (error: Error) => void;
  const interrupted = new Promise<never>((_resolve, reject) => { fail = reject; });
  const stop = (code: string, status: number) => {
    fail(new ProfileBoundaryError(code, status));
    void reader.cancel().catch(() => {});
  };
  const timer = setTimeout(() => stop("body_timeout", 408), timeoutMs);
  const abort = () => stop("request_aborted", 400);
  request.signal.addEventListener("abort", abort, {once:true});
  try {
    if (request.signal.aborted) abort();
    while (true) {
      const chunk = await Promise.race([reader.read(), interrupted]);
      if (request.signal.aborted) throw new ProfileBoundaryError("request_aborted", 400);
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > maximum) {
        void reader.cancel().catch(() => {});
        throw new ProfileBoundaryError("request_too_large", 413);
      }
      chunks.push(chunk.value);
    }
    // Never allocate an unbounded copy or parse directly from the caller stream.
    const bytes = new Uint8Array(total); let at = 0;
    for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.byteLength; }
    return bytes;
  } finally {
    clearTimeout(timer); request.signal.removeEventListener("abort", abort); reader.releaseLock();
  }
}
export async function parseProfileJson(request: Request, appOrigin: string, kind: InputKind): Promise<Record<string, unknown>> {
  assertAuthMutationOrigin(request, appOrigin);
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") throw new ProfileBoundaryError("invalid_content_type", 415);
  const raw = await readBoundedBody(request, MAX_PROFILE_JSON_BYTES);
  let parsed: unknown;
  try { parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)); }
  catch { throw new ProfileBoundaryError("invalid_request", 400); }
  return parseInput(kind, parsed);
}
export async function parseProfileMultipart(request: Request, appOrigin: string): Promise<PublicUploadInput> {
  assertAuthMutationOrigin(request, appOrigin);
  const contentType = request.headers.get("content-type") ?? "";
  // Exactly one bounded, ASCII boundary parameter. No alternate request-driven context.
  const match = /^multipart\/form-data;\s*boundary=(?:"([a-zA-Z0-9'()+_,.\/:=? -]{1,70})"|([a-zA-Z0-9'()+_,.\/:=?-]{1,70}))\s*$/iu.exec(contentType);
  if (!match) throw new ProfileBoundaryError("invalid_content_type", 415);
  const bytes = await readBoundedBody(request, MAX_FILE_BYTES + MULTIPART_OVERHEAD_BYTES);
  let data: FormData;
  try {
    data = await new Request("https://bounded.invalid/", {method:"POST", headers:{"content-type":contentType}, body: bytes as BodyInit}).formData();
  } catch { throw new ProfileBoundaryError("invalid_request", 400); }
  if ([...data.keys()].length !== 2 || data.getAll("file").length !== 1 || data.getAll("purpose").length !== 1) throw new ProfileBoundaryError();
  const p = purpose(data.get("purpose")); const file = data.get("file");
  if (!(file instanceof File) || file.size < 1) throw new ProfileBoundaryError();
  if (file.size > MAX_FILE_BYTES) throw new ProfileBoundaryError("request_too_large", 413);
  if (!file.name || Buffer.byteLength(file.name, "utf8") > 200 || /[\/\\\p{Cc}\p{Cs}]/u.test(file.name)) throw new ProfileBoundaryError();
  if (/^video\//iu.test(file.type) || /\.(mp4|mov|webm|avi|mkv)$/iu.test(file.name)) throw new ProfileBoundaryError("video_unsupported", 415);
  const extensions: Record<string, string> = {jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif"};
  const extension = file.name.split(".").at(-1)?.toLowerCase() ?? "";
  if (!IMAGE_MIMES.includes(file.type as typeof IMAGE_MIMES[number]) || extensions[extension] !== file.type) throw new ProfileBoundaryError("unsupported_media", 415);
  // These are boundary shape checks, NOT proof of actual image bytes. WP's decoder is authoritative.
  return {file, purpose:p};
}
