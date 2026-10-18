"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { PublicTerm } from "@/lib/contracts/specialists";

export function Hero({ cities }: { cities: PublicTerm[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");

  useGSAP(
    () => {
      const splashPending = !sessionStorage.getItem("karban-splash-done");
      const timeline = gsap.timeline({ defaults: { ease: "power3.out" }, delay: splashPending ? 2.2 : 0.15 });
      timeline
        .fromTo(".hero-line", { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.12 })
        .fromTo(".hero-search", { y: 44, autoAlpha: 0, scale: 0.94 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.8, ease: "back.out(1.4)" }, "-=0.45");
      gsap.to(".hero-orb", { y: -34, x: 22, scale: 1.12, duration: 6, yoyo: true, repeat: -1, ease: "sine.inOut" });
    },
    { scope: ref },
  );

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (city) params.set("city", city);
    router.push(`/search${params.size ? `?${params}` : ""}`);
  }

  return (
    <section ref={ref} className="relative overflow-hidden px-4 pb-14 pt-10 sm:px-6 sm:pt-16">
      <div className="hero-orb pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/12 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-azure-600/10 blur-[90px]" />
      <div className="relative mx-auto max-w-3xl text-center">
        <p className="hero-line mb-5 text-sm font-medium text-accent opacity-0">فهرست عمومی متخصصان ساختمان</p>
        <h1 className="text-[clamp(1.9rem,6vw,3.4rem)] font-bold leading-[1.35]">
          <span className="hero-line block opacity-0">متخصص مورد نیازت را</span>
          <span className="hero-line block opacity-0">با دسته‌بندی و شهر پیدا کن</span>
        </h1>
        <p className="hero-line mx-auto mt-5 max-w-md text-[clamp(0.9rem,2.5vw,1.05rem)] leading-relaxed text-muted opacity-0">
          اطلاعات منتشرشدهٔ متخصصان را جستجو کن و پروفایل عمومی هرکدام را ببین.
        </p>
        <form onSubmit={submit} className="hero-search glass mx-auto mt-9 flex max-w-xl flex-col gap-2.5 rounded-3xl p-3 opacity-0 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-primary" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="جستجوی نام یا تخصص" aria-label="جستجو در متخصصان" className="h-12 w-full rounded-2xl bg-elev pr-11 pl-4 text-[15px] text-fg placeholder:text-faint focus:bg-elev-2 focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </div>
          <div className="relative flex-1 sm:max-w-44">
            <MapPin className="pointer-events-none absolute right-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-primary" />
            <select value={city} onChange={(event) => setCity(event.target.value)} aria-label="شهر" className="h-12 w-full appearance-none rounded-2xl bg-elev pr-11 pl-4 text-[15px] text-fg focus:bg-elev-2 focus:outline-none focus:ring-2 focus:ring-primary/50">
              <option value="">همهٔ شهرها</option>
              {cities.map((term) => <option key={term.id} value={term.slug}>{term.name}</option>)}
            </select>
          </div>
          <Button type="submit" size="lg" className="h-12 shrink-0 sm:px-8">جستجو</Button>
        </form>
      </div>
    </section>
  );
}
