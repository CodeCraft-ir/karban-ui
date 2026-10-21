import Link from 'next/link';

export function ProDashboard({displayName}:{displayName:string}) {
 return <section className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
  <header><h1 className="text-2xl font-bold">داشبورد متخصص</h1><p className="mt-2 leading-7 text-muted">{displayName}، اطلاعات حرفه‌ای خود را تکمیل کنید و برای بررسی بفرستید.</p></header>
  <nav aria-label="حساب متخصص" className="flex flex-wrap gap-3"><Link href="/pro/profile" className="owner-link">ویرایش پروفایل حرفه‌ای</Link><Link href="/account" className="owner-link">حساب شخصی</Link></nav>
  <section className="rounded-3xl border border-line bg-card p-6"><h2 className="font-bold">فرصت‌های کاری و خدمات مالی</h2><p className="mt-3 leading-8 text-muted">این بخش هنوز به سرویس واقعی متصل نیست. فرصت کاری، اعتبار خرید یا پرداختی برای نمایش در دسترس نیست.</p></section>
 </section>;
}
