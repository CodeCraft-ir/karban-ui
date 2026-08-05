"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { MapPin, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CATEGORIES } from "@/lib/data";
import { faNum } from "@/lib/utils";

/**
 * Hero — headline words rise in sequence, the search card pops with a
 * spring, and the golden orb drifts on a slow parallax loop.
 */
export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [neighborhood, setNeighborhood] = useState("");

  useGSAP(
    () => {
      // wait for the splash only on the very first load of the session
      const splashPending = !sessionStorage.getItem("karban-splash-done");
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        delay: splashPending ? 2.2 : 0.15,
      });

      tl.fromTo(
        ".hero-line",
        { y: 60, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.12 },
      )
        .fromTo(
          ".hero-search",
          { y: 44, autoAlpha: 0, scale: 0.94 },
          { y: 0, autoAlpha: 1, scale: 1, duration: 0.8, ease: "back.out(1.4)" },
          "-=0.45",
        )
        .fromTo(
          ".hero-stat",
          { y: 20, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.08 },
          "-=0.35",
        );

      // ambient orb drift
      gsap.to(".hero-orb", {
        y: -34,
        x: 22,
        scale: 1.12,
        duration: 6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
      });
    },
    { scope: ref },
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push("/search");
  };

  return (
    <section
      ref={ref}
      className="relative overflow-hidden px-4 pb-14 pt-10 sm:px-6 sm:pt-16"
    >
      {/* ambient glow */}
      <div className="hero-orb pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-500/12 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-sky-500/8 blur-[90px]" />

      <div className="relative mx-auto max-w-3xl text-center">
        <div className="hero-line mb-5 inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-4 py-1.5 text-xs text-brand-400 opacity-0">
          <Sparkles className="h-3.5 w-3.5" />
          بیش از {faNum(2400)} استادکار تایید شده
        </div>

        <h1 className="text-[clamp(1.9rem,6vw,3.4rem)] font-bold leading-[1.35]">
          <span className="hero-line block opacity-0">استادکار مورد اعتمادت را</span>
          <span className="hero-line block opacity-0">
            در <span className="text-gold">چند دقیقه</span> پیدا کن
          </span>
        </h1>

        <p className="hero-line mx-auto mt-5 max-w-md text-[clamp(0.9rem,2.5vw,1.05rem)] leading-relaxed text-slate-400 opacity-0">
          از برق‌کاری تا بازسازی کامل؛ متخصصان تایید شده محله‌ات با نظرات واقعی
          کارفرمایان قبلی.
        </p>

        {/* Search card */}
        <form
          onSubmit={submit}
          className="hero-search glass mx-auto mt-9 flex max-w-xl flex-col gap-2.5 rounded-3xl p-3 opacity-0 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-brand-400" />
            <input
              list="categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="چه خدمتی نیاز داری؟ مثلا برق‌کاری"
              aria-label="دسته‌بندی خدمت"
              className="h-12 w-full rounded-2xl bg-ink-800/70 pr-11 pl-4 text-[15px] text-slate-100 placeholder:text-slate-500 focus:bg-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
            <datalist id="categories">
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.title} />
              ))}
            </datalist>
          </div>
          <div className="relative flex-1 sm:max-w-44">
            <MapPin className="pointer-events-none absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-brand-400" />
            <input
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              placeholder="محله"
              aria-label="محله"
              className="h-12 w-full rounded-2xl bg-ink-800/70 pr-11 pl-4 text-[15px] text-slate-100 placeholder:text-slate-500 focus:bg-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 shrink-0 sm:px-8">
            جستجو
          </Button>
        </form>

        {/* trust stats */}
        <div className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-400 sm:gap-10 sm:text-sm">
          {[
            ["+۲٬۴۰۰", "متخصص فعال"],
            ["+۱۸ هزار", "پروژه موفق"],
            ["۴.۸ از ۵", "رضایت کارفرما"],
          ].map(([num, label]) => (
            <div key={label} className="hero-stat opacity-0">
              <span className="block text-lg font-bold text-brand-400 sm:text-xl">
                {num}
              </span>
              {label}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
