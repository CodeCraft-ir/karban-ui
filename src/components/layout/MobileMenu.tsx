"use client";

import { useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowUpLeft, Home, LayoutDashboard, LogIn, LogOut, Search, UserRound } from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { useUIStore } from "@/store/ui";
import { useAuthSummary } from "./useAuthSummary";
import { getLogoutPresentation } from "./auth-summary-view";
import { accountLinks } from '@/lib/owner-ui';
import { cn, faNum } from "@/lib/utils";

const PUBLIC_ITEMS = [
  { href: "/", label: "خانه", sub: "جستجوی متخصص", icon: Home },
  { href: "/search", label: "متخصصان", sub: "فهرست منتشرشده", icon: UserRound },
  { href: "/search", label: "جستجو", sub: "پیدا کردن متخصص", icon: Search },
] as const;

export function MobileMenu() {
  const rootRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const { menuOpen, setMenuOpen } = useUIStore();
  const { account, pending: accountPending, error: accountError, logout, logoutPending, logoutError } = useAuthSummary();
  const pathname = usePathname();
  const router = useRouter();

  useGSAP(() => {
    const items = gsap.utils.toArray<HTMLElement>(".menu-item");
    const tl = gsap.timeline({ paused: true });
    tl.set(rootRef.current, { display: "flex" })
      .fromTo(".menu-backdrop", { opacity: 0, backdropFilter: "blur(0px)" }, { opacity: 1, backdropFilter: "blur(22px)", duration: 0.5, ease: "power2.out" })
      .fromTo(".menu-watermark", { scale: 0.6, autoAlpha: 0, rotate: 20 }, { scale: 1, autoAlpha: 0.06, rotate: 0, duration: 1.1, ease: "power3.out" }, "-=0.3")
      .fromTo(items, { y: 90, autoAlpha: 0, rotate: -6 }, { y: 0, autoAlpha: 1, rotate: 0, duration: 0.85, stagger: 0.075, ease: "back.out(1.6)" }, "-=0.9")
      .fromTo(".menu-footer", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, ease: "power3.out" }, "-=0.5");
    tlRef.current = tl;
  }, { scope: rootRef, dependencies: [account?.role, accountPending] });

  useGSAP(() => {
    const tl = tlRef.current;
    if (!tl) return;
    if (menuOpen) {
      document.documentElement.classList.add("overflow-hidden");
      tl.timeScale(1).play();
    } else {
      document.documentElement.classList.remove("overflow-hidden");
      tl.timeScale(1.8).reverse();
    }
  }, { dependencies: [menuOpen] });

  const logoutStatus = getLogoutPresentation({ logoutPending, logoutError });
  const items = account
    ? [...PUBLIC_ITEMS, ...accountLinks(account.role!).map(link=>({...link,sub:'اطلاعات واقعی حساب',icon:LayoutDashboard}))]
    : PUBLIC_ITEMS;

  const handleLogout = async () => {
    const destination = await logout();
    if (destination) {
      setMenuOpen(false);
      router.push(destination);
    }
  };

  return (
    <div ref={rootRef} className="fixed inset-0 z-[60] hidden flex-col" role="dialog" aria-modal="true" aria-label="منوی اصلی" aria-busy={accountPending || logoutPending}>
      <div className="menu-backdrop absolute inset-0 bg-(--backdrop)" onClick={() => setMenuOpen(false)} />
      <LogoMark className="menu-watermark pointer-events-none absolute -left-24 top-1/2 h-[34rem] w-[34rem] -translate-y-1/2 text-primary opacity-0" />
      <nav className="relative z-10 mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col gap-2 overflow-y-auto px-7 pb-4 pt-20">
        {items.map(({ href, label, sub, icon: Icon }, i) => {
          const active = pathname === href;
          return <Link key={`${href}-${i}`} href={href} onClick={() => setMenuOpen(false)} className={cn("menu-item group/item flex items-center justify-between rounded-3xl border border-transparent p-4 opacity-0 hover:border-primary/25 hover:bg-wash", active && "border-primary/30 bg-primary/8")}>
            <span className="flex items-center gap-4"><span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl transition-colors duration-300", active ? "bg-primary text-primary-fg" : "bg-wash text-primary group-hover/item:bg-primary group-hover/item:text-primary-fg")}><Icon className="h-5.5 w-5.5" /></span><span><span className="block text-xl font-bold text-fg">{label}</span><span className="block text-xs text-muted">{sub}</span></span></span>
            <span className="flex items-center gap-2"><span className="text-xs text-faint">{faNum(`0${i + 1}`)}</span><ArrowUpLeft className="h-4.5 w-4.5 text-faint transition-all duration-300 group-hover/item:-translate-y-0.5 group-hover/item:translate-x-[-2px] group-hover/item:text-primary" /></span>
          </Link>;
        })}
        {!account && <Link href="/auth/login" onClick={() => setMenuOpen(false)} className="menu-item group/item flex items-center justify-between rounded-3xl border border-transparent p-4 opacity-0 hover:border-primary/25 hover:bg-wash"><span className="flex items-center gap-4"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-wash text-primary"><LogIn className="h-5.5 w-5.5" /></span><span><span className="block text-xl font-bold text-fg">ورود / ثبت‌نام</span><span className="block text-xs text-muted">با شماره موبایل</span></span></span><ArrowUpLeft className="h-4.5 w-4.5 text-faint" /></Link>}
      </nav>
      <div className="menu-footer relative z-10 flex items-center justify-between px-8 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 opacity-0">
        <p className="text-xs text-faint">کاربان © ۱۴۰۵ — ساخت ایران</p>
        {logoutStatus.state === "pending" ? <span role="status" aria-busy="true" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-muted"><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted/30 border-t-primary" />{logoutStatus.label}</span> : logoutStatus.state === "error" ? <span role="alert" className="rounded-xl bg-alert/10 px-3 py-2 text-xs text-alert">{logoutStatus.label}</span> : account ? <button type="button" onClick={() => void handleLogout()} disabled={logoutPending} aria-busy={logoutPending} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs text-alert hover:bg-alert/10 disabled:cursor-wait disabled:opacity-50"><LogOut className="h-3.5 w-3.5" /> خروج</button> : <span className={cn("text-xs", accountError ? "text-alert" : "text-muted")}>{accountError ? "حساب در دسترس نیست" : accountPending ? "در حال بررسی حساب" : "ورود امن"}</span>}
      </div>
    </div>
  );
}
