import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {ClientDashboard} from '../ClientDashboard.tsx';
import {ProDashboard} from '../ProDashboard.tsx';
import {AccountForm,ProfessionalForm} from './OwnerForms.tsx';
import {MediaUpload} from './MediaUpload.tsx';
import type {AccountDto,ProfileDto,MediaCapabilitiesDto} from '@/services/profile/profile-contracts';
const account:AccountDto={id:1,displayName:'نام واقعی',role:'client',loginPhoneMasked:'09*****4567',avatar:null,location:null,specialist:null};
const profile:ProfileDto={id:8,slug:'worker',title:'نقاش واقعی',status:'pending',categories:[{id:17,name:'نقاشی',slug:'paint'}],cities:[],avatar:null,bio:'معرفی ذخیره‌شده',skills:'مهارت',address:'نشانی خصوصی',availability:'',priceHint:'',experienceYears:0,gallery:[],galleryRevision:3,galleryAvailable:true};
const capabilities:MediaCapabilitiesDto={purposes:['public-avatar'],imageMimes:['image/jpeg','image/webp'],maxBytes:1000,maxDimension:100,maxPixels:10000,maxFiles:1,maxGalleryItems:20,video:{enabled:false,reason:'video_unsupported'},imageDecoderRequired:true};
const render=renderToStaticMarkup;
test('client workspace marks current section and makes search the primary task without specialist links',()=>{
 const html=render(createElement(ClientDashboard,{displayName:account.displayName}));
 assert.match(html,/max-w-5xl/);assert.match(html,/<a[^>]*aria-current="page"[^>]*href="\/dashboard"|<a[^>]*href="\/dashboard"[^>]*aria-current="page"/);
 assert.match(html,/<a[^>]*class="[^"]*bg-primary[^"]*"[^>]*href="\/search"|<a[^>]*href="\/search"[^>]*class="[^"]*bg-primary/);
 assert.doesNotMatch(html,/href="\/pro|تومان|درصد|verified/);assert.match(html,/نام واقعی/);
});
test('specialist workspace prioritizes completing a profile and retains truthful disconnected services',()=>{
 const html=render(createElement(ProDashboard,{displayName:account.displayName}));
 assert.match(html,/تکمیل پروفایل حرفه‌ای/);assert.match(html,/aria-current="page"/);assert.match(html,/متصل نیست/);
 assert.doesNotMatch(html,/تومان|درصد|تاییدشده|پروژه موفق/);
});
test('professional fields are semantically grouped, private address separate and save remains inside the form',()=>{
 const html=render(createElement(ProfessionalForm,{profile,cities:[],categories:[],disabled:true,onSave:async()=>{}}));
 for(const title of ['معرفی و مهارت‌ها','خدمات و محدوده فعالیت','شرایط همکاری','نشانی خصوصی']) assert.match(html,new RegExp(`<legend[^>]*>${title}`));
 assert.match(html,/<fieldset disabled=""/);assert.match(html,/<form[\s\S]*<button[^>]*type="submit"[\s\S]*ذخیره[\s\S]*<\/form>/);
 assert.match(html,/value="0"/);assert.doesNotMatch(html,/name="(?:status|verified|role)"/);
});
test('account identity is visibly grouped as readonly and excluded from save payload fields',()=>{
 const html=render(createElement(AccountForm,{account,cities:[],disabled:false,onSave:async()=>{}}));
 assert.match(html,/<legend[^>]*>شناسه‌های ورود/);assert.match(html,/09\*{5}4567/);
 assert.equal((html.match(/readOnly=""/g)||[]).length,2);assert.doesNotMatch(html,/name="(?:phone|role|login-phone|account-role)"/);
});
test('upload workspace describes its actual empty stage and gates picker after visible public consent',()=>{
 const html=render(createElement(MediaUpload,{purpose:'public-avatar',capabilities,disabled:false,upload:async()=>{throw Error();},assign:async()=>false}));
 assert.match(html,/هنوز تصویری انتخاب نشده/);assert.match(html,/انتخاب تصویر[\s\S]*بارگذاری فایل[\s\S]*اتصال به پروفایل/);
 assert.ok(html.indexOf('عمومی بودن فایل')<html.indexOf('type="file"'));
 assert.match(html,/<input[^>]*type="file"[^>]*disabled=""/);assert.match(html,/حتی اگر پروفایل پیش‌نویس/);
});
test('unsupported media purpose never exposes a picker or hides public URL warning',()=>{
 const html=render(createElement(MediaUpload,{purpose:'public-portfolio',capabilities,disabled:false,upload:async()=>{throw Error();},assign:async()=>false}));
 assert.match(html,/قابلیت بارگذاری در دسترس نیست/);assert.match(html,/نشانی فایل بارگذاری‌شده عمومی است/);assert.doesNotMatch(html,/type="file"/);
});
