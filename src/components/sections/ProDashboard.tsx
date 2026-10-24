import Link from 'next/link';
import {ArrowLeft,UserRound,FilePenLine} from 'lucide-react';
import {WorkspaceHeader,WorkspacePanel,workspaceClass,workspaceLink,primaryWorkspaceLink} from './owner/AccountWorkspace';

export function ProDashboard({displayName}:{displayName:string}) {
 return <section className={workspaceClass} dir="rtl">
  <WorkspaceHeader role="specialist" current="/pro" title="داشبورد متخصص" description={`${displayName}، معرفی حرفه‌ای، خدمات و نمونه‌کارهایتان را در پروفایل مدیریت کنید.`} />
  <WorkspacePanel title="معرفی حرفه‌ای شما در کاربان" description="اطلاعات حرفه‌ای را تکمیل و ذخیره کنید. ارسال نسخه ذخیره‌شده برای بررسی، مرحله‌ای جدا از ذخیره است و به معنی انتشار نیست.">
   <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center"><Link href="/pro/profile" className={primaryWorkspaceLink}><FilePenLine size={18} aria-hidden="true" />تکمیل پروفایل حرفه‌ای<ArrowLeft size={18} aria-hidden="true" /></Link><Link href="/account" className={workspaceLink}><UserRound size={18} aria-hidden="true" />حساب شخصی</Link></div>
  </WorkspacePanel>
  <WorkspacePanel title="کیف پول آزمایشی محلی" description="موجودی و وضعیت شارژ را در صفحه کیف پول بررسی کنید. این اعتبار آزمایشی، پول واقعی یا اعتبار خرید سرنخ نیست."><Link href="/wallet" className={workspaceLink}>بررسی کیف پول آزمایشی</Link></WorkspacePanel>
  <section className="space-y-2 rounded-3xl bg-elev p-5 sm:p-7"><h2 className="font-bold text-fg-soft">فرصت‌های کاری</h2><p className="max-w-2xl text-sm leading-8 text-muted">این بخش هنوز به سرویس واقعی متصل نیست. فرصت کاری یا خرید سرنخ برای نمایش در دسترس نیست.</p></section>
 </section>;
}
