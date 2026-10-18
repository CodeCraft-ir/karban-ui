"use client";

import Link from "next/link";
import {
  Flame,
  Grid3x3,
  Hammer,
  House,
  Layers,
  Mountain,
  Paintbrush,
  Thermometer,
  Trees,
  Umbrella,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { TapCard } from "@/components/motion/TapCard";
import { Reveal } from "@/components/motion/Reveal";
import type { PublicTerm } from "@/lib/contracts/specialists";

const ICONS: readonly LucideIcon[] = [Zap, Wrench, Paintbrush, Grid3x3, Hammer, Thermometer, Flame, Layers, Mountain, House, Umbrella, Trees];

/** Category links use the supplied public taxonomy slugs, never local fixtures. */
export function CategoryGrid({ categories }: { categories: PublicTerm[] }) {
  return (
    <section className="px-4 py-10 sm:px-6" aria-labelledby="cats-title">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <h2 id="cats-title" className="text-xl font-bold sm:text-2xl">دسته‌بندی خدمات</h2>
            <p className="mt-1.5 text-sm text-muted">جستجو را با دسته‌بندی مورد نیازت شروع کن</p>
          </div>
          <Link href="/search" className="text-sm text-primary hover:text-accent">مشاهده همه</Link>
        </div>
        {categories.length === 0 ? (
          <p className="rounded-3xl border border-dashed border-line bg-card p-6 text-sm text-muted">دسته‌بندی منتشرشده‌ای برای نمایش وجود ندارد.</p>
        ) : (
          <Reveal stagger={0.06} className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3.5 lg:grid-cols-6">
            {categories.map((category, index) => {
              const Icon = ICONS[index % ICONS.length] ?? Hammer;
              return (
                <TapCard key={category.id}>
                  <Link href={`/search?category=${encodeURIComponent(category.slug)}`} className="group flex flex-col items-center gap-2.5 rounded-3xl border border-line bg-card px-2 py-5 text-center transition-colors duration-300 hover:border-primary/40 hover:bg-elev-2/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-all duration-300 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-fg group-hover:shadow-[0_8px_20px_-6px_var(--glow)]"><Icon className="h-5.5 w-5.5" /></span>
                    <span className="text-[13px] font-medium text-fg-soft">{category.name}</span>
                  </Link>
                </TapCard>
              );
            })}
          </Reveal>
        )}
      </div>
    </section>
  );
}
