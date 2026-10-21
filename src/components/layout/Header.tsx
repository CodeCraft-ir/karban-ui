"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { LogOut, MapPin, User, X } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Magnetic } from "@/components/motion/Magnetic";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { InstallButton } from "@/components/blocks/InstallApp";
import { useUIStore } from "@/store/ui";
import { useAuthSummary } from "./useAuthSummary";
import { getLogoutPresentation } from "./auth-summary-view";
import { accountLinks } from '@/lib/owner-ui';
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

export function Header() {
  const ref = useRef<HTMLElement>(null);
  const { menuOpen, setMenuOpen } = useUIStore();
  const { account, error: accountError, logout, logoutPending, logoutError } = useAuthSummary();
  const [accountOpen, setAccountOpen] = useState(false);
  const router = useRouter();

  useGSAP(() => {
    const element = ref.current;
    if (!element) return;
    ScrollTrigger.create({ start: 80, onEnter: () => element.classList.add("is-shrunk"), onLeaveBack: () => element.classList.remove("is-shrunk") });
  }, { scope: ref });

  const handleLogout = async () => {
    const destination = await logout();
    setAccountOpen(false);
    if (destination) router.push(destination);
  };

  const links = account ? accountLinks(account.role!) : [];
  const logoutStatus = getLogoutPresentation({ logoutPending, logoutError });

  return (
    <header ref={ref} className={cn("group/header fixed inset-x-0 top-0 z-50 transition-all duration-500", "[&.is-shrunk]:shadow-[0_10px_40px_-12px_var(--shade)]")}>
      <div className={cn("glass mx-auto flex h-(--header-h) max-w-6xl items-center justify-between gap-3 px-4 transition-all duration-500 sm:px-6", "mt-0 rounded-none border-x-0 border-t-0", "group-[.is-shrunk]/header:mt-2.5 group-[.is-shrunk]/header:h-14 group-[.is-shrunk]/header:max-w-[calc(100%-1.25rem)] group-[.is-shrunk]/header:rounded-3xl group-[.is-shrunk]/header:border sm:group-[.is-shrunk]/header:max-w-4xl")}>
        <Link href="/" aria-label="کاربان — صفحه اصلی" className="shrink-0"><Logo markClassName="h-9 w-9 transition-all duration-500 group-[.is-shrunk]/header:h-7 group-[.is-shrunk]/header:w-7" wordmarkClassName="hidden h-6 sm:block" /></Link>
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <Link href="/search" className="flex h-10 items-center gap-1.5 rounded-2xl bg-wash px-3 text-sm text-fg-soft transition-colors duration-200 hover:bg-wash-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><MapPin className="h-4 w-4 text-primary" /><span>جستجو بر اساس شهر</span></Link>
          <InstallButton className="hidden sm:flex" />
          <Magnetic strength={0.3}><ThemeToggle /></Magnetic>
          <div className="relative">
            {logoutStatus.state === "pending" ? (
              <span role="status" aria-busy="true" aria-label="در حال خروج" className="flex h-10 items-center gap-1.5 rounded-2xl border border-line bg-wash px-2 text-xs text-muted"><span className="h-4 w-4 animate-spin rounded-full border-2 border-muted/30 border-t-primary" />در حال خروج...</span>
            ) : logoutStatus.state === "error" ? (
              <div className="flex items-center gap-2 rounded-2xl border border-alert/30 bg-alert/10 px-2 py-1.5"><span role="alert" className="text-[11px] text-alert">خروج انجام نشد</span><Link href="/auth/login" className="text-[11px] text-primary hover:text-accent">ورود</Link></div>
            ) : account ? (
              <>
                <Magnetic strength={0.3}><button type="button" onClick={() => setAccountOpen((value) => !value)} aria-label={`حساب ${account.displayName}`} aria-expanded={accountOpen} className="flex h-10 max-w-32 items-center gap-1.5 rounded-2xl border border-primary/30 bg-primary/10 px-2 text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><User className="h-4.5 w-4.5 shrink-0" /><span className="truncate text-xs font-bold">{account.displayName}</span></button></Magnetic>
                {accountOpen && <div className="absolute left-0 top-12 z-10 min-w-44 rounded-2xl border border-line bg-card p-2 text-right shadow-xl">{links.map(link=><Link key={link.href} href={link.href} onClick={() => setAccountOpen(false)} className="block rounded-xl px-3 py-2 text-sm text-fg-soft hover:bg-wash">{link.label}</Link>)}<button type="button" onClick={() => void handleLogout()} disabled={logoutPending} aria-busy={logoutPending} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-alert hover:bg-alert/10 disabled:cursor-wait disabled:opacity-50"><LogOut className="h-4 w-4" />{logoutPending ? "در حال خروج..." : "خروج"}</button></div>}
              </>
            ) : (
              <Magnetic strength={0.3}><Link href="/auth/login" aria-label={accountError ? "ورود یا ثبت‌نام؛ حساب در دسترس نیست" : "ورود یا ثبت‌نام"} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary transition-colors duration-200 hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><User className="h-4.5 w-4.5" /></Link></Magnetic>
            )}
          </div>
          <Magnetic strength={0.3}><button type="button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? "بستن منو" : "باز کردن منو"} aria-expanded={menuOpen} className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-fg shadow-[0_6px_20px_-6px_var(--glow)] transition-transform duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><LogoMark className={cn("absolute h-5.5 w-5.5 transition-all duration-500", menuOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100")} /><span className={cn("absolute flex h-5 w-5 items-center justify-center transition-all duration-500", menuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0")}><X className="h-5 w-5" /></span></button></Magnetic>
        </div>
      </div>
    </header>
  );
}
