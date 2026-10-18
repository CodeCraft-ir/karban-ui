import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { PublicDataError } from "@/components/sections/PublicDataState";
import { SpecialistList } from "@/components/sections/SpecialistList";
import type { PublicSpecialistCatalog, PublicSpecialistSearchInput, PublicTerm } from "@/lib/contracts/specialists";
import { buildSpecialistPaginationQuery, parseSpecialistSearchParams } from "@/lib/specialist-search";
import { faNum } from "@/lib/utils";
import { loadPublicSpecialists } from "@/services/wordpress/public-specialists";
import { loadPublicTerms } from "@/services/wordpress/taxonomies";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "جستجوی متخصص ساختمان",
  description: "فهرست عمومی متخصصان ساختمان را بر اساس عبارت جستجو، دسته‌بندی، شهر و نشان تأیید فیلتر کنید.",
  alternates: { canonical: "/search" },
};

type SearchPageProps = { searchParams: Promise<PublicSpecialistSearchInput> };
type SearchData = { catalog: PublicSpecialistCatalog; categories: PublicTerm[]; cities: PublicTerm[] };

async function loadSearchData(input: PublicSpecialistSearchInput): Promise<SearchData | null> {
  try {
    const [catalog, categories, cities] = await Promise.all([
      loadPublicSpecialists(input),
      loadPublicTerms("job_category"),
      loadPublicTerms("city"),
    ]);
    return { catalog, categories, cities };
  } catch {
    return null;
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const rawParams = await searchParams;
  const params = parseSpecialistSearchParams(rawParams);
  const data = await loadSearchData(rawParams);
  if (!data) return <PublicDataError title="نتیجه‌های جستجو بارگذاری نشد" description="اطلاعات عمومی متخصصان در دسترس نیست. دوباره تلاش کنید." />;

  const { catalog, categories, cities } = data;
  const pages = Array.from({ length: catalog.pages }, (_, index) => index + 1);
  return (
    <div className="mx-auto max-w-5xl">
      <div className="px-4 pt-6 sm:px-6">
        <h1 className="text-2xl font-bold">جستجوی متخصص</h1>
        <p className="mt-1.5 text-sm text-muted">{faNum(catalog.total)} متخصص در فهرست عمومی پیدا شد</p>
        <form method="get" className="mt-5 rounded-3xl border border-line bg-card p-4" aria-label="فیلتر متخصصان">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium text-fg">عبارت جستجو<input name="q" defaultValue={params.q} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-elev px-3 text-fg outline-none transition-colors duration-200 focus:border-primary focus:ring-2 focus:ring-primary/30" placeholder="نام یا تخصص" /></label>
            <label className="text-sm font-medium text-fg">دسته‌بندی<select name="category" defaultValue={params.category} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-elev px-3 text-fg outline-none transition-colors duration-200 focus:border-primary focus:ring-2 focus:ring-primary/30"><option value="">همهٔ دسته‌ها</option>{categories.map((term) => <option key={term.id} value={term.slug}>{term.name}</option>)}</select></label>
            <label className="text-sm font-medium text-fg">شهر<select name="city" defaultValue={params.city} className="mt-1.5 h-11 w-full rounded-xl border border-line bg-elev px-3 text-fg outline-none transition-colors duration-200 focus:border-primary focus:ring-2 focus:ring-primary/30"><option value="">همهٔ شهرها</option>{cities.map((term) => <option key={term.id} value={term.slug}>{term.name}</option>)}</select></label>
            <div className="flex flex-col justify-end gap-3"><label className="inline-flex items-center gap-2 text-sm text-fg"><input name="verified" value="1" type="checkbox" defaultChecked={params.verified} className="h-4 w-4 rounded border-line accent-primary" />فقط دارای نشان تأیید</label><button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-fg transition-colors duration-200 hover:bg-primary-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><SlidersHorizontal className="h-4 w-4" />اعمال فیلتر</button></div>
          </div>
        </form>
      </div>
      <SpecialistList specialists={catalog.items} title="نتیجه‌های جستجو" description={catalog.total === 0 ? "" : `صفحهٔ ${faNum(catalog.page)} از ${faNum(catalog.pages)}`} />
      {pages.length > 1 && <nav className="mb-10 flex flex-wrap justify-center gap-2 px-4" aria-label="صفحه‌بندی نتایج">{pages.map((page) => <Link key={page} href={`/search?${buildSpecialistPaginationQuery(params, page)}`} aria-current={page === catalog.page ? "page" : undefined} className={`flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${page === catalog.page ? "border-primary bg-primary text-primary-fg" : "border-line bg-card text-fg hover:border-primary/50"}`}>{faNum(page)}</Link>)}</nav>}
    </div>
  );
}
