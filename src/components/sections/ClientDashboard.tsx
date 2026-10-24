import Link from 'next/link';
import {ArrowLeft,Search,UserRound} from 'lucide-react';
import {WorkspaceHeader,WorkspacePanel,workspaceClass,workspaceLink,primaryWorkspaceLink} from './owner/AccountWorkspace';

export function ClientDashboard({displayName}:{displayName:string}) {
 return <section className={workspaceClass} dir="rtl">
  <WorkspaceHeader role="client" current="/dashboard" title={`سلام، ${displayName}`} description="متخصص مناسب کارتان را پیدا کنید یا اطلاعات حساب شخصی را به‌روز نگه دارید." />
  <WorkspacePanel title="از انتخاب متخصص شروع کنید" description="تخصص و شهر مورد نیازتان را در جستجو انتخاب کنید و پروفایل متخصصان را ببینید.">
   <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center"><Link href="/search" className={primaryWorkspaceLink}><Search size={18} aria-hidden="true" />جستجوی متخصصان<ArrowLeft size={18} aria-hidden="true" /></Link><Link href="/account" className={workspaceLink}><UserRound size={18} aria-hidden="true" />ویرایش حساب شخصی</Link></div>
  </WorkspacePanel>
  <WorkspacePanel title="کیف پول آزمایشی محلی" description="موجودی و وضعیت شارژ را در صفحه کیف پول بررسی کنید. پرداخت بانکی یا پول واقعی در این بخش وجود ندارد."><Link href="/wallet" className={workspaceLink}>بررسی کیف پول آزمایشی</Link></WorkspacePanel>
  <section className="space-y-2 rounded-3xl bg-elev p-5 sm:p-7"><h2 className="font-bold text-fg-soft">پروژه‌ها و پیشنهادها</h2><p className="max-w-2xl text-sm leading-8 text-muted">این بخش هنوز به سرویس واقعی متصل نیست. پروژه یا پیشنهادی برای نمایش در دسترس نیست.</p></section>
 </section>;
}
