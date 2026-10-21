import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MediaUpload} from './MediaUpload.tsx';
import { AccountForm, ProfessionalForm } from './OwnerForms.tsx';
import { ClientDashboard } from '../ClientDashboard.tsx';
import { ProDashboard } from '../ProDashboard.tsx';
import { SpecialistProfile } from '../SpecialistProfile.tsx';
import {parseSpecialistDetail} from '@/lib/specialist-adapters';
import { PortfolioGallery } from '../../blocks/PortfolioGallery.tsx';
import {createOwnerClient,settleOwnerAction} from '@/lib/owner-client';
import type {ProfileDto} from '@/services/profile/profile-contracts';
const account={id:1,displayName:'نام واقعی',role:'client' as const,loginPhoneMasked:'09*****4567',avatar:null,location:{id:42,name:'کاشان',slug:'kashan'},specialist:null};
const profile={id:8,slug:'worker',title:'نقاش واقعی',status:'pending' as const,categories:[{id:17,name:'نقاشی',slug:'paint'}],cities:[],avatar:null,bio:'متن',skills:'مهارت',address:'نشانی خصوصی',availability:'' as const,priceHint:'',experienceYears:0,gallery:[],galleryRevision:3,galleryAvailable:true};
const cities=[{id:42,name:'کاشان',slug:'kashan',count:0}];
test('uncertain mutation and failed rereads keep real editing controls locked until authoritative reread succeeds',async()=>{
 const calls:string[]=[];let getCount=0;let blocked=false;let current:ProfileDto=profile;
 const fresh={...profile,title:'عنوان تازه از سرور',galleryRevision:9};
 const api=createOwnerClient(async(path,init)=>{
  calls.push(`${init?.method??'GET'} ${path}`);
  if(init?.method==='POST')return Response.json({error:{code:'operation_uncertain',reloadRequired:true}},{status:503});
  getCount++;
  return getCount<=2?Response.json({error:{code:'profile_unavailable'}},{status:503}):Response.json({profile:fresh});
 },async()=>{});
 const controls=()=>renderToStaticMarkup(createElement(ProfessionalForm,{profile:current,cities,categories:[],disabled:blocked,onSave:async()=>{}}));
 const uncertain=await settleOwnerAction(()=>api.saveProfile({title:'تغییر صریح'}),()=>api.profile(),blocked);
 assert.equal(uncertain.ok,false);
 if(uncertain.ok)assert.fail('mutation must remain uncertain');
 blocked=uncertain.reloadFailed;
 assert.equal(blocked,true);assert.equal(uncertain.state,undefined);assert.match(controls(),/<fieldset disabled=""/);
 const failedRead=await settleOwnerAction(()=>api.profile(),()=>api.profile(),blocked);
 if(failedRead.ok)assert.fail('first explicit reread must fail');
 assert.equal(failedRead.state,undefined);
 assert.equal(failedRead.reloadFailed,true,'failed explicit GET must preserve the existing recovery lock');
 blocked=failedRead.reloadFailed;
 assert.match(controls(),/<fieldset disabled=""/);assert.equal(current.title,profile.title);
 const recovered=await settleOwnerAction(()=>api.profile(),()=>api.profile(),blocked);
 if(!recovered.ok)assert.fail('second explicit reread must succeed');
 current=recovered.value;blocked=false;
 assert.equal(current.title,fresh.title);assert.equal(current.galleryRevision,9);
 assert.doesNotMatch(controls(),/<fieldset disabled=""/);assert.match(controls(),/عنوان تازه از سرور/);
 assert.deepEqual(calls,['POST /api/profile/me','GET /api/profile/me','GET /api/profile/me','GET /api/profile/me']);
});
test('media picker discloses public purpose before enabled uploads and never promises video or codecs',()=>{
 const html=renderToStaticMarkup(createElement(MediaUpload,{purpose:'public-avatar',capabilities:{purposes:['public-avatar'],imageMimes:['image/jpeg','image/webp'],maxBytes:1000,maxDimension:100,maxPixels:10000,maxFiles:1,maxGalleryItems:20,video:{enabled:false,reason:'video_unsupported'},imageDecoderRequired:true},disabled:false,upload:async()=>{throw new Error();},assign:async()=>false}));
 assert.match(html,/عمومی/);assert.match(html,/حتی.*بررسی/);assert.match(html,/WebP/);assert.match(html,/ویدیو.*پشتیبانی نمی‌شود/);assert.match(html,/accept="image\/jpeg,image\/webp"/);assert.match(html,/disabled=""/);
});
test('account form actually renders masked readonly identity, independent avatar and ID-selected city',()=>{
 const html=renderToStaticMarkup(createElement(AccountForm,{account,cities,disabled:false,onSave:async()=>{}}));
 assert.match(html,/name="display_name"/);assert.match(html,/09\*{5}4567/);assert.match(html,/<option value="42" selected="">/);
 assert.doesNotMatch(html,/name="(?:phone|role|user_id|email|password)"/);
});
test('professional form renders private address, bounded real fields, IDs and truthful review status',()=>{
 const html=renderToStaticMarkup(createElement(ProfessionalForm,{profile,cities,categories:[{id:17,name:'نقاشی',slug:'paint',count:0}],disabled:false,onSave:async()=>{}}));
 assert.match(html,/name="category_ids"[^>]*value="17"/);assert.match(html,/checked=""/);assert.match(html,/name="experience_years"/);assert.match(html,/خصوصی/);assert.match(html,/حداکثر ۴۰۰۰/);
 assert.doesNotMatch(html,/name="(?:verified|status|slug|role)"/);
});
test('authenticated dashboards render profile destinations and unconnected states, never fixture finances',()=>{
 const client=renderToStaticMarkup(createElement(ClientDashboard,{displayName:account.displayName}));
 const pro=renderToStaticMarkup(createElement(ProDashboard,{displayName:account.displayName}));
 assert.match(client,/href="\/account"/);assert.match(pro,/href="\/pro\/profile"/);assert.match(pro,/متصل نیست/);
 for(const html of [client,pro]) assert.doesNotMatch(html,/تومان|verified|۴۸۰|480,000|موجودی کیف پول/);
});
test('public profile composes real gallery and unavailable reviews',()=>{
 const specialist=parseSpecialistDetail({id:8,slug:'worker',title:'نقاش',is_verified:false,categories:[],cities:[],gallery:[{id:9,url:'https://example.test/real.png',type:'image',caption:'بازسازی واقعی'}]});
 const html=renderToStaticMarkup(createElement(SpecialistProfile,{specialist}));
 assert.match(html,/src="https:\/\/example.test\/real.png"/);assert.match(html,/نظر.*دسترس/);
});
test('public portfolio renders actual normalized media and captions, not generated art or tags',()=>{
 const html=renderToStaticMarkup(createElement(PortfolioGallery,{items:[{id:9,url:'https://example.test/real.png',type:'image',caption:'بازسازی واقعی'}]}));
 assert.match(html,/src="https:\/\/example.test\/real.png"/);assert.match(html,/بازسازی واقعی/);assert.doesNotMatch(html,/radial-gradient|پروژه موفق|تومان/);
});
