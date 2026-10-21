import type { AccountSummary } from "../../lib/contracts/auth.ts";
import type { SealedAuthCoordinator } from "../auth/auth-coordinator.ts";
import { parseInput, parseMediaId, ProfileBoundaryError, type AccountDto, type ProfileDto } from "./profile-contracts.ts";
import type { ProfileGateway } from "./profile-gateway.ts";
import type { PublicUploadInput } from "./profile-request-policy.ts";

interface ProfileServiceDependencies { auth: Pick<SealedAuthCoordinator,"authenticatedOperation">; gateway: ProfileGateway; }
/** Pure production logic; only the server-only composition receives real credentials/ports. */
export function createProfileService({auth,gateway}:ProfileServiceDependencies) {
  function identity(owner:AccountDto,summary:AccountSummary):AccountDto {
    if(owner.id!==summary.id || owner.role!==summary.role)throw new ProfileBoundaryError("owner_identity_mismatch",503);
    return owner;
  }
  function specialist(summary:AccountSummary) {
    if(summary.role!=="specialist")throw new ProfileBoundaryError("forbidden",403);
  }
  async function owner(token:string,summary:AccountSummary,check:()=>void) {
    specialist(summary);
    const account=identity(await gateway.account(token),summary);
    check();
    if(!account.specialist)throw new ProfileBoundaryError("no_profile",404);
    return account.specialist;
  }
  function owned(profile:ProfileDto,link:{id:number;slug:string}):ProfileDto {
    if(profile.id!==link.id || profile.slug!==link.slug)throw new ProfileBoundaryError("owner_identity_mismatch",503);
    return profile;
  }
  return {
    account:()=>auth.authenticatedOperation(async(token,summary)=>identity(await gateway.account(token),summary)),
    updateAccount(body:unknown) {
      const input=parseInput("account",body);
      return auth.authenticatedOperation(async(token,summary,check)=>{
        identity(await gateway.updateAccount(token,input),summary);
        check();
        // Do not trust an optimistic POST DTO as the sealed account summary.
        return identity(await gateway.account(token),summary);
      },account=>({id:account.id,displayName:account.displayName,role:account.role}),true);
    },
    profile:()=>auth.authenticatedOperation(async(token,summary,check)=>{
      const link=await owner(token,summary,check); return owned(await gateway.profile(token),link);
    }),
    updateProfile(body:unknown) {
      const input=parseInput("profile",body);
      return auth.authenticatedOperation(async(token,summary,check)=>{
        const link=await owner(token,summary,check); return owned(await gateway.updateProfile(token,input),link);
      },undefined,true);
    },
    submit:()=>auth.authenticatedOperation(async(token,summary,check)=>{
      const link=await owner(token,summary,check); return owned(await gateway.submit(token),link);
    },undefined,true),
    addGallery(body:unknown) {
      const input=parseInput("gallery",body);
      return auth.authenticatedOperation(async(token,summary,check)=>{await owner(token,summary,check);return gateway.addGallery(token,input);},undefined,true);
    },
    deleteGallery(id:string,body:unknown) {
      parseMediaId(id); const input=parseInput("delete",body);
      return auth.authenticatedOperation(async(token,summary,check)=>{await owner(token,summary,check);return gateway.deleteGallery(token,id,input);},undefined,true);
    },
    capabilities:()=>auth.authenticatedOperation(async(token,summary,check)=>{
      const limits=await gateway.capabilities(token);
      check();
      if(summary.role==="client" && limits.purposes.some(p=>p!=="public-avatar"))throw new ProfileBoundaryError("invalid_upstream_response",503);
      return limits;
    }),
    upload:(input:PublicUploadInput)=>auth.authenticatedOperation(async(token,summary,check)=>{
      if(input.purpose==="public-portfolio")await owner(token,summary,check);
      return gateway.upload(token,input);
    },undefined,true),
  };
}
export type ProfileService = ReturnType<typeof createProfileService>;
