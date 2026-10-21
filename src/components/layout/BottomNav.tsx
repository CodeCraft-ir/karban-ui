"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Home, LayoutDashboard, PlusCircle, Search, UserRound } from "lucide-react";
import { Magnetic } from "@/components/motion/Magnetic";
import { useAuthSummary } from "./useAuthSummary";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const ref = useRef<HTMLElement>(null);
  const blobRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { account, pending } = useAuthSummary();
  const { contextSafe } = useGSAP({ scope: ref });
  const homeHref = account?.role === "specialist" ? "/pro" : account?.role === "client" ? "/dashboard" : "/auth/login";
  const homeLabel = account ? "داشبورد" : "ورود";
  const tabs = [
    { href: "/", label: "خانه", icon: Home },
    { href: "/search", label: "جستجو", icon: Search },
    { href: homeHref, label: account ? "داشبورد" : "ورود امن", icon: PlusCircle, fab: true },
    { href: account?.role === "specialist" ? "/pro/profile" : "/search", label: account?.role === "specialist" ? "پروفایل حرفه‌ای" : "متخصصان", icon: LayoutDashboard },
    { href: account ? '/account' : '/auth/login', label: account ? 'حساب شخصی' : homeLabel, icon: UserRound, key: "dash" },
  ] as const;
  const activeIndex = tabs.findIndex((tab, index) => !("fab" in tab && tab.fab) && tab.href === pathname && !(index === 4 && pathname === "/"));

  const moveBlob = contextSafe((target: HTMLElement) => {
    const blob = blobRef.current;
    const nav = ref.current;
    if (!blob || !nav) return;
    const navRect = nav.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    gsap.timeline().to(blob, { left: rect.left - navRect.left + rect.width / 2, scaleX: 1.9, scaleY: 0.65, duration: 0.32, ease: "power2.in" }).to(blob, { scaleX: 1, scaleY: 1, duration: 0.55, ease: "elastic.out(1.1, 0.5)" });
  });

  useGSAP(() => {
    const nav = ref.current;
    const blob = blobRef.current;
    if (!nav || !blob) return;
    const links = nav.querySelectorAll<HTMLElement>("[data-tab]");
    const active = links[activeIndex >= 0 ? activeIndex : 0];
    if (!active) return;
    const navRect = nav.getBoundingClientRect();
    const rect = active.getBoundingClientRect();
    gsap.set(blob, { left: rect.left - navRect.left + rect.width / 2, opacity: activeIndex >= 0 ? 1 : 0 });
  }, { dependencies: [pathname, account?.role], scope: ref });

  return (
    <nav ref={ref} aria-label="ناوبری اصلی" aria-busy={pending} className="glass fixed inset-x-3 bottom-3 z-50 mx-auto flex h-(--bottom-nav-h) max-w-md items-center justify-around rounded-3xl px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_18px_50px_-12px_var(--shade-strong)] md:hidden">
      <div ref={blobRef} aria-hidden className="gpu absolute top-1.5 h-1.5 w-9 -translate-x-1/2 rounded-full bg-primary opacity-0 shadow-[0_0_14px_2px_var(--glow)]" style={{ left: "50%" }} />
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isFab = "fab" in tab && tab.fab;
        const active = index === activeIndex;
        if (isFab) return <Magnetic key={`fab-${index}`} strength={0.4}><Link href={tab.href} aria-label={tab.label} className="pulse-cta -mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-fg shadow-[0_10px_28px_-6px_var(--glow)]" style={{ animation: "pulse-ring 2.5s cubic-bezier(0.4,0,0.6,1) infinite" }}><PlusCircle className="h-7 w-7" /></Link></Magnetic>;
        return <Link key={`${tab.href}-${index}`} href={tab.href} data-tab aria-current={active ? "page" : undefined} onClick={(event) => moveBlob(event.currentTarget)} className={cn("flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10px]", active ? "text-primary" : "text-muted hover:text-fg")}><Icon className={cn("h-5.5 w-5.5 transition-transform duration-300", active && "-translate-y-0.5")} /><span className="font-medium">{tab.label}</span></Link>;
      })}
    </nav>
  );
}
