import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SpecialistProfile } from "@/components/sections/SpecialistProfile";
import { SPECIALISTS, getSpecialist } from "@/lib/data";
import { breadcrumbJsonLd, specialistJsonLd } from "@/lib/seo";
import { faNum } from "@/lib/utils";

export function generateStaticParams() {
  return SPECIALISTS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/specialists/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = getSpecialist(slug);
  if (!s) return { title: "متخصص" };
  const title = `${s.name} — ${s.title} در ${s.city}`;
  const description = `${s.name}، ${s.title} با ${faNum(s.experienceYears)} سال سابقه و امتیاز ${faNum(s.rating)} از ${faNum(s.reviewsCount)} نظر در ${s.city}، ${s.neighborhood}. مشاهده نمونه‌کارها و درخواست مستقیم در کاربان.`;
  return {
    title,
    description,
    alternates: { canonical: `/specialists/${s.slug}` },
    openGraph: { title, description, type: "profile" },
  };
}

export default async function SpecialistPage({
  params,
}: PageProps<"/specialists/[slug]">) {
  const { slug } = await params;
  const specialist = getSpecialist(slug);
  if (!specialist) notFound();

  const breadcrumbs = breadcrumbJsonLd([
    { name: "کاربان", path: "/" },
    { name: "متخصصان", path: "/search" },
    { name: specialist.name, path: `/specialists/${specialist.slug}` },
  ]);

  return (
    <>
      {/* LocalBusiness + AggregateRating + BreadcrumbList */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(specialistJsonLd(specialist)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <SpecialistProfile specialist={specialist} />
    </>
  );
}
