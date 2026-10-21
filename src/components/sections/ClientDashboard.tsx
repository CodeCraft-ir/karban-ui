import Link from 'next/link';

export function ClientDashboard({displayName}:{displayName:string}) {
 return <section className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
  <header><h1 className="text-2xl font-bold">سلام، {displayName}</h1><p className="mt-2 leading-7 text-muted">اطلاعات حساب شخصی و متخصصان را از اینجا پیدا کنید.</p></header>
  <nav aria-label="حساب کارفرما" className="flex flex-wrap gap-3"><Link href="/account" className="owner-link">ویرایش حساب شخصی</Link><Link href="/search" className="owner-link">جستجوی متخصصان</Link></nav>
  <section className="rounded-3xl border border-line bg-card p-6"><h2 className="font-bold">پروژه‌ها و خدمات مالی</h2><p className="mt-3 leading-8 text-muted">این بخش هنوز به سرویس واقعی متصل نیست. پروژه، پیشنهاد یا اطلاعات مالی برای نمایش در دسترس نیست.</p></section>
 </section>;
}
