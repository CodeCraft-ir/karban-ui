"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  BriefcaseBusiness,
  CalendarClock,
  MapPin,
  MessageCircle,
  Phone,
  Star,
  Timer,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Rating } from "@/components/ui/Rating";
import { Tabs } from "@/components/ui/Tabs";
import { PortfolioGallery } from "@/components/blocks/PortfolioGallery";
import type { Specialist } from "@/lib/data";
import { cn, faNum } from "@/lib/utils";

const TABS = [
  { id: "about", label: "درباره" },
  { id: "portfolio", label: "نمونه‌کارها" },
  { id: "reviews", label: "نظرات" },
];

export function SpecialistProfile({ specialist }: { specialist: Specialist }) {
  const s = specialist;
  const [tab, setTab] = useState("about");
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: rootRef });

  // entrance choreography
  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(".profile-cover", { scaleY: 0.6, transformOrigin: "top", autoAlpha: 0 }, { scaleY: 1, autoAlpha: 1, duration: 0.7 })
        .fromTo(".profile-avatar", { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.7, ease: "back.out(1.7)" }, "-=0.35")
        .fromTo(".profile-head > *", { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08 }, "-=0.4")
        .fromTo(".profile-stat", { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.07 }, "-=0.3");
    },
    { scope: rootRef },
  );

  const changeTab = contextSafe((next: string) => {
    if (next === tab) return;
    const dir = TABS.findIndex((t) => t.id === next) > TABS.findIndex((t) => t.id === tab) ? -1 : 1;
    setTab(next);
    gsap.fromTo(
      panelRef.current,
      { x: 36 * dir, autoAlpha: 0 },
      { x: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out" },
    );
  });

  return (
    <div ref={rootRef} className="mx-auto max-w-4xl">
      {/* Cover */}
      <div className="profile-cover relative mx-3 mt-2 h-40 overflow-hidden rounded-4xl sm:mx-6 sm:h-52">
        <div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(100% 120% at 80% 0%, hsl(${s.hue} 70% 45% / 0.5), transparent 55%),
              radial-gradient(90% 100% at 10% 100%, rgb(245 184 0 / 0.25), transparent 50%),
              linear-gradient(150deg, #1e293b, #0f172a)`,
          }}
        />
        {/* blueprint grid texture */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(0deg, white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {s.available && (
          <Badge tone="success" className="absolute left-4 top-4 backdrop-blur">
            <span className="ml-1 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            آماده کار
          </Badge>
        )}
      </div>

      {/* Head */}
      <div className="relative px-5 sm:px-8">
        <div className="profile-avatar -mt-12 inline-block rounded-[1.4rem] border-4 border-surface sm:-mt-14">
          <Avatar name={s.name} hue={s.hue} className="h-24 w-24 rounded-[1.1rem] text-3xl sm:h-28 sm:w-28" />
        </div>

        <div className="profile-head mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-fg">{s.name}</h1>
            {s.verified && <VerifiedBadge className="[&_svg]:h-6 [&_svg]:w-6" />}
          </div>
          <p className="mt-1 text-muted">{s.title}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            <Rating value={s.rating} count={s.reviewsCount} />
            <span className="inline-flex items-center gap-1 text-muted">
              <MapPin className="h-4 w-4 text-primary/80" />
              {s.city}، {s.neighborhood} · {faNum(s.distanceKm)} کیلومتر
            </span>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {[
            { icon: BriefcaseBusiness, value: faNum(s.completedJobs), label: "پروژه موفق" },
            { icon: CalendarClock, value: `${faNum(s.experienceYears)} سال`, label: "سابقه کار" },
            { icon: Timer, value: s.responseTime, label: "زمان پاسخ" },
          ].map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="profile-stat rounded-3xl border border-line bg-card p-3.5 text-center"
            >
              <Icon className="mx-auto mb-1.5 h-5 w-5 text-primary" />
              <div className="text-sm font-bold text-fg">{value}</div>
              <div className="mt-0.5 text-[11px] text-faint">{label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs tabs={TABS} active={tab} onChange={changeTab} className="mt-7" />

        <div ref={panelRef} className="min-h-64 py-6 pb-24 md:pb-8">
          {tab === "about" && (
            <div className="space-y-6">
              <p className="leading-8 text-fg-soft">{s.about}</p>
              <div>
                <h2 className="mb-3 font-bold text-fg">مهارت‌ها</h2>
                <div className="flex flex-wrap gap-2">
                  {s.skills.map((skill) => (
                    <Badge key={skill} tone="brand" className="px-3.5 py-1.5 text-[13px]">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "portfolio" && <PortfolioGallery items={s.portfolio} />}

          {tab === "reviews" && (
            <div className="space-y-4">
              {s.reviews.map((r) => (
                <article
                  key={r.id}
                  className="rounded-3xl border border-line bg-card p-5"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar name={r.author} hue={(r.author.length * 47) % 360} className="h-10 w-10 rounded-xl text-sm" />
                      <div>
                        <div className="text-sm font-bold text-fg">{r.author}</div>
                        <div className="text-[11px] text-faint">
                          {r.date} · {r.project}
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-xl bg-primary/12 px-2.5 py-1 text-sm font-bold text-primary">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" />
                      {faNum(r.rating)}
                    </span>
                  </div>
                  <p className="text-sm leading-7 text-fg-soft">{r.text}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sticky bottom CTA (mobile) */}
      <div className="fixed inset-x-3 bottom-[calc(var(--bottom-nav-h)+1.25rem)] z-40 mx-auto flex max-w-md gap-2.5 md:static md:mx-8 md:mb-10 md:max-w-none md:px-0">
        <Button
          size="lg"
          onClick={() => setPhoneRevealed(true)}
          className={cn("h-13 flex-1 gap-2 text-base", !phoneRevealed && "animate-pulse-ring")}
        >
          <Phone className="h-5 w-5" />
          {phoneRevealed ? <span dir="ltr">۰۹۱۲ ۳۴۵ ۶۷۸۹</span> : "نمایش شماره تماس"}
        </Button>
        <Button size="lg" variant="secondary" className="h-13 gap-2" aria-label="ارسال پیام">
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">پیام</span>
        </Button>
      </div>
    </div>
  );
}
