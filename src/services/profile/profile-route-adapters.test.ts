import assert from "node:assert/strict";
import { test } from "node:test";
import { createAuthCoordinator, createRefreshCoordinator, type AuthGatewayPort, type AuthSessionData } from "../auth/auth-coordinator.ts";
import { createProfileGateway } from "./profile-gateway.ts";
import * as adapters from "./profile-route-adapters.ts";
import * as service from "./profile-service.ts";
import { WordPressApiError } from "../wordpress/errors.ts";
const origin="https://app.example";
const rawAccount={id:47,display_name:"نام",role:"specialist",login_phone_masked:"09*****6789",avatar:null,location:null,specialist:{id:51,slug:"specialist-47",status:"draft"}};
const rawProfile={id:51,slug:"specialist-47",title:"عنوان",status:"draft",categories:[],cities:[],avatar:null,gallery:[],gallery_revision:0,gallery_available:true,bio:"درباره",skills:"",address:"خصوصی",availability:"",price_hint:"",experience_years:null};
const rawCap={purposes:["public-avatar","public-portfolio"],image_mimes:["image/png"],max_bytes:20971520,max_dimension:8192,max_pixels:24000000,max_files:1,max_gallery_items:20,video:{enabled:false,reason:"video_unsupported"},image_decoder_required:true};
function state(role:"client"|"specialist"="specialist"):AuthSessionData {return {sessionId:"9aa0a1b2-c3d4-4e5f-8a90-b1c2d3e4f5a6",version:1,auth:{accessToken:"private-access",refreshToken:"private-refresh",accessExpiresAt:Date.now()+90_000,refreshExpiresAt:Date.now()+900_000,generation:"84e86fd2-2205-4880-a65c-4b8da64489f1",account:{id:47,displayName:"نام",role}}};}
function request(body:unknown={},headers:Record<string,string>={}){return new Request(origin+"/api/profile/me",{method:"POST",headers:{origin,"content-type":"application/json",...headers},body:JSON.stringify(body)});}
function fixture(options:{role?:"client"|"specialist";anonymous?:boolean;response?:(path:string,method:string,body:unknown)=>unknown;saveFail?:boolean}={}) {
  let current:AuthSessionData|undefined=options.anonymous?undefined:state(options.role); const saves:AuthSessionData[]=[]; const calls:Array<{path:string;method:string;token:string;body?:unknown}>=[];
  const authGateway:AuthGatewayPort={requestOtp:async()=>{throw Error();},verifyOtp:async()=>{throw Error();},refresh:async()=>{throw Error("must not refresh");},me:async()=>{throw Error();},logoutRefresh:async()=>({logged_out:true})};
  const auth=createAuthCoordinator({session:{read:()=>current,save:async next=>{if(options.saveFail)throw Error("private cookie error");current=next;saves.push(next);},destroy:()=>{current=undefined;}},gateway:authGateway,now:()=>Date.now(),uuid:()=>crypto.randomUUID(),ensureOtpReady:async()=>({mode:"sms",codeLength:5}),refreshCoordinator:createRefreshCoordinator(()=>Date.now())});
  const gateway=createProfileGateway({json:async(path,init)=>{
    calls.push({path,...init}); const replacement=options.response?.(path,init.method,init.body); if(replacement!==undefined)return replacement;
    if(path==="account/me")return {...rawAccount,...(options.role==="client"?{role:"client",specialist:null}:{})};
    if(path==="uploads")return {...rawCap,...(options.role==="client"?{purposes:["public-avatar"]}:{})};
    if(path.includes("gallery"))return {gallery:[],gallery_revision:1,gallery_available:true,status:"pending"};
    return {...rawProfile,...(init.method==="POST"?{status:"pending"}:{})};
  },upload:async(token,input)=>{calls.push({path:"uploads",method:"POST",token});return {id:31,url:"https://media.example/a.png",type:"image",mime:"image/png",purpose:input.purpose};}});
  const s=service.createProfileService({auth,gateway});
  const handlers=adapters.createProfileRouteHandlers({appOrigin:origin,getService:async()=>s});
  return {s,handlers,calls,saves,auth};
}

test("actual production route adapter exposes minimized account/profile/capabilities with private no-store and no cookie writes on GET",async()=>{
  assert.equal(typeof adapters.createProfileRouteHandlers,"function","production profile adapter missing");
  const f=fixture();
  for(const method of ["account","profile","capabilities"] as const){const r=await f.handlers[method](new Request(origin));assert.equal(r.status,200);assert.equal(r.headers.get("cache-control"),"private, no-store");assert.equal(r.headers.has("access-control-allow-origin"),false);const text=await r.text();assert.ok(!text.includes("private-access")&&!text.includes("private-refresh")&&!text.includes("09123456789"));}
  assert.equal(f.saves.length,0);
});

test("invalid Origin, forbidden keys, invalid IDs and malformed bodies cause zero upstream calls",async()=>{
  const f=fixture();
  const results=[await f.handlers.updateAccount(request({role:"administrator"})),await f.handlers.updateProfile(request({status:"publish"})),await f.handlers.submit(request({verified:true})),await f.handlers.addGallery(request({media_id:1,owner:47})),await f.handlers.deleteGallery(request(),"1/2"),await f.handlers.updateAccount(request({}, {origin:"https://evil.example"}))];
  for(const r of results)assert.ok([403,422].includes(r.status));
  assert.equal(f.calls.length,0);
});

test("anonymous and clients cannot use specialist operations; clients retain account/avatar capability",async()=>{
  const anonymous=fixture({anonymous:true}); assert.equal((await anonymous.handlers.account(new Request(origin))).status,401);assert.equal(anonymous.calls.length,0);
  const client=fixture({role:"client"}); assert.equal((await client.handlers.profile(new Request(origin))).status,403);assert.equal(client.calls.length,0);
  assert.equal((await client.handlers.account(new Request(origin))).status,200);
  assert.equal((await client.handlers.capabilities(new Request(origin))).status,200);
  const data=new FormData();data.append("purpose","public-portfolio");data.append("file",new File(["x"],"a.png",{type:"image/png"}));
  const r=await client.handlers.upload(new Request(origin,{method:"POST",headers:{origin},body:data}));assert.equal(r.status,403);assert.equal(client.calls.some(c=>c.method==="POST"),false);
});

test("account mutation rereads authoritative identity and updates summary without rotation",async()=>{
  let written=false;
  const f=fixture({response:(path,method)=>{if(path!=="account/me")return undefined;if(method==="POST")written=true;return {...rawAccount,display_name:written?"تازه":"نام"};}});
  const r=await f.handlers.updateAccount(request({display_name:"تازه"}));assert.equal(r.status,200);
  assert.deepEqual(f.calls.map(c=>[c.path,c.method]),[["account/me","POST"],["account/me","GET"]]);
  assert.equal(f.saves.length,1);assert.equal(f.saves[0].auth!.account.displayName,"تازه");assert.equal(f.saves[0].auth!.refreshToken,"private-refresh");
  assert.equal((await r.json()).account.displayName,"تازه");
});

test("owner identity/role/link mismatches and save failures never return authenticated success",async()=>{
  for(const patch of [{id:90},{role:"client"}]){const f=fixture({response:()=>({...rawAccount,...patch})});const r=await f.handlers.updateAccount(request({display_name:"تازه"}));assert.equal(r.status,503);assert.equal(f.saves.length,0);}
  const mismatch=fixture({response:path=>path==="profile/me"?{...rawProfile,id:90}:undefined});assert.equal((await mismatch.handlers.profile(new Request(origin))).status,503);
  const failed=fixture({saveFail:true});assert.equal((await failed.handlers.updateAccount(request({display_name:"تازه"}))).status,503);assert.equal(failed.calls.length,2);
  const noConfig=adapters.createProfileRouteHandlers({appOrigin:undefined,getService:async()=>{throw Error("must not open");}});assert.equal((await noConfig.account(new Request(origin))).status,503);
});

test("query-driven proxy/authority attempts are rejected without upstream activity",async()=>{
  const f=fixture();
  for(const method of ["account","profile","capabilities"] as const){const r=await f.handlers[method](new Request(origin+"/?rest_route=/wp/v2/users&owner=99"));assert.equal(r.status,400);}
  const r=await f.handlers.updateAccount(new Request(origin+"/?owner=99",{method:"POST",headers:{origin,"content-type":"application/json"},body:"{}"}));assert.equal(r.status,400);assert.equal(f.calls.length,0);
});

test("multipart production adapter accepts fixed public-avatar bytes without serializing credentials",async()=>{
  const f=fixture({role:"client"});const data=new FormData();data.append("file",new File(["boundary-only-fixture"],"avatar.png",{type:"image/png"}));data.append("purpose","public-avatar");
  const r=await f.handlers.upload(new Request(origin+"/api/profile/media",{method:"POST",headers:{origin},body:data}));assert.equal(r.status,200);const body=await r.json();assert.equal(body.media.purpose,"public-avatar");assert.equal(body.media.type,"image");assert.ok(!JSON.stringify(body).includes("private-access"));assert.deepEqual(f.calls.map(c=>[c.path,c.method]),[["uploads","POST"]]);
});

test("bodyless DELETE checks CSRF and sends only an empty revision object",async()=>{
  const f=fixture();
  const r=await f.handlers.deleteGallery(new Request(origin+"/api/profile/gallery/media/31",{method:"DELETE",headers:{origin}}),"31");assert.equal(r.status,200);assert.deepEqual(f.calls.at(-1)!.body,{});
  const denial=fixture();const bad=await denial.handlers.deleteGallery(new Request(origin,{method:"DELETE"}),"31");assert.equal(bad.status,403);assert.equal(denial.calls.length,0);
});

test("logout during a completed upstream mutation reports reload rather than replay or rollback",async()=>{
  let release!:()=>void;let started!:()=>void;let persisted=false;
  const wait=new Promise<void>(r=>{release=r;});const entered=new Promise<void>(r=>{started=r;});
  const f=fixture({response:async(path,method)=>{if(method==="POST"){persisted=true;started();await wait;return {...rawProfile,status:"pending"};}return rawAccount;}});
  const pending=f.handlers.updateProfile(request({bio:"تازه"}));await entered;await f.auth.logout();release();const r=await pending;
  assert.equal(r.status,401);assert.equal((await r.json()).error.reloadRequired,true);assert.equal(persisted,true);assert.equal(f.calls.filter(c=>c.method==="POST").length,1);assert.equal(f.saves.length,0);
});

test("logout during owner preflight prevents the later mutation from being sent",async()=>{
  let release!:()=>void; let started!:()=>void;
  const wait=new Promise<void>(r=>{release=r;});const entered=new Promise<void>(r=>{started=r;});
  const f=fixture({response:async(path,method)=>{if(path==="account/me" && method==="GET"){started();await wait;return rawAccount;}return rawProfile;}});
  const pending=f.handlers.updateProfile(request({bio:"تازه"}));await entered;await f.auth.logout();release();
  const r=await pending;assert.equal(r.status,401);assert.equal(f.calls.filter(c=>c.method==="POST").length,0);
});

test("fixed profile/submit/gallery/delete paths preserve draft/pending truth and return safe stale-revision errors without replay",async()=>{
  const f=fixture();
  for(const [method,body,id] of [["updateProfile",{bio:"تازه"},undefined],["submit",{},undefined],["addGallery",{media_id:31,expected_revision:0},undefined],["deleteGallery",{expected_revision:1},"31"]] as const){const r=method==="deleteGallery"?await f.handlers.deleteGallery(request(body),id!):await f.handlers[method](request(body));assert.equal(r.status,200);}
  assert.deepEqual(f.calls.filter(c=>c.method!=="GET").map(c=>c.path),["profile/me","profile/me/submit","profile/me/gallery","profile/me/gallery/media/31"]);
  const conflict=fixture({response:(_path,method)=>{if(method==="POST")throw new WordPressApiError({status:409,code:"gallery_revision_conflict",message:"private-access 09123456789"});}});
  const r=await conflict.handlers.addGallery(request({media_id:31,expected_revision:1}));assert.equal(r.status,409);assert.equal((await r.json()).error.code,"gallery_revision_conflict");assert.equal(conflict.calls.filter(c=>c.method==="POST").length,1);
  const uncertain=fixture({response:(_path,method)=>{if(method==="POST")throw Error("private-access 09123456789 /server/path");}});
  const e=await uncertain.handlers.updateProfile(request({bio:"تازه"}));assert.equal(e.status,503);const text=await e.text();assert.ok(!text.includes("09123456789"));assert.equal(uncertain.calls.filter(c=>c.method==="POST").length,1);
});
