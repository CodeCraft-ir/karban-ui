import { parseInput, type AccountDto, type ProfileDto, type MediaCapabilitiesDto } from '../services/profile/profile-contracts.ts';
import type { PublicTerm } from './contracts/specialists.ts';
import type { RegistrationRole } from './contracts/auth.ts';

export const OWNER_TARGETS = ['/account','/pro/profile','/dashboard','/pro'] as const;
export type OwnerTarget = typeof OWNER_TARGETS[number];
export function recoveryTarget(value: unknown): OwnerTarget {
  return OWNER_TARGETS.includes(value as OwnerTarget) ? value as OwnerTarget : '/account';
}
export function accountLinks(role: RegistrationRole) {
  return [ {href:'/account',label:'حساب شخصی'}, ...(role === 'specialist' ? [{href:'/pro/profile',label:'ویرایش پروفایل حرفه‌ای'}] : []), {href:role === 'specialist' ? '/pro':'/dashboard',label:'داشبورد'} ];
}
function numeric(form: FormData, key: string): number | null {
  const raw = form.get(key);
  if (raw === '') return null;
  if (typeof raw !== 'string' || !/^(0|[1-9]\d*)$/.test(raw)) throw new Error('invalid_request');
  return Number(raw);
}
export function accountInput(form: FormData) {
  return parseInput('account',{display_name:form.get('display_name'),account_city_id:numeric(form,'account_city_id')});
}
export function profileInput(form: FormData) {
  const fields = Object.fromEntries(['title','bio','skills','availability','price_hint','address'].map(key=>[key,form.get(key)]));
  const category_ids = form.getAll('category_ids').map(raw=>{
    if(typeof raw !== 'string' || !/^[1-9]\d*$/.test(raw)) throw new Error('invalid_request'); return Number(raw);
  });
  return parseInput('profile',{...fields,category_ids,city_id:numeric(form,'city_id'),experience_years:numeric(form,'experience_years')});
}
export interface OwnerError { status: number; code: string; reloadRequired?: boolean; }
export function uploadOutcomeUncertain(error:OwnerError):boolean {
  return error.status>=500 || error.code==='operation_uncertain' || (error.reloadRequired===true && ![413,415,422].includes(error.status));
}
export function ownerErrorText(error: OwnerError): string {
  if(error.code === 'refresh_required') return 'اعتبار دسترسی تمام شده است؛ بازیابی نشست را انتخاب کنید. تغییرات خودکار تکرار نمی‌شوند.';
  if(error.status === 401) return 'نشست معتبر نیست؛ دوباره وارد شوید.';
  if(error.code === 'image_decoder_unavailable_or_invalid') return 'پردازش این تصویر ممکن نیست. پشتیبانی WebP به کُدک سرور وابسته است؛ یک تصویر JPEG یا PNG سالم انتخاب کنید.';
  if(error.status === 415) return 'این فایل تصویر قابل پشتیبانی نیست. ویدیو پشتیبانی نمی‌شود.';
  if(error.status === 413) return 'حجم تصویر بیش از حد مجاز است.';
  if(error.code === 'profile_incomplete') return 'برای ارسال به بررسی، عنوان، دسته و شهر خدمت را تکمیل و ذخیره کنید.';
  if(error.status === 422) {
    if(error.code === 'invalid_display_name') return 'نام نمایشی معتبر نیست؛ نامی غیرخالی و حداکثر ۱۰۰ نویسه، بدون خط جدید یا نشانه‌های غیرمجاز وارد کنید.';
    if(error.code === 'invalid_city') return 'شهر انتخاب‌شده معتبر نیست؛ یکی از شهرهای فهرست را انتخاب کنید.';
    if(error.code === 'unknown_field') return 'درخواست شامل فیلد غیرمجاز است؛ صفحه را دوباره بارگذاری و ورودی‌ها را بررسی کنید.';
    return 'اطلاعات درخواست معتبر نیست؛ ورودی‌ها را بررسی و دوباره تلاش کنید.';
  }
  if(error.code === 'operation_uncertain') return 'ممکن است عملیات ثبت شده باشد. وضعیت را دوباره بارگذاری کنید؛ ارسال خودکار تکرار نمی‌شود.';
  if(error.status === 409 || error.reloadRequired) return 'وضعیت ممکن است تغییر کرده باشد. اطلاعات تازه بارگذاری می‌شود؛ پیش از اقدام دوباره آن را بررسی کنید.';
  return 'اطلاعات فعلاً در دسترس نیست. بارگذاری مجدد را انتخاب کنید.';
}
export interface OwnerReadPorts {
  account(): Promise<AccountDto>; profile(): Promise<ProfileDto>; capabilities():Promise<MediaCapabilitiesDto>;
  cities():Promise<PublicTerm[]>; categories():Promise<PublicTerm[]>;
}
export type OwnerScreen =
 | {kind:'ready';account:AccountDto;profile:ProfileDto|null;capabilities:MediaCapabilitiesDto|null;cities:PublicTerm[];categories:PublicTerm[];optionsUnavailable:boolean}
 | {kind:'redirect';location:'/auth/login'|'/dashboard'|'/pro'}
 | {kind:'recovery';target:OwnerTarget}
 | {kind:'unavailable'};
export async function loadAccountEntry(role:RegistrationRole,read:()=>Promise<AccountDto>,target:OwnerTarget):Promise<{kind:'ready';account:AccountDto}|Exclude<OwnerScreen,{kind:'ready'}>> {
  try {
    const account=await read();
    if(account.role!==role)return {kind:'redirect',location:account.role==='client'?'/dashboard':'/pro'};
    return {kind:'ready',account};
  }catch(error){
    const code=error&&typeof error==='object'&&'code' in error?error.code:null;
    if(code==='refresh_required')return {kind:'recovery',target};
    if(code==='unauthenticated'||code==='refresh_cancelled')return {kind:'redirect',location:'/auth/login'};
    return {kind:'unavailable'};
  }
}
/** Server composition uses direct injected helpers; never writes cookies or issues self HTTP. */
export async function loadOwnerScreen(kind:'account'|'profile',ports:OwnerReadPorts):Promise<OwnerScreen> {
  try {
    const account=await ports.account();
    if(kind==='profile' && account.role!=='specialist') return {kind:'redirect',location:'/dashboard'};
    const profile=kind==='profile'?await ports.profile():null;
    const [capabilities,cities,categories]=await Promise.all([
      ports.capabilities().catch(()=>null),ports.cities().catch(()=>null),
      kind==='profile'?ports.categories().catch(()=>null):Promise.resolve([]),
    ]);
    return {kind:'ready',account,profile,capabilities,cities:cities??[],categories:categories??[],optionsUnavailable:cities===null||categories===null};
  } catch(error) {
    const code=error && typeof error==='object' && 'code' in error ? error.code : null;
    if(code==='refresh_required') return {kind:'recovery',target:kind==='profile'?'/pro/profile':'/account'};
    if(code==='unauthenticated'||code==='refresh_cancelled') return {kind:'redirect',location:'/auth/login'};
    return {kind:'unavailable'};
  }
}
