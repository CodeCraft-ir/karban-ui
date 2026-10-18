"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { BriefcaseBusiness, CalendarClock, MapPin, Phone, Timer } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, VerifiedBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Rating } from "@/components/ui/Rating";
import { PublicDataEmpty } from "@/components/sections/PublicDataState";
import type { PublicSpecialistDetail } from "@/lib/contracts/specialists";
import { faNum } from "@/lib/utils";

function availabilityLabel(availability: PublicSpecialistDetail["availability"]): string | null {
  if (availability === "available") return "آمادهٔ کار";
  if (availability === "busy") return "مشغول";
  if (availability === "away") return "فعلاً در دسترس نیست";
  return null;
}

export function SpecialistProfile({ specialist }: { specialist: PublicSpecialistDetail }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [phoneVisible, setPhoneVisible] = useState(false);
  const location = specialist.cities.join("، ");
  const availability = availabilityLabel(specialist.availability);
  const summary = specialist.description ?? specialist.bio;
  const stats = [
    specialist.experienceYears === null ? null : { icon: CalendarClock, value: `${faNum(specialist.experienceYears)} سال`, label: "سابقهٔ کار" },
    specialist.responseMinutes === null ? null : { icon: Timer, value: `${faNum(specialist.responseMinutes)} دقیقه`, label: "زمان پاسخ" },
    specialist.priceHint ? { icon: BriefcaseBusiness, value: specialist.priceHint, label: "بازهٔ قیمت" } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  useGSAP(
    () => {
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .fromTo(".profile-cover", { scaleY: 0.6, transformOrigin: "top", autoAlpha: 0 }, { scaleY: 1, autoAlpha: 1, duration: 0.7 })
        .fromTo(".profile-avatar", { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.7, ease: "back.out(1.7)" }, "-=0.35")
        .fromTo(".profile-head > *", { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.08 }, "-=0.4");
    },
    { scope: rootRef },
  );

  return (
    <div ref={rootRef} className="mx-auto max-w-4xl">
      <div className="profile-cover relative mx-3 mt-2 h-40 overflow-hidden rounded-4xl sm:mx-6 sm:h-52">
        <div className="absolute inset-0 bg-[radial-gradient(100%_120%_at_80%_0%,rgb(0_114_182_/_0.45),transparent_55%),radial-gradient(90%_100%_at_10%_100%,rgb(245_184_0_/_0.25),transparent_50%),linear-gradient(150deg,#102431,#050b10)]" />
        <div aria-hidden className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(0deg, white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        {availability && <Badge tone={specialist.availability === "available" ? "success" : "neutral"} className="absolute left-4 top-4 backdrop-blur">{availability}</Badge>}
      </div>
      <div className="relative px-5 pb-24 sm:px-8 md:pb-8">
        <div className="profile-avatar -mt-12 inline-block rounded-[1.4rem] border-4 border-surface sm:-mt-14"><Avatar name={specialist.title} src={specialist.avatarUrl} hue={specialist.id} className="h-24 w-24 rounded-[1.1rem] text-3xl sm:h-28 sm:w-28" /></div>
        <div className="profile-head mt-3">
          <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold text-fg">{specialist.title}</h1>{specialist.verified && <VerifiedBadge className="[&_svg]:h-6 [&_svg]:w-6" />}</div>
          {specialist.categories.length > 0 && <p className="mt-1 text-muted">{specialist.categories.join("، ")}</p>}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm"><Rating value={specialist.rating?.average ?? null} count={specialist.rating?.count} />{location && <span className="inline-flex items-center gap-1 text-muted"><MapPin className="h-4 w-4 text-primary/80" />{location}</span>}</div>
          {specialist.address && <p className="mt-2 text-sm text-muted">{specialist.address}</p>}
        </div>
        {stats.length > 0 && <div className={`mt-6 grid gap-2.5 ${stats.length === 1 ? "grid-cols-1" : stats.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>{stats.map(({ icon: Icon, value, label }) => <div key={label} className="rounded-3xl border border-line bg-card p-3.5 text-center"><Icon className="mx-auto mb-1.5 h-5 w-5 text-primary" /><div className="text-sm font-bold text-fg">{value}</div><div className="mt-0.5 text-[11px] text-faint">{label}</div></div>)}</div>}
        <div className="py-7">
          {summary ? <p className="leading-8 text-fg-soft">{summary}</p> : <PublicDataEmpty title="توضیحی منتشر نشده است" description="این متخصص هنوز توضیح عمومی برای پروفایل خود ثبت نکرده است." />}
          {specialist.skills && <div className="mt-6"><h2 className="mb-3 font-bold text-fg">مهارت‌ها</h2><p className="leading-8 text-fg-soft">{specialist.skills}</p></div>}
        </div>
      </div>
      {specialist.phoneDisplay && <div className="fixed inset-x-3 bottom-[calc(var(--bottom-nav-h)+1.25rem)] z-40 mx-auto max-w-md md:static md:mx-8 md:mb-10 md:max-w-none">{phoneVisible ? <a href={`tel:${specialist.phoneDisplay}`} dir="ltr" className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-primary text-base font-medium text-primary-fg shadow-[0_10px_28px_-8px_var(--glow)] transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Phone className="h-5 w-5" />{specialist.phoneDisplay}</a> : <Button size="lg" className="h-13 w-full gap-2 text-base" onClick={() => setPhoneVisible(true)}><Phone className="h-5 w-5" />نمایش شمارهٔ تماس</Button>}</div>}
    </div>
  );
}
