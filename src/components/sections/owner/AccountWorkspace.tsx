import type {ReactNode} from 'react';
import Link from 'next/link';
import {accountLinks,type OwnerTarget} from '@/lib/owner-ui';
import type {RegistrationRole} from '@/lib/contracts/auth';
import type {ProfileDto,ProfileStatus} from '@/services/profile/profile-contracts';
import {Button} from '@/components/ui/Button';
import {Check,Minus,ImageIcon} from 'lucide-react';

const statusLabel={draft:'پیش‌نویس',pending:'در انتظار بررسی',publish:'منتشرشده'};
/** Facts from the last authoritative ProfileDto, never unsaved form values or a score. */
export function savedProfileChecklist(profile:ProfileDto) {
 return [{label:'عنوان حرفه‌ای',complete:profile.title.trim().length>0},{label:'دسته خدمت',complete:profile.categories.length>0},{label:'شهر خدمت',complete:profile.cities.length>0}];
}
export function reviewPresentation(status:ProfileStatus,disabled:boolean) {
 return {disabled:disabled||status==='pending',label:status==='pending'?'در انتظار بررسی':'ارسال برای بررسی'};
}
export function uploadPresentation({selected,uploaded,pending,uncertain}:{selected:boolean;uploaded:boolean;pending:boolean;uncertain:boolean}) {
 if(uncertain)return 'نتیجه بارگذاری قطعی نیست؛ پیش از اقدام دوباره وضعیت را بررسی کنید.';
 if(pending)return 'عملیات در حال انجام است؛ لطفاً صبر کنید.';
 if(uploaded)return 'فایل بارگذاری شده؛ هنوز متصل نشده است.';
 if(selected)return 'تصویر انتخاب شده؛ هنوز بارگذاری نشده است.';
 return 'هنوز تصویری انتخاب نشده است.';
}

// Account-scoped interaction treatment; shared primitives and recovery links stay unchanged.
export const workspaceClass='mx-auto max-w-5xl space-y-7 px-4 py-8 text-start sm:px-6 sm:py-10 [&_button]:max-w-full [&_button]:whitespace-normal [&_button]:h-auto [&_button]:min-h-11 [&_button]:py-2 [&_button]:transition-[transform,opacity] [&_button]:duration-200 [&_button]:ease-[cubic-bezier(0.2,0,0,1)] [&_button:active]:scale-[0.98] motion-reduce:[&_button:active]:scale-100';
export const workspaceLink='inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-line px-4 py-2 text-sm text-fg-soft hover:bg-wash hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent active:scale-[0.98] motion-reduce:active:scale-100';
export const primaryWorkspaceLink=`${workspaceLink} border-transparent bg-primary font-bold text-primary-fg hover:bg-primary-hover hover:text-primary-fg`;

export function WorkspaceHeader({role,current,title,description}:{role:RegistrationRole;current:OwnerTarget;title:string;description:string}) {
 return <header className="space-y-5 border-b border-line pb-6">
  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"><span className="rounded-xl bg-elev px-3 py-2 font-medium text-fg-soft">فضای کار {role==='specialist'?'متخصص':'کارفرما'}</span><span className="text-muted">حساب کاربان</span></div>
  <div><h1 className="break-words text-[clamp(1.5rem,3vw,2rem)] leading-relaxed font-bold">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-8 text-muted">{description}</p></div>
  <nav aria-label="بخش‌های حساب" className="flex flex-wrap gap-2">{accountLinks(role).map(link=><Link key={link.href} href={link.href} aria-current={current===link.href?'page':undefined} className={`${workspaceLink} ${current===link.href?'border-accent/40 bg-accent/10 font-bold text-accent':''}`}>{link.label}</Link>)}</nav>
 </header>;
}
export function WorkspacePanel({title,description,children}:{title:string;description?:string;children?:ReactNode}) {
 return <section className="space-y-4 rounded-3xl border border-line bg-card p-5 sm:p-7"><div><h2 className="text-lg font-bold">{title}</h2>{description&&<p className="mt-2 max-w-2xl text-sm leading-8 text-muted">{description}</p>}</div>{children}</section>;
}

export function SavedProfileSummary({profile}:{profile:ProfileDto}) {
 return <WorkspacePanel title="اطلاعات ذخیره‌شده" description="این خلاصه از آخرین پاسخ سرور است؛ تغییرات ذخیره‌نشده فرم در آن محاسبه نمی‌شود.">
  <div className="flex items-start gap-4">
   {/* eslint-disable-next-line @next/next/no-img-element -- Normalized public WordPress avatar. */}
   {profile.avatar?<img src={profile.avatar.url} alt="آواتار حرفه‌ای ذخیره‌شده" className="h-16 w-16 shrink-0 rounded-2xl object-cover sm:h-20 sm:w-20" />:<span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-elev text-muted sm:h-20 sm:w-20"><ImageIcon size={26} aria-hidden="true" /><span className="sr-only">آواتاری ثبت نشده است.</span></span>}
   <div className="min-w-0 space-y-2"><h3 className="break-words text-lg font-bold">{profile.title||'عنوان حرفه‌ای ثبت نشده است'}</h3><p className="inline-flex rounded-xl border border-line bg-elev px-3 py-1 text-sm font-medium">وضعیت: {statusLabel[profile.status]}</p><p className="text-sm leading-7 text-muted">تایید هویت: {profile.verified===undefined?'اطلاعات قابل نمایش نیست':profile.verified?'تاییدشده؛ فقط خواندنی':'تایید نشده؛ فقط خواندنی'}</p></div>
  </div>
  <div className="space-y-4 border-t border-line pt-4"><h3 className="text-sm font-bold">موارد لازم برای درخواست بررسی</h3><ul className="grid gap-3 sm:grid-cols-3">{savedProfileChecklist(profile).map(item=><li key={item.label} className="flex items-center gap-2 text-sm">{item.complete?<Check size={18} className="shrink-0 text-accent" aria-hidden="true" />:<Minus size={18} className="shrink-0 text-muted" aria-hidden="true" />}<span>{item.label}<span className="mt-1 block text-xs text-muted">{item.complete?'ذخیره شده':'ثبت نشده'}</span></span></li>)}</ul><p className="text-sm leading-7 text-muted">تصاویر اختیاری: آواتار {profile.avatar?'ثبت شده':'ثبت نشده'}؛ نمونه کار {profile.gallery.length>0?'ثبت شده':'ثبت نشده'}. این موارد نشان تایید یا تضمین انتشار نیستند.</p></div>
  <div className="space-y-2 border-t border-line pt-4"><Link href={`/specialists/${encodeURIComponent(profile.slug)}`} className={workspaceLink}>نشانی عمومی ثابت پروفایل</Link><p className="text-xs leading-7 text-muted">نشانی تا زمان انتشار ممکن است عمومی قابل مشاهده نباشد.</p></div>
 </WorkspacePanel>;
}
export function ProfileReviewPanel({status,disabled,onSubmit}:{status:ProfileStatus;disabled:boolean;onSubmit:()=>void}) {
 const action=reviewPresentation(status,disabled);
 return <WorkspacePanel title="ارسال نسخه ذخیره‌شده برای بررسی" description="ابتدا تغییرات فرم را ذخیره کنید؛ این دکمه فقط نسخه ذخیره‌شده را می‌فرستد. ذخیره، انتشار نیست. تغییر پروفایل منتشرشده ممکن است آن را به انتظار بررسی برگرداند. ارسال برای بررسی نیز به معنی انتشار یا تایید نیست.">
  {status==='pending'&&<p className="text-sm leading-7 text-muted">پروفایل در انتظار بررسی است؛ ارسال دوباره در این وضعیت غیرفعال است.</p>}
  <Button type="button" variant="outline" disabled={action.disabled} onClick={onSubmit}>{action.label}</Button>
 </WorkspacePanel>;
}
