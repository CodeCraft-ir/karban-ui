import { assertWordPressServerOnly } from "../wordpress/config.ts";
import { buildWordPressRestUrl, type WordPressFetch } from "../wordpress/rest-client.ts";
import { isWordPressFailureEnvelope, isWordPressSuccessEnvelope } from "../wordpress/contracts.ts";
import { WordPressApiError } from "../wordpress/errors.ts";
import { MAX_FILE_BYTES, ProfileBoundaryError, purpose } from "./profile-contracts.ts";
import { readBoundedBody, type PublicUploadInput } from "./profile-request-policy.ts";
import { safeProfileError } from "./profile-errors.ts";

interface UploadTransportDependencies { fetch?: WordPressFetch; timeoutMs?: number; }
/** Internal server transport: fixed path/method/options, no JSON serialization, no redirects or retry. */
export function createWordPressProfileUpload(dependencies: UploadTransportDependencies = {}) {
  return async (accessToken: string, input: PublicUploadInput): Promise<unknown> => {
    assertWordPressServerOnly();
    const controller = new AbortController();
    let interrupt!: () => void;
    const interrupted = new Promise<never>((_resolve,reject) => { interrupt = () => { controller.abort(); reject(new ProfileBoundaryError("operation_uncertain",503)); }; });
    const timer = setTimeout(interrupt,dependencies.timeoutMs ?? 30_000);
    try {
      if (typeof accessToken !== "string" || !accessToken || /\s/u.test(accessToken)) throw new ProfileBoundaryError("unauthenticated",401);
      const p = purpose(input.purpose);
      if (!(input.file instanceof File) || input.file.size < 1 || input.file.size > MAX_FILE_BYTES) throw new ProfileBoundaryError("invalid_upload",422);
      const body = new FormData(); body.append("file",input.file,input.file.name); body.append("purpose",p);
      const fetchImpl=dependencies.fetch ?? globalThis.fetch;
      const response=await Promise.race([fetchImpl(buildWordPressRestUrl("uploads"), {
        method:"POST",headers:{Accept:"application/json",Authorization:`Bearer ${accessToken}`},body,
        cache:"no-store",credentials:"omit",redirect:"error",signal:controller.signal,
      }),interrupted]);
      if (!response.body) throw new ProfileBoundaryError("operation_uncertain",503);
      const bounded=new Request("https://bounded.invalid/",{method:"POST",body:response.body,signal:controller.signal,duplex:"half"} as RequestInit);
      let bytes: Uint8Array;
      try { bytes = await Promise.race([readBoundedBody(bounded,256*1024,dependencies.timeoutMs ?? 30_000),interrupted]); }
      catch { throw new ProfileBoundaryError("operation_uncertain",503); }
      let payload: unknown;
      try { payload=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes)); }
      catch { throw new ProfileBoundaryError("operation_uncertain",503); }
      if (isWordPressFailureEnvelope(payload)) throw new WordPressApiError({status:response.status,code:payload.error.code,message:"خطای ذخیره رسانه"});
      if (!response.ok || !isWordPressSuccessEnvelope(payload)) throw new ProfileBoundaryError("operation_uncertain",503);
      return payload.data;
    } catch (error) {
      if (controller.signal.aborted) throw new ProfileBoundaryError("operation_uncertain",503);
      throw safeProfileError(error,true);
    } finally { clearTimeout(timer); }
  };
}
