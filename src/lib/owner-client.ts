import { ProfileBoundaryError, object, parseAccount, parseProfile, parseGallery, parseCapabilities, parseUpload, parseInput, integer, type AccountDto, type ProfileDto, type PublicMediaPurpose, type GalleryDto } from '../services/profile/profile-contracts.ts';
import type { OwnerError } from './owner-ui.ts';

export class OwnerClientError extends Error implements OwnerError {
  readonly status:number; readonly code:string; readonly reloadRequired:boolean;
  constructor(status:number,code:string,reloadRequired=false) { super('owner_operation_failed');this.status=status;this.code=code;this.reloadRequired=reloadRequired; }
}
function accountDto(raw:unknown):AccountDto {
  const a=object(raw);return parseAccount({id:a.id,display_name:a.displayName,role:a.role,login_phone_masked:a.loginPhoneMasked,avatar:a.avatar,location:a.location,specialist:a.specialist});
}
function galleryDto(raw:unknown):GalleryDto {
  const g=object(raw);return parseGallery({gallery:g.gallery,gallery_revision:g.galleryRevision,gallery_available:g.galleryAvailable,status:g.status});
}
function profileDto(raw:unknown):ProfileDto {
  const p=object(raw);return parseProfile({id:p.id,slug:p.slug,title:p.title,status:p.status,categories:p.categories,cities:p.cities,avatar:p.avatar,bio:p.bio,skills:p.skills,address:p.address,availability:p.availability,price_hint:p.priceHint,experience_years:p.experienceYears,gallery:p.gallery,gallery_revision:p.galleryRevision,gallery_available:p.galleryAvailable,...(Object.hasOwn(p,'verified')?{verified:p.verified}:{})});
}
function project<T>(raw:unknown,parser:(value:unknown)=>T,mutation=false):T {
  try{return parser(raw);}catch{throw new OwnerClientError(503,mutation?'operation_uncertain':'profile_unavailable',mutation);}
}
let refreshFlight:Promise<void>|undefined;
let refreshEpoch=0;
export type OwnerFetch=(path:string,init?:RequestInit)=>Promise<Response>;
export function createOwnerClient(fetcher:OwnerFetch,syncSummary:()=>Promise<void>) {
  async function request(path:string,method='GET',body?:Record<string,unknown>|FormData,signal?:AbortSignal):Promise<Record<string,unknown>> {
    let response:Response;
    try {
      response=await fetcher(path,{method,credentials:'same-origin',cache:'no-store',signal,
        ...(body instanceof FormData?{body}:body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
    } catch(error) {
      if(signal?.aborted) throw error;
      throw new OwnerClientError(503,method==='GET'?'profile_unavailable':'operation_uncertain',method!=='GET');
    }
    const value=await response.json().catch(()=>null);
    if(!response.ok) {
      const e=value && typeof value==='object' ? value.error : null;
      throw new OwnerClientError(response.status,typeof e?.code==='string'?e.code:'profile_unavailable',e?.reloadRequired===true || response.status===409);
    }
    try{return object(value);}catch{throw new OwnerClientError(503,method==='GET'?'profile_unavailable':'operation_uncertain',method!=='GET');}
  }
  async function refresh() {
    if(!refreshFlight) refreshFlight=request('/api/auth/refresh','POST',{}).then(async()=>{refreshEpoch++;await syncSummary();}).finally(()=>{refreshFlight=undefined;});
    await refreshFlight;
  }
  async function recoverRead<T>(path:string,key:string,parser:(raw:unknown)=>T):Promise<T> {
    const before=refreshEpoch;
    try{const result=project((await request(path))[key],parser);await syncSummary();return result;}
    catch(error){
      if(!(error instanceof OwnerClientError)||error.status!==401||error.code!=='refresh_required')throw error;
      if(before===refreshEpoch)await refresh();
      return project((await request(path))[key],parser);
    }
  }
  function revision(profile:ProfileDto) {
    if(!profile.galleryAvailable || profile.galleryRevision===null) throw new OwnerClientError(409,'gallery_storage_unavailable',true);
    return integer(profile.galleryRevision,0);
  }
  return {
    account:async(signal?:AbortSignal)=>accountDto((await request('/api/account/me','GET',undefined,signal)).account),
    profile:async(signal?:AbortSignal)=>profileDto((await request('/api/profile/me','GET',undefined,signal)).profile),
    capabilities:async(signal?:AbortSignal)=>{
      const c=object((await request('/api/profile/media','GET',undefined,signal)).capabilities);
      return parseCapabilities({purposes:c.purposes,image_mimes:c.imageMimes,max_bytes:c.maxBytes,max_dimension:c.maxDimension,max_pixels:c.maxPixels,max_files:c.maxFiles,max_gallery_items:c.maxGalleryItems,video:c.video,image_decoder_required:c.imageDecoderRequired});
    },
    async saveAccount(input:unknown) { const a=project((await request('/api/account/me','POST',parseInput('account',input))).account,accountDto,true);await syncSummary();return a; },
    async saveProfile(input:unknown) { return project((await request('/api/profile/me','POST',parseInput('profile',input))).profile,profileDto,true); },
    async submitProfile() { return project((await request('/api/profile/submit','POST',{})).profile,profileDto,true); },
    async upload(file:File,purpose:PublicMediaPurpose) {
      const form=new FormData();form.append('file',file);form.append('purpose',purpose);
      const media=project((await request('/api/profile/media','POST',form)).media,parseUpload,true);
      if(media.purpose!==purpose)throw new OwnerClientError(503,'operation_uncertain',true);
      return media;
    },
    async addGallery(id:number,caption:string,profile:ProfileDto) {
      return project((await request('/api/profile/gallery','POST',parseInput('gallery',{media_id:id,caption,kind:'image',expected_revision:revision(profile)}))).gallery,galleryDto,true);
    },
    async detachGallery(id:number,profile:ProfileDto) {
      return project((await request(`/api/profile/gallery/media/${integer(id)}`,'DELETE',{expected_revision:revision(profile)})).gallery,galleryDto,true);
    },
    recoverAccount:()=>recoverRead('/api/account/me','account',accountDto),
    recoverProfile:()=>recoverRead('/api/profile/me','profile',profileDto),
  };
}
export async function settleOwnerAction<T,S>(operation:()=>Promise<T>,reread:()=>Promise<S>,blockedBefore=false):Promise<{ok:true;value:T}|{ok:false;error:OwnerClientError;state?:S;reloadFailed:boolean}> {
  try {return {ok:true,value:await operation()};}
  catch(cause){
    const error=cause instanceof OwnerClientError?cause:cause instanceof ProfileBoundaryError?new OwnerClientError(cause.status,cause.code):new OwnerClientError(503,'operation_uncertain',true);
    if(error.reloadRequired || error.status===409){
      try{return {ok:false,error,state:await reread(),reloadFailed:false};}catch{return {ok:false,error,reloadFailed:true};}
    }
    // A plain failed GET/validation response proves no fresh owner state. It
    // cannot clear a lock established by an earlier uncertain write.
    return {ok:false,error,reloadFailed:blockedBefore};
  }
}
export type OwnerClient=ReturnType<typeof createOwnerClient>;
/** Local form lifetime only, not identity/auth state. Prevents duplicate dispatch and stale component updates. */
export function createActionGate(){
  let generation=0;let busy=false;
  return {begin(){if(busy)return null;busy=true;const token=++generation;return {current:()=>token===generation,finish:()=>{if(token===generation)busy=false;}};},cancel(){generation++;busy=false;}};
}
