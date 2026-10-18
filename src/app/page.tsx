import Link from "next/link";
import { ArrowLeft, ListFilter, ShieldCheck } from "lucide-react";
import { Hero } from "@/components/sections/Hero";
import { CategoryGrid } from "@/components/sections/CategoryGrid";
import { PublicDataError } from "@/components/sections/PublicDataState";
import { SpecialistList } from "@/components/sections/SpecialistList";
import { Reveal } from "@/components/motion/Reveal";
import { LogoMark } from "@/components/brand/Logo";
import type { PublicSpecialistCatalog, PublicTerm } from "@/lib/contracts/specialists";
import { faNum } from "@/lib/utils";
import { loadPublicSpecialists } from "@/services/wordpress/public-specialists";
import { loadPublicTerms } from "@/services/wordpress/taxonomies";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type HomeData = { catalog: PublicSpecialistCatalog; categories: PublicTerm[]; cities: PublicTerm[] };

async function loadHomeData(): Promise<HomeData | null> {
  try {
    const [catalog, categories, cities] = await Promise.all([
      loadPublicSpecialists({ page: "1", per_page: "6" }),
      loadPublicTerms("job_category"),
      loadPublicTerms("city"),
    ]);
    return { catalog, categories, cities };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const data = await loadHomeData();
  if (!data) return <PublicDataError />;

  const { catalog, categories, cities } = data;
  return (
    <>
      <Hero cities={cities} />
      <CategoryGrid categories={categories} />
      <SpecialistList specialists={catalog.items} title="متخصصان منتشرشده" description={`${faNum(catalog.total)} متخصص در فهرست عمومی`} showMoreLink />
      <section className="px-4 py-10 sm:px-6" aria-labelledby="why-title">
        <div className="mx-auto max-w-5xl">
          <h2 id="why-title" className="mb-2 text-xl font-bold sm:text-2xl">جستجوی روشن و قابل‌بررسی</h2>
          <p className="mb-7 max-w-xl text-sm leading-relaxed text-muted">برای انتخاب آگاهانه، فقط اطلاعاتی را نمایش می‌دهیم که در پروفایل عمومی متخصص منتشر شده‌اند.</p>
          <Reveal stagger={0.12} className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: ListFilter, title: "فیلتر بر اساس دسته و شهر", text: "نتیجه‌ها با دسته‌بندی و شهر ثبت‌شده در فهرست عمومی محدود می‌شوند." },
              { icon: ShieldCheck, title: "نشان تأیید در صورت انتشار", text: "نشان تأیید فقط زمانی دیده می‌شود که در دادهٔ عمومی پروفایل ثبت شده باشد." },
            ].map(({ icon: Icon, title, text }) => <div key={title} className="rounded-3xl border border-line bg-card p-6"><span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent"><Icon className="h-6 w-6" /></span><h3 className="mb-2 font-bold text-fg">{title}</h3><p className="text-sm leading-relaxed text-muted">{text}</p></div>)}
          </Reveal>
        </div>
      </section>
      <section className="px-4 py-10 sm:px-6">
        <Reveal className="mx-auto max-w-5xl"><div className="relative overflow-hidden rounded-4xl border border-primary/25 bg-gradient-to-l from-primary/15 via-card to-card p-7 sm:p-10"><LogoMark className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 text-primary/8" /><div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-xl font-bold sm:text-2xl">دنبال تخصص مشخصی هستی؟</h2><p className="mt-2 max-w-md text-sm leading-relaxed text-muted">دسته‌بندی، شهر یا عبارت جستجو را انتخاب کن تا فهرست عمومی را دقیق‌تر ببینی.</p></div><Link href="/search" className="inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-7 font-medium text-primary-fg shadow-[0_10px_28px_-8px_var(--glow)] transition-colors duration-200 hover:bg-primary-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">جستجوی متخصص<ArrowLeft className="h-4.5 w-4.5" /></Link></div></div></Reveal>
      </section>
    </>
  );
}
