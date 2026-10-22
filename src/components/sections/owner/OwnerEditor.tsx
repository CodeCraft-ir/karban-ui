"use client";
/* eslint-disable @next/next/no-img-element -- Safe normalized WordPress image URLs. */
import {useEffect,useMemo,useRef,useState} from 'react';
import Link from 'next/link';
import {Button} from '@/components/ui/Button';
import {useAuthSummary} from '@/components/layout/useAuthSummary';
import {createActionGate,createOwnerClient,settleOwnerAction,OwnerClientError} from '@/lib/owner-client';
import {ownerErrorText,type OwnerScreen} from '@/lib/owner-ui';
import type {AccountDto,ProfileDto,UploadDto} from '@/services/profile/profile-contracts';
import {AccountForm,ProfessionalForm} from './OwnerForms';
import {MediaUpload} from './MediaUpload';
import {WorkspaceHeader,SavedProfileSummary,ProfileReviewPanel,workspaceClass,workspaceLink} from './AccountWorkspace';

type Ready=Extract<OwnerScreen,{kind:'ready'}>;
export function OwnerEditor({initial}:{initial:Ready}) {
 const summary=useAuthSummary();const client=useMemo(()=>createOwnerClient(fetch,summary.refresh),[summary.refresh]);
 const [account,setAccount]=useState(initial.account);const [profile,setProfile]=useState(initial.profile);
 const [capabilities,setCapabilities]=useState(initial.capabilities);
 const [pending,setPending]=useState(false);const [blocked,setBlocked]=useState(false);const [error,setError]=useState<OwnerClientError|null>(null);const [notice,setNotice]=useState('');const [revision,setRevision]=useState(0);
 const gate=useRef(createActionGate());const professional=initial.profile!==null;
 useEffect(()=>{const g=gate.current;return ()=>g.cancel();},[]);
 useEffect(()=>{if(summary.logoutPending||summary.logoutError)gate.current.cancel();},[summary.logoutPending,summary.logoutError]);
 useEffect(()=>{
  const controller=new AbortController();
  client.capabilities(controller.signal).then(value=>{if(!controller.signal.aborted)setCapabilities(value);}).catch(()=>{if(!controller.signal.aborted)setCapabilities(null);});
  return ()=>controller.abort();
 },[client]);
 const apply=(next:AccountDto|ProfileDto)=>{if('displayName' in next)setAccount(next);else setProfile(next);setRevision(n=>n+1);};
 const read=async():Promise<AccountDto|ProfileDto>=>professional?client.profile():client.account();
 const act=async<T,>(operation:()=>Promise<T>,accept:(value:T)=>void,message:string,authoritativeRead=false):Promise<boolean>=>{
  if(blocked&&!authoritativeRead)return false;
  const action=gate.current.begin();if(!action)return false;
  setPending(true);setError(null);setNotice('');
  try{
   const outcome=await settleOwnerAction(operation,read,blocked);
   if(!action.current())return false;
   if(outcome.ok){accept(outcome.value);setNotice(message);if(authoritativeRead)setBlocked(false);return true;}
   setError(outcome.error);if(outcome.state)apply(outcome.state);setBlocked(outcome.reloadFailed);
   return false;
  }finally{if(action.current())setPending(false);action.finish();}
 };
 const reload=()=>act(read,apply,'اطلاعات تازه خوانده شد. تغییرات ذخیره‌نشده را دوباره بررسی کنید.',true);
 const assignAvatar=(asset:UploadDto)=>professional?
  act(()=>client.saveProfile({avatar_id:asset.id}),value=>apply(value),'آواتار حرفه‌ای ذخیره شد؛ انتشار از وضعیت پروفایل پیروی می‌کند.'):
  act(()=>client.saveAccount({avatar_id:asset.id}),value=>apply(value),'آواتار حساب شخصی ذخیره شد.');
 const upload=async(file:File,purpose:'public-avatar'|'public-portfolio')=>{
  if(blocked)throw new OwnerClientError(409,'operation_uncertain',true);
  const action=gate.current.begin();if(!action)throw new OwnerClientError(409,'gallery_busy');
  setPending(true);setError(null);setNotice('');
  try{
   const outcome=await settleOwnerAction(()=>client.upload(file,purpose),read,blocked);
   if(!action.current())throw new OwnerClientError(401,'unauthenticated');
   if(outcome.ok)return outcome.value;
   setError(outcome.error);if(outcome.state)apply(outcome.state);setBlocked(outcome.reloadFailed);
   throw outcome.error;
  }finally{if(action.current())setPending(false);action.finish();}
 };
 if(summary.logoutPending||summary.logoutError||!summary.account||summary.account.id!==account.id||summary.account.role!==account.role) return <section className="mx-auto max-w-xl space-y-4 px-5 py-12"><h1 className="text-xl font-bold">{summary.logoutPending?'در حال خروج از حساب':'بررسی دسترسی حساب'}</h1><p className="leading-8 text-muted">{summary.error?'خلاصه حساب در دسترس نیست. اطلاعات خصوصی تا بررسی نشست نمایش داده نمی‌شود.':'برای مشاهده و ویرایش، نشست معتبر لازم است.'}</p><Link className="owner-link" href="/auth/login">ورود به حساب</Link></section>;
 const avatar=professional?profile?.avatar:account.avatar;
 const disabled=pending||blocked;
 return <div className={workspaceClass} dir="rtl" aria-busy={pending}>
  <WorkspaceHeader role={account.role} current={professional?'/pro/profile':'/account'} title={professional?'پروفایل حرفه‌ای':'حساب شخصی'} description={professional?'پروفایل عمومی کسب‌وکار از اطلاعات حساب شخصی جداست. اطلاعات را ذخیره کنید و وضعیت بررسی را جداگانه ببینید.':'نام نمایشی، شهر و آواتار شخصی را مدیریت کنید؛ نقش و شماره ورود ثابت می‌ماند.'} />
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-elev p-4"><p className="text-sm leading-7 text-muted">{pending?'عملیات در حال انجام است؛ لطفاً صبر کنید.':blocked?'برای ادامه، وضعیت سرور را دوباره بخوانید.':'برای دریافت آخرین وضعیت ذخیره‌شده از سرور'}</p><Button variant="ghost" disabled={pending} onClick={()=>void reload()}>بارگذاری دوباره وضعیت</Button>{error?.code==='refresh_required'&&<Link className={workspaceLink} href={`/auth/recover?returnTo=${professional?'/pro/profile':'/account'}`}>بازیابی نشست؛ بدون تکرار تغییرات</Link>}{error?.status===401&&error.code!=='refresh_required'&&<Link className={workspaceLink} href="/auth/login">ورود دوباره</Link>}</div>
  {error&&<p role="alert" className="rounded-2xl border border-alert/30 p-4 text-sm leading-8 text-alert">{ownerErrorText(error)}{blocked?' خواندن وضعیت موفق نبود؛ تا بارگذاری دوباره، تغییرات غیرفعال است.':''}</p>}
  {notice&&<p role="status" className="rounded-2xl border border-accent/30 p-4 text-sm leading-8 text-fg-soft">{notice}</p>}
  {initial.optionsUnavailable&&<p role="status" className="text-sm leading-7 text-alert">فهرست شهرها یا دسته‌ها خوانده نشد؛ فرم تا بارگذاری دوباره صفحه غیرفعال است.</p>}
  {profile&&<SavedProfileSummary profile={profile} />}
  <section className="rounded-3xl border border-line bg-card p-5 sm:p-7">{profile?<ProfessionalForm key={revision} profile={profile} cities={initial.cities} categories={initial.categories} disabled={disabled||initial.optionsUnavailable} onSave={async input=>{await act(()=>client.saveProfile(input),value=>apply(value),'تغییرات ذخیره شد؛ وضعیت انتشار را بررسی کنید.');}} />:<AccountForm key={revision} account={account} cities={initial.cities} disabled={disabled||initial.optionsUnavailable} onSave={async input=>{await act(()=>client.saveAccount(input),value=>apply(value),'اطلاعات شخصی ذخیره شد و خلاصه حساب تازه شد.');}} />}</section>
  <section className="space-y-4 rounded-[2rem] border border-line bg-card p-5 sm:p-7"><h2 className="text-lg font-bold">{professional?'آواتار حرفه‌ای':'آواتار حساب شخصی'}</h2>{avatar?<><img src={avatar.url} alt="آواتار فعلی" className="h-24 w-24 rounded-2xl object-cover" /><Button variant="outline" disabled={disabled} onClick={()=>void (professional?act(()=>client.saveProfile({avatar_id:null}),value=>apply(value),'ارجاع آواتار پاک شد؛ فایل حذف نشده است.'):act(()=>client.saveAccount({avatar_id:null}),value=>apply(value),'ارجاع آواتار پاک شد؛ فایل حذف نشده است.'))}>پاک کردن آواتار</Button></>:<p className="text-sm text-muted">آواتاری ثبت نشده است.</p>}<MediaUpload purpose="public-avatar" capabilities={capabilities} disabled={disabled} upload={upload} assign={assignAvatar} /></section>
  {profile&&<section className="space-y-4 rounded-[2rem] border border-line bg-card p-5 sm:p-7"><h2 className="text-lg font-bold">گالری نمونه کار</h2><p className="text-sm leading-7 text-muted">حداکثر {Math.min(20,capabilities?.maxGalleryItems??20).toLocaleString('fa-IR')} تصویر. جدا کردن فقط ارجاع را حذف می‌کند؛ فایل عمومی حذف نمی‌شود.</p>{!profile.galleryAvailable&&<p role="status" className="text-sm leading-8 text-alert">ذخیره‌سازی استاندارد گالری در دسترس نیست؛ تصاویر عمومی معتبر فقط خواندنی هستند. انتقال خودکار داده‌های قدیمی انجام نمی‌شود.</p>}{profile.gallery.length===0&&<p className="text-sm text-muted">تصویری در گالری ثبت نشده است.</p>}<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{profile.gallery.map(item=><figure key={item.id} className="min-w-0 rounded-3xl border border-line bg-elev p-3"><img src={item.url} alt={item.caption||'نمونه کار ثبت‌شده'} className="aspect-[4/3] w-full rounded-xl object-cover" /><figcaption className="my-3 break-words text-sm leading-7">{item.caption||'نمونه کار متصل‌شده'}</figcaption><Button variant="outline" disabled={disabled||!profile.galleryAvailable} onClick={()=>void act(()=>client.detachGallery(item.id,profile),gallery=>setProfile(value=>value?{...value,...gallery}:value),'ارجاع تصویر جدا شد؛ فایل عمومی حذف نشده است.')}>جدا کردن از گالری</Button></figure>)}</div><MediaUpload purpose="public-portfolio" capabilities={capabilities} disabled={disabled||!profile.galleryAvailable||profile.gallery.length>=Math.min(20,capabilities?.maxGalleryItems??20)} upload={upload} assign={(asset,caption)=>act(()=>client.addGallery(asset.id,caption,profile),gallery=>setProfile(value=>value?{...value,...gallery}:value),'تصویر به گالری متصل شد؛ وضعیت انتشار را بررسی کنید.')} /></section>}
  {profile&&<ProfileReviewPanel status={profile.status} disabled={disabled} onSubmit={()=>void act(()=>client.submitProfile(),value=>apply(value),'پاسخ ارسال دریافت شد؛ وضعیت فعلی از سرور خوانده شده است.')} />}
 </div>;
}
