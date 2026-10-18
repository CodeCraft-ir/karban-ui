"use client";

import Link from "next/link";
import { MapPin } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import { TapCard } from "@/components/motion/TapCard";
import { Reveal } from "@/components/motion/Reveal";
import { PublicDataEmpty } from "@/components/sections/PublicDataState";
import type { PublicSpecialistCard } from "@/lib/contracts/specialists";

function availabilityBadge(availability: PublicSpecialistCard["availability"]) {
  if (availability === "available") return <Badge tone="success">آمادهٔ کار</Badge>;
  if (availability === "busy") return <Badge tone="warn">مشغول</Badge>;
  if (availability === "away") return <Badge tone="neutral">فعلاً در دسترس نیست</Badge>;
  return null;
}

export function SpecialistCard({ specialist }: { specialist: PublicSpecialistCard }) {
  const places = specialist.cities.join("، ");

  return (
    <TapCard>
      <article className="group rounded-3xl border border-line bg-card p-4 transition-colors duration-300 hover:border-primary/35">
        <div className="flex items-start gap-3.5">
          <div className="relative">
            <Avatar name={specialist.title} src={specialist.avatarUrl} hue={specialist.id} className="h-16 w-16 rounded-2xl text-xl" />
            {specialist.availability === "available" && <span className="absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 rounded-full border-2 border-ink-900 bg-success" title="آمادهٔ کار" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-bold text-fg">{specialist.title}</h3>
              {specialist.verified && <VerifiedBadge />}
            </div>
            {specialist.categories.length > 0 && <p className="mt-0.5 truncate text-sm text-muted">{specialist.categories.join("، ")}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Rating value={specialist.rating?.average ?? null} count={specialist.rating?.count} />
              {places && <span className="inline-flex items-center gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5 text-primary/70" />{places}</span>}
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {specialist.categories.map((category) => <Badge key={category} tone="brand">{category}</Badge>)}
          {availabilityBadge(specialist.availability)}
        </div>
        <div className="mt-4 flex gap-2.5">
          <Link prefetch={false} href={`/specialists/${encodeURIComponent(specialist.slug)}`} className="flex h-9 flex-1 items-center justify-center rounded-xl border border-line bg-elev-2 text-sm text-fg transition-colors duration-200 hover:bg-elev-3 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">مشاهدهٔ پروفایل</Link>
        </div>
      </article>
    </TapCard>
  );
}

export function SpecialistList({
  specialists,
  title = "متخصصان منتشرشده",
  description,
  showMoreLink = false,
}: {
  specialists: PublicSpecialistCard[];
  title?: string;
  description?: string;
  showMoreLink?: boolean;
}) {
  return (
    <section className="px-4 py-10 sm:px-6" aria-labelledby="specs-title">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h2 id="specs-title" className="text-xl font-bold sm:text-2xl">{title}</h2>
            {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
          </div>
          {showMoreLink && <Link href="/search" className="text-sm text-primary hover:text-accent">مشاهده همه</Link>}
        </div>
        {specialists.length === 0 ? (
          <PublicDataEmpty title="متخصصی پیدا نشد" description="فیلترها را تغییر بده یا عبارت دیگری جستجو کن." />
        ) : (
          <Reveal stagger={0.09} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {specialists.map((specialist) => <SpecialistCard key={specialist.id} specialist={specialist} />)}
          </Reveal>
        )}
      </div>
    </section>
  );
}
