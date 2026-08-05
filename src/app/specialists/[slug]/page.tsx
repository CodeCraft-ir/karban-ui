import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SpecialistProfile } from "@/components/sections/SpecialistProfile";
import { SPECIALISTS, getSpecialist } from "@/lib/data";

export function generateStaticParams() {
  return SPECIALISTS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/specialists/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const specialist = getSpecialist(slug);
  return { title: specialist ? `${specialist.name} — ${specialist.title}` : "متخصص" };
}

export default async function SpecialistPage({
  params,
}: PageProps<"/specialists/[slug]">) {
  const { slug } = await params;
  const specialist = getSpecialist(slug);
  if (!specialist) notFound();

  return <SpecialistProfile specialist={specialist} />;
}
