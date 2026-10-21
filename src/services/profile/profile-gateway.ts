import { assertWordPressServerOnly } from "../wordpress/config.ts";
import { parseAccount, parseCapabilities, parseGallery, parseInput, parseMediaId, parseProfile, parseUpload, ProfileBoundaryError } from "./profile-contracts.ts";
import { safeProfileError } from "./profile-errors.ts";
import type { PublicUploadInput } from "./profile-request-policy.ts";

export interface ProfileGatewayDependencies {
  json(path: string, options: {method:"GET"|"POST"|"DELETE";token:string;body?:Record<string,unknown>}): Promise<unknown>;
  upload(token: string, input: PublicUploadInput): Promise<unknown>;
}
/** Trusted server adapter. Paths/methods cannot come from a browser input. */
export function createProfileGateway(dependencies: ProfileGatewayDependencies) {
  async function call<T>(path:string,token:string,method:"GET"|"POST"|"DELETE",parse:(value:unknown)=>T,body?:Record<string,unknown>):Promise<T> {
    assertWordPressServerOnly();
    let raw:unknown;
    try { raw=await dependencies.json(path,{method,token,...(body===undefined?{}:{body})}); }
    catch(error) { throw safeProfileError(error,method!=="GET"); }
    try { return parse(raw); }
    catch { throw new ProfileBoundaryError(method==="GET"?"invalid_upstream_response":"operation_uncertain",503); }
  }
  return {
    account:(token:string)=>call("account/me",token,"GET",parseAccount),
    updateAccount:(token:string,body:unknown)=>call("account/me",token,"POST",parseAccount,parseInput("account",body)),
    profile:(token:string)=>call("profile/me",token,"GET",parseProfile),
    updateProfile:(token:string,body:unknown)=>call("profile/me",token,"POST",parseProfile,parseInput("profile",body)),
    submit:(token:string)=>call("profile/me/submit",token,"POST",parseProfile,{}),
    capabilities:(token:string)=>call("uploads",token,"GET",parseCapabilities),
    addGallery:(token:string,body:unknown)=>call("profile/me/gallery",token,"POST",parseGallery,parseInput("gallery",body)),
    deleteGallery:(token:string,id:string,body:unknown)=>call(`profile/me/gallery/media/${parseMediaId(id)}`,token,"DELETE",parseGallery,parseInput("delete",body)),
    async upload(token:string,input:PublicUploadInput) {
      assertWordPressServerOnly();
      let raw:unknown;
      try { raw=await dependencies.upload(token,input); } catch(error) { throw safeProfileError(error,true); }
      try { const result=parseUpload(raw); if(result.purpose!==input.purpose) throw Error(); return result; }
      catch { throw new ProfileBoundaryError("operation_uncertain",503); }
    },
  };
}
export type ProfileGateway = ReturnType<typeof createProfileGateway>;
