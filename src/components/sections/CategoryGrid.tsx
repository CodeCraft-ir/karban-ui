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
import { CATEGORIES } from "@/lib/data";
import { faNum } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  zap: Zap,
  wrench: Wrench,
  paintbrush: Paintbrush,
  grid: Grid3x3,
  hammer: Hammer,
  thermometer: Thermometer,
  flame: Flame,
  layers: Layers,
  mountain: Mountain,
  house: House,
  umbrella: Umbrella,
  trees: Trees,
};

/** Category grid with staggered GSAP reveal on scroll into view. */
export function CategoryGrid() {
  return (
    <section className="px-4 py-10 sm:px-6" aria-labelledby="cats-title">
      <div className="mx-auto max-w-5xl">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <h2 id="cats-title" className="text-xl font-bold sm:text-2xl">
              دسته‌بندی خدمات
            </h2>
            <p className="mt-1.5 text-sm text-slate-400">
              هر تخصصی که نیاز داری، اینجاست
            </p>
          </div>
          <Link
            href="/search"
            className="text-sm text-brand-400 hover:text-brand-300"
          >
            مشاهده همه
          </Link>
        </div>

        <Reveal
          stagger={0.06}
          className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3.5 lg:grid-cols-6"
        >
          {CATEGORIES.map((cat) => {
            const Icon = ICONS[cat.icon] ?? Hammer;
            return (
              <TapCard key={cat.id}>
                <Link
                  href="/search"
                  className="group flex flex-col items-center gap-2.5 rounded-3xl border border-ink-700/40 bg-ink-900/60 px-2 py-5 text-center transition-colors duration-300 hover:border-brand-500/40 hover:bg-ink-800/80"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400 transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-ink-900 group-hover:shadow-[0_8px_20px_-6px_rgb(245_184_0/0.5)]">
                    <Icon className="h-5.5 w-5.5" />
                  </span>
                  <span className="text-[13px] font-medium text-slate-200">
                    {cat.title}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {faNum(cat.jobs)} متخصص
                  </span>
                </Link>
              </TapCard>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
