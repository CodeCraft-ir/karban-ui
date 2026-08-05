"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Rating } from "@/components/ui/Rating";
import { SpecialistCardSkeleton } from "@/components/ui/Skeleton";
import { TapCard } from "@/components/motion/TapCard";
import { Reveal } from "@/components/motion/Reveal";
import type { Specialist } from "@/lib/data";
import { faNum } from "@/lib/utils";

export function SpecialistCard({ specialist }: { specialist: Specialist }) {
  const s = specialist;
  return (
    <TapCard>
      <article className="group rounded-3xl border border-ink-700/40 bg-ink-900/70 p-4 transition-colors duration-300 hover:border-brand-500/35">
        <div className="flex items-start gap-3.5">
          <div className="relative">
            <Avatar name={s.name} hue={s.hue} className="h-16 w-16 rounded-2xl text-xl" />
            {s.available && (
              <span
                className="absolute -bottom-0.5 -left-0.5 h-3.5 w-3.5 rounded-full border-2 border-ink-900 bg-success"
                title="آماده کار"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate font-bold text-slate-50">{s.name}</h3>
              {s.verified && <VerifiedBadge />}
            </div>
            <p className="mt-0.5 truncate text-sm text-slate-400">{s.title}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <Rating value={s.rating} count={s.reviewsCount} />
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-brand-500/70" />
                {s.neighborhood} · {faNum(s.distanceKm)} کیلومتر
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="brand">{s.category}</Badge>
          <Badge tone="neutral">{faNum(s.experienceYears)} سال سابقه</Badge>
          {s.available ? (
            <Badge tone="success">آماده کار</Badge>
          ) : (
            <Badge tone="warn">مشغول</Badge>
          )}
        </div>

        <div className="mt-4 flex gap-2.5">
          <Link
            href={`/specialists/${s.slug}`}
            className="flex h-9 flex-1 items-center justify-center rounded-xl border border-ink-700/60 bg-ink-800 text-sm text-slate-100 hover:bg-ink-700 active:scale-95"
          >
            مشاهده پروفایل
          </Link>
          <Button size="sm" className="gap-1.5 px-5">
            <Phone className="h-4 w-4" />
            تماس سریع
          </Button>
        </div>
      </article>
    </TapCard>
  );
}

/**
 * Specialist list — shows skeletons for a beat (simulated fetch),
 * then reveals cards with a scroll-triggered stagger.
 */
export function SpecialistList({ specialists }: { specialists: Specialist[] }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <section className="px-4 py-10 sm:px-6" aria-labelledby="specs-title">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <h2 id="specs-title" className="text-xl font-bold sm:text-2xl">
              متخصصان برتر اطراف تو
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              بر اساس امتیاز و فاصله مرتب شده
            </p>
          </div>
          <Link href="/search" className="text-sm text-brand-400 hover:text-brand-300">
            مشاهده همه
          </Link>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SpecialistCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <Reveal stagger={0.09} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {specialists.map((s) => (
              <SpecialistCard key={s.id} specialist={s} />
            ))}
          </Reveal>
        )}
      </div>
    </section>
  );
}
