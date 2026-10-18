import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SpecialistProfile } from "@/components/sections/SpecialistProfile";
import { PublicDataError } from "@/components/sections/PublicDataState";
import type { PublicSpecialistDetail } from "@/lib/contracts/specialists";
import { loadCachedPublicSpecialistDetail } from "@/lib/public-specialist-detail";
import { breadcrumbJsonLd, serializeJsonLd, specialistJsonLd } from "@/lib/seo";
import { isPublicSpecialistNotFound } from "@/services/wordpress/public-specialists";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type DetailResult =
  | { specialist: PublicSpecialistDetail; error: null }
  | { specialist: null; error: unknown };

async function loadDetail(slug: string): Promise<DetailResult> {
  try {
    return { specialist: await loadCachedPublicSpecialistDetail(slug), error: null };
  } catch (error) {
    return { specialist: null, error };
  }
}

export async function generateMetadata({ params }: PageProps<"/specialists/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadDetail(slug);
  if (!result.specialist) {
    return isPublicSpecialistNotFound(result.error)
      ? { title: "متخصص پیدا نشد", robots: { index: false, follow: false } }
      : { title: "پروفایل متخصص" };
  }

  const { specialist } = result;
  const location = specialist.cities[0] ? ` در ${specialist.cities[0]}` : "";
  const description = specialist.description ?? specialist.bio ?? `پروفایل عمومی ${specialist.title}${location} در کاربان.`;
  const title = `${specialist.title}${location}`;
  return { title, description, alternates: { canonical: `/specialists/${encodeURIComponent(specialist.slug)}` }, openGraph: { title, description, type: "profile" } };
}

export default async function SpecialistPage({ params }: PageProps<"/specialists/[slug]">) {
  const { slug } = await params;
  const result = await loadDetail(slug);
  if (!result.specialist) {
    if (isPublicSpecialistNotFound(result.error)) notFound();
    return <PublicDataError title="پروفایل متخصص بارگذاری نشد" description="اطلاعات عمومی این پروفایل در دسترس نیست. دوباره تلاش کنید." />;
  }

  const { specialist } = result;
  const path = `/specialists/${encodeURIComponent(specialist.slug)}`;
  const breadcrumbs = breadcrumbJsonLd([
    { name: "کاربان", path: "/" },
    { name: "متخصصان", path: "/search" },
    { name: specialist.title, path },
  ]);
  return (
    <>
      <script type="application/ld+json">{serializeJsonLd(specialistJsonLd(specialist))}</script>
      <script type="application/ld+json">{serializeJsonLd(breadcrumbs)}</script>
      <SpecialistProfile specialist={specialist} />
    </>
  );
}
