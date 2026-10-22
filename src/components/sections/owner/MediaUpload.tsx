"use client";
/* eslint-disable @next/next/no-img-element -- Local object URLs and normalized public WordPress media. */
import {useEffect,useId,useRef,useState} from 'react';
import {Button} from '@/components/ui/Button';
import {createActionGate,OwnerClientError} from '@/lib/owner-client';
import {ownerErrorText,uploadOutcomeUncertain} from '@/lib/owner-ui';
import {uploadPresentation,workspaceLink} from './AccountWorkspace';
import type {MediaCapabilitiesDto,PublicMediaPurpose,UploadDto} from '@/services/profile/profile-contracts';

export function MediaUpload({purpose,capabilities,disabled,upload,assign}:{purpose:PublicMediaPurpose;capabilities:MediaCapabilitiesDto|null;disabled:boolean;upload:(file:File,purpose:PublicMediaPurpose)=>Promise<UploadDto>;assign:(media:UploadDto,caption:string)=>Promise<boolean>}) {
 const id=useId();const [consent,setConsent]=useState(false);const [file,setFile]=useState<File|null>(null);
 const [preview,setPreview]=useState('');const [asset,setAsset]=useState<UploadDto|null>(null);const [caption,setCaption]=useState('');
 const [pending,setPending]=useState(false);const [error,setError]=useState('');
 const [uncertain,setUncertain]=useState(false);
 const gate=useRef(createActionGate());
 useEffect(()=>{const g=gate.current;return ()=>g.cancel();},[]);
 useEffect(()=>{
  if(!file)return;
  const url=URL.createObjectURL(file);setPreview(url);
  return ()=>{URL.revokeObjectURL(url);};
 },[file]);
 const supported=capabilities?.purposes.includes(purpose)===true;
 const send=async()=>{
  if(!file||!consent||!supported||disabled||uncertain)return;
  const action=gate.current.begin();if(!action)return;setPending(true);setError('');
  try{
   const next=await upload(file,purpose);
   if(action.current()){setAsset(next);setFile(null);setPreview('');}
  }catch(cause){if(action.current()){const e=cause instanceof OwnerClientError?cause:new OwnerClientError(503,'operation_uncertain',true);setError(ownerErrorText(e));if(uploadOutcomeUncertain(e))setUncertain(true);}}
  finally{if(action.current())setPending(false);action.finish();}
 };
 const attach=async()=>{
  if(!asset||disabled)return;const action=gate.current.begin();if(!action)return;setPending(true);
  try{const success=await assign(asset,caption);if(action.current()&&success){setAsset(null);setCaption('');}}
  finally{if(action.current())setPending(false);action.finish();}
 };
 return <section className="space-y-4 rounded-3xl border border-line bg-elev p-4 sm:p-6" aria-busy={pending}>
  <h3 className="font-bold">{purpose==='public-avatar'?'بارگذاری تصویر آواتار':'بارگذاری تصویر نمونه کار'}</h3>
  <ol aria-label="مراحل افزودن تصویر" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted"><li>انتخاب تصویر</li><li>بارگذاری فایل</li><li>اتصال به پروفایل</li></ol>
  <p role="status" className="rounded-2xl border border-line bg-card px-4 py-3 text-sm leading-7">{uploadPresentation({selected:Boolean(file),uploaded:Boolean(asset),pending,uncertain})}</p>
  <p id={`${id}-disclosure`} className="text-sm leading-8 text-fg-soft">نشانی فایل بارگذاری‌شده عمومی است، حتی اگر پروفایل پیش‌نویس یا در انتظار بررسی باشد. تصویر مدارک هویتی یا فایل خصوصی نفرستید. بارگذاری به‌تنهایی تصویر را به حساب یا گالری وصل نمی‌کند و پروفایل را منتشر نمی‌کند.</p>
  <p className="text-xs leading-7 text-muted">ویدیو پشتیبانی نمی‌شود. پذیرش WebP به کُدک واقعی سرور وابسته است و ممکن است با خطای پردازش رد شود.</p>
  {!supported?<p role="status" className="text-sm text-muted">قابلیت بارگذاری در دسترس نیست.</p>:<>
   <p className="text-xs leading-7 text-muted">حداکثر حجم: {capabilities.maxBytes.toLocaleString('fa-IR')} بایت؛ ضلع: {capabilities.maxDimension.toLocaleString('fa-IR')} پیکسل؛ مجموع: {capabilities.maxPixels.toLocaleString('fa-IR')} پیکسل. هر بار یک تصویر.</p>
   <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-2xl border border-line bg-card p-4 text-sm leading-7 focus-within:ring-2 focus-within:ring-accent hover:border-accent/50"><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} disabled={pending||disabled} className="mt-1 h-5 w-5 shrink-0 accent-accent" />عمومی بودن فایل را می‌دانم و تصویر خصوصی بارگذاری نمی‌کنم.</label>
   <label htmlFor={`${id}-file`} className="block text-sm text-fg-soft">انتخاب تصویر</label><input id={`${id}-file`} type="file" accept={capabilities.imageMimes.join(',')} aria-describedby={`${id}-disclosure`} disabled={!consent||pending||disabled||Boolean(asset)||uncertain} onChange={event=>{const selected=event.target.files?.[0];setError('');if(!selected){setFile(null);setPreview('');return;}if(!capabilities.imageMimes.includes(selected.type as never)||selected.size<1||selected.size>capabilities.maxBytes){setError('نوع یا حجم فایل مطابق قابلیت اعلام‌شده نیست.');setFile(null);setPreview('');event.target.value='';return;}setFile(selected);}} className="w-full min-w-0 rounded-2xl border border-line bg-card p-3 text-sm text-fg transition-opacity duration-200 hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 file:me-3 file:rounded-xl file:border-0 file:bg-accent file:p-2 file:text-accent-fg" />
   {preview&&file&&<img src={preview} alt="پیش‌نمایش تصویر انتخاب‌شده؛ هنوز بارگذاری نشده" className="h-36 w-36 rounded-2xl object-cover" />}
   <Button type="button" onClick={()=>void send()} disabled={!file||!consent||pending||disabled||Boolean(asset)||uncertain}>{pending?'در حال انجام؛ لطفاً صبر کنید':'فقط بارگذاری تصویر'}</Button>
  </>}
  {asset&&<div className="space-y-3 rounded-2xl border border-accent/40 p-4"><img src={asset.url} alt="تصویر بارگذاری‌شده برای اتصال" className="h-28 w-28 rounded-xl object-cover" /><p role="status" className="text-sm leading-7">فایل شماره {asset.id.toLocaleString('fa-IR')} بارگذاری شده است. بارگذاری به‌تنهایی اتصال نیست؛ نتیجه اتصال را در وضعیت تازه بررسی کنید. اگر اتصال خطا داد، فقط اتصال را دوباره انتخاب کنید؛ فایل را دوباره بارگذاری نکنید.</p><a href={asset.url} target="_blank" rel="noopener noreferrer" className={`${workspaceLink} break-all text-accent underline`}>مشاهده فایل عمومی بارگذاری‌شده</a>{purpose==='public-portfolio'&&<label htmlFor={`${id}-caption`} className="block text-sm">توضیح تصویر؛ حداکثر ۳۰۰ نویسه<input id={`${id}-caption`} value={caption} maxLength={300} onChange={event=>setCaption(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-line bg-card p-3 hover:border-accent/50 focus-visible:outline-2 focus-visible:outline-accent" /></label>}<Button type="button" disabled={pending||disabled} onClick={()=>void attach()}>{purpose==='public-avatar'?'استفاده به عنوان آواتار':'افزودن به گالری'}</Button></div>}
  {uncertain&&<p role="alert" className="text-sm leading-7 text-alert">نتیجه بارگذاری قطعی نیست. برای جلوگیری از فایل تکراری دوباره بارگذاری نکنید؛ وضعیت را بررسی و صفحه را صریحاً بارگذاری کنید.</p>}
  {error&&<p role="alert" className="text-sm leading-7 text-alert">{error}</p>}
 </section>;
}
