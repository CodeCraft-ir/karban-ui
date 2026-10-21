import assert from 'node:assert/strict';
import { test } from 'node:test';
import {ProfileBoundaryError} from '../services/profile/profile-contracts.ts';
import * as client from './owner-client.ts';
const account={id:2,displayName:'نام',role:'client',loginPhoneMasked:null,avatar:null,location:null,specialist:null};
const profile={id:8,slug:'worker',title:'نام',status:'draft',categories:[],cities:[],avatar:null,bio:'',skills:'',address:'',availability:'',priceHint:'',experienceYears:null,gallery:[],galleryRevision:3,galleryAvailable:true};

test('production client sends fixed account snake fields and updates shared summary only after success',async()=>{
  assert.equal(typeof client.createOwnerClient,'function');
  const calls:Array<[string,RequestInit|undefined]>=[];let synced=0;
  const api=client.createOwnerClient(async(path,init)=>{calls.push([String(path),init]);return Response.json({account});},async()=>{synced++;});
  assert.deepEqual(await api.saveAccount({display_name:'نام',account_city_id:null}),account);
  assert.equal(calls[0][0],'/api/account/me');assert.equal(calls[0][1]?.method,'POST');
  assert.deepEqual(JSON.parse(calls[0][1]?.body as string),{display_name:'نام',account_city_id:null});assert.equal(synced,1);
  await assert.rejects(()=>api.saveAccount({role:'specialist'}));assert.equal(calls.length,1);
});
test('recovery refreshes only an actual refresh_required response, never healthy or lost sessions',async()=>{
 const calls:string[]=[];const api=client.createOwnerClient(async(path,init)=>{calls.push(`${init?.method??'GET'} ${path}`);return Response.json({account});},async()=>{});
 assert.deepEqual(await api.recoverAccount(),account);assert.deepEqual(calls,['GET /api/account/me']);
 const lost:string[]=[];const invalid=client.createOwnerClient(async(path)=>{lost.push(String(path));return Response.json({error:{code:'unauthenticated'}},{status:401});},async()=>{});
 await assert.rejects(()=>invalid.recoverAccount());assert.deepEqual(lost,['/api/account/me']);
});
test('explicit refresh singleflights and rereads GET; failed mutations and uploads are never replayed',async()=>{
  assert.equal(typeof client.createOwnerClient,'function');
  const calls:string[]=[]; let release!:()=>void; const gate=new Promise<void>(r=>{release=r;});
  let refreshed=false;
  const api=client.createOwnerClient(async(path,init)=>{calls.push(`${init?.method??'GET'} ${path}`);if(path==='/api/auth/refresh'){await gate;refreshed=true;return Response.json({account});}return refreshed?Response.json({account}):Response.json({error:{code:'refresh_required'}},{status:401});},async()=>{});
  const a=api.recoverAccount();const b=api.recoverAccount(); release();await Promise.all([a,b]);
  assert.equal(calls.filter(x=>x==='POST /api/auth/refresh').length,1);assert.equal(calls.filter(x=>x==='GET /api/account/me').length,4);
  const failedCalls:string[]=[];
  const failed=client.createOwnerClient(async(path)=>{failedCalls.push(String(path));return Response.json({error:{code:'refresh_required',reloadRequired:true}},{status:401});},async()=>{});
  await assert.rejects(()=>failed.saveAccount({display_name:'نام'}));
  const file=new File(['image'],'test.png',{type:'image/png'});
  await assert.rejects(()=>failed.upload(file,'public-avatar'));
  assert.deepEqual(failedCalls,['/api/account/me','/api/profile/media']);
});
test('uploaded media stays separate from assignment; gallery uses latest revision and detach ID',async()=>{
  assert.equal(typeof client.createOwnerClient,'function');const calls:Array<[string,RequestInit|undefined]>=[];
  const media={id:31,url:'https://example.test/photo.png',type:'image',mime:'image/png',purpose:'public-portfolio'};
  const api=client.createOwnerClient(async(path,init)=>{calls.push([String(path),init]); if(path==='/api/profile/media')return Response.json({media});return Response.json({gallery:{gallery:[],galleryRevision:4,galleryAvailable:true,status:'pending'}});},async()=>{});
  assert.deepEqual(await api.upload(new File(['image'],'test.png',{type:'image/png'}),'public-portfolio'),media);
  assert.equal(calls.length,1); const multipart=calls[0][1]?.body as FormData; assert.deepEqual([...multipart.keys()],['file','purpose']);
  await api.addGallery(31,'تصویر',profile as never);
  assert.deepEqual(JSON.parse(calls[1][1]?.body as string),{media_id:31,caption:'تصویر',kind:'image',expected_revision:3});
  await api.detachGallery(31,{...profile,galleryRevision:4} as never);
  assert.equal(calls[2][0],'/api/profile/gallery/media/31');assert.deepEqual(JSON.parse(calls[2][1]?.body as string),{expected_revision:4});
  await assert.rejects(()=>api.addGallery(31,'',{...profile,galleryAvailable:false} as never));assert.equal(calls.length,3);
});
test('409 reloadRequired is retained without trusting backend message; failed refresh cannot claim a session',async()=>{
  assert.equal(typeof client.createOwnerClient,'function');
  const api=client.createOwnerClient(async()=>Response.json({error:{code:'gallery_revision_conflict',reloadRequired:true,message:'secret'}},{status:409}),async()=>{});
  await assert.rejects(()=>api.addGallery(2,'',profile as never),(error:unknown)=>{assert.ok(error instanceof client.OwnerClientError);assert.equal(error.reloadRequired,true);assert.equal(error.status,409);assert.equal(error.message.includes('secret'),false);return true;});
  let synced=0;const broken=client.createOwnerClient(async(path)=>path==='/api/auth/refresh'?Response.json({error:{code:'auth_unavailable'}},{status:503}):Response.json({error:{code:'refresh_required'}},{status:401}),async()=>{synced++;});
  await assert.rejects(()=>broken.recoverAccount());assert.equal(synced,0);
});
test('malformed success after a possible write stays uncertain, unlike local validation',async()=>{
 const api=client.createOwnerClient(async()=>Response.json({account:{id:1,displayName:'bad'}}),async()=>{throw new Error('must not sync');});
 await assert.rejects(()=>api.saveAccount({display_name:'نام'}),(error:unknown)=>{assert.ok(error instanceof client.OwnerClientError);assert.equal(error.reloadRequired,true);assert.equal(error.code,'operation_uncertain');return true;});
});
test('local input rejection is not presented as an ambiguously completed mutation',async()=>{
 let reads=0;const result=await client.settleOwnerAction(async()=>{throw new ProfileBoundaryError();},async()=>{reads++;return profile;});
 assert.equal(result.ok,false);if(!result.ok){assert.equal(result.error.status,422);assert.equal(result.error.reloadRequired,false);}assert.equal(reads,0);
});
test('failed mutation rereads authoritative state once, never retries or fabricates success',async()=>{
 assert.equal(typeof client.settleOwnerAction,'function');let writes=0;let reads=0;
 const result=await client.settleOwnerAction(async()=>{writes++;throw new client.OwnerClientError(409,'gallery_revision_conflict',true);},async()=>{reads++;return profile;});
 assert.equal(result.ok,false);if(!result.ok){assert.deepEqual(result.state,profile);assert.equal(result.reloadFailed,false);}assert.equal(writes,1);assert.equal(reads,1);
 const lost=await client.settleOwnerAction(async()=>{throw new client.OwnerClientError(503,'operation_uncertain',true);},async()=>{throw new Error();});
 assert.equal(lost.ok,false);if(!lost.ok)assert.equal(lost.reloadFailed,true);
});

test('lifetime gate denies double actions and drops cancelled results',async()=>{
  assert.equal(typeof client.createActionGate,'function'); const gate=client.createActionGate();const run=gate.begin();assert.ok(run);assert.equal(gate.begin(),null);gate.cancel();assert.equal(run.current(),false);run.finish();
});
