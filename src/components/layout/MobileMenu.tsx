"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  ArrowUpLeft,
  Home,
  LayoutDashboard,
  LogIn,
  Search,
  UserRound,
  Wallet,
} from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { useUIStore } from "@/store/ui";
import { cn, faNum } from "@/lib/utils";

const MENU_ITEMS = [
  { href: "/", label: "خانه", sub: "جستجوی متخصص", icon: Home },
  { href: "/specialists/amir-hosseini", label: "متخصصان", sub: "پروفایل و نمونه‌کار", icon: UserRound },
  { href: "/dashboard", label: "داشبورد کارفرما", sub: "پروژه‌های من", icon: LayoutDashboard },
  { href: "/pro", label: "داشبورد متخصص", sub: "فرصت‌های کاری", icon: Wallet },
  { href: "/auth/login", label: "ورود / ثبت‌نام", sub: "با شماره موبایل", icon: LogIn },
] as const;

/**
 * Full-screen overlay menu.
 * Open: backdrop blur ramps up → giant watermark logo drifts in →
 * items stagger up with rotation + fade (spring), footer follows.
 * Close: reverses quickly with power easing.
 */
export function MobileMenu() {
  const rootRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const { menuOpen, setMenuOpen } = useUIStore();
  const pathname = usePathname();

  useGSAP(
    () => {
      const items = gsap.utils.toArray<HTMLElement>(".menu-item");

      const tl = gsap.timeline({ paused: true });
      tl.set(rootRef.current, { display: "flex" })
        .fromTo(
          ".menu-backdrop",
          { opacity: 0, backdropFilter: "blur(0px)" },
          {
            opacity: 1,
            backdropFilter: "blur(22px)",
            duration: 0.5,
            ease: "power2.out",
          },
        )
        .fromTo(
          ".menu-watermark",
          { scale: 0.6, autoAlpha: 0, rotate: 20 },
          { scale: 1, autoAlpha: 0.06, rotate: 0, duration: 1.1, ease: "power3.out" },
          "-=0.3",
        )
        .fromTo(
          items,
          { y: 90, autoAlpha: 0, rotate: -6 },
          {
            y: 0,
            autoAlpha: 1,
            rotate: 0,
            duration: 0.85,
            stagger: 0.075,
            ease: "back.out(1.6)",
          },
          "-=0.9",
        )
        .fromTo(
          ".menu-footer",
          { y: 30, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out" },
          "-=0.5",
        );

      tlRef.current = tl;
    },
    { scope: rootRef },
  );

  useGSAP(
    () => {
      const tl = tlRef.current;
      if (!tl) return;
      if (menuOpen) {
        document.documentElement.classList.add("overflow-hidden");
        tl.timeScale(1).play();
      } else {
        document.documentElement.classList.remove("overflow-hidden");
        tl.timeScale(1.8).reverse();
      }
    },
    { dependencies: [menuOpen] },
  );

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[60] hidden flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="منوی اصلی"
    >
      {/* Glass backdrop */}
      <div
        className="menu-backdrop absolute inset-0 bg-(--backdrop)"
        onClick={() => setMenuOpen(false)}
      />

      {/* Giant brand watermark */}
      <LogoMark className="menu-watermark pointer-events-none absolute -left-24 top-1/2 h-[34rem] w-[34rem] -translate-y-1/2 text-primary opacity-0" />

      {/* Items */}
      <nav className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-2 px-7 pt-16">
        {MENU_ITEMS.map(({ href, label, sub, icon: Icon }, i) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "menu-item group/item flex items-center justify-between rounded-3xl border border-transparent p-4 opacity-0",
                "hover:border-primary/25 hover:bg-wash",
                active && "border-primary/30 bg-primary/8",
              )}
            >
              <span className="flex items-center gap-4">
                <span
                  className={cn(
                    "flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-300",
                    active
                      ? "bg-primary text-primary-fg"
                      : "bg-wash text-primary group-hover/item:bg-primary group-hover/item:text-primary-fg",
                  )}
                >
                  <Icon className="h-5.5 w-5.5" />
                </span>
                <span>
                  <span className="block text-xl font-bold text-fg">
                    {label}
                  </span>
                  <span className="block text-xs text-muted">{sub}</span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-faint transition-colors group-hover/item:text-primary">
                  {faNum(`0${i + 1}`)}
                </span>
                <ArrowUpLeft className="h-4.5 w-4.5 text-faint transition-all duration-300 group-hover/item:-translate-y-0.5 group-hover/item:translate-x-[-2px] group-hover/item:text-primary" />
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="menu-footer relative z-10 flex items-center justify-between px-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 opacity-0">
        <p className="text-xs text-faint">کاربان © ۱۴۰۵ — ساخت ایران</p>
        <div className="flex items-center gap-2 text-xs text-muted">
          <Search className="h-3.5 w-3.5 text-primary" />
          <span>{faNum(2480)} متخصص فعال</span>
        </div>
      </div>
    </div>
  );
}
