"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ChevronDown, MapPin, User } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Magnetic } from "@/components/motion/Magnetic";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { InstallButton } from "@/components/blocks/InstallApp";
import { useUIStore } from "@/store/ui";
import { CITIES } from "@/lib/data";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/**
 * Sticky header — shrinks and gains a glass background after 80px of
 * scroll. Houses the logo lockup, city selector and auth avatar, plus
 * the brand hamburger that morphs open/closed for the overlay menu.
 */
export function Header() {
  const ref = useRef<HTMLElement>(null);
  const [cityOpen, setCityOpen] = useState(false);
  const { city, setCity, menuOpen, setMenuOpen } = useUIStore();

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      ScrollTrigger.create({
        start: 80,
        onEnter: () => el.classList.add("is-shrunk"),
        onLeaveBack: () => el.classList.remove("is-shrunk"),
      });
    },
    { scope: ref },
  );

  return (
    <header
      ref={ref}
      className={cn(
        "group/header fixed inset-x-0 top-0 z-50 transition-all duration-500",
        "[&.is-shrunk]:shadow-[0_10px_40px_-12px_var(--shade)]",
      )}
    >
      <div
        className={cn(
          "glass mx-auto flex h-(--header-h) max-w-6xl items-center justify-between gap-3 px-4 transition-all duration-500 sm:px-6",
          "mt-0 rounded-none border-x-0 border-t-0",
          "group-[.is-shrunk]/header:mt-2.5 group-[.is-shrunk]/header:h-14 group-[.is-shrunk]/header:max-w-[calc(100%-1.25rem)] group-[.is-shrunk]/header:rounded-3xl group-[.is-shrunk]/header:border sm:group-[.is-shrunk]/header:max-w-4xl",
        )}
      >
        {/* Logo lockup */}
        <Link href="/" aria-label="کاربان — صفحه اصلی" className="shrink-0">
          <Logo
            markClassName="h-9 w-9 transition-all duration-500 group-[.is-shrunk]/header:h-7 group-[.is-shrunk]/header:w-7"
            wordmarkClassName="hidden h-6 sm:block"
          />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* City selector */}
          <div className="relative">
            <button
              onClick={() => setCityOpen((o) => !o)}
              aria-expanded={cityOpen}
              aria-haspopup="listbox"
              className="flex h-10 items-center gap-1.5 rounded-2xl bg-wash px-3 text-sm text-fg-soft hover:bg-wash-2"
            >
              <MapPin className="h-4 w-4 text-primary" />
              <span>{city}</span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted transition-transform duration-300",
                  cityOpen && "rotate-180",
                )}
              />
            </button>
            {cityOpen && (
              <ul
                role="listbox"
                className="glass absolute left-0 top-12 z-50 max-h-64 w-36 overflow-auto rounded-2xl p-1.5 shadow-2xl"
              >
                {CITIES.map((c) => (
                  <li key={c}>
                    <button
                      role="option"
                      aria-selected={c === city}
                      onClick={() => {
                        setCity(c);
                        setCityOpen(false);
                      }}
                      className={cn(
                        "w-full rounded-xl px-3 py-2 text-right text-sm hover:bg-wash-2",
                        c === city
                          ? "bg-primary/15 text-primary"
                          : "text-fg-soft",
                      )}
                    >
                      {c}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Install app — utility slot, next to theme toggle */}
          <InstallButton className="hidden sm:flex" />

          {/* Theme switcher */}
          <Magnetic strength={0.3}>
            <ThemeToggle />
          </Magnetic>

          {/* Auth avatar */}
          <Magnetic strength={0.3}>
            <Link
              href="/auth/login"
              aria-label="ورود یا ثبت‌نام"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20"
            >
              <User className="h-4.5 w-4.5" />
            </Link>
          </Magnetic>

          {/* Brand hamburger — logo mark morphs into X */}
          <Magnetic strength={0.3}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={menuOpen ? "بستن منو" : "باز کردن منو"}
              aria-expanded={menuOpen}
              className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-fg shadow-[0_6px_20px_-6px_var(--glow)]"
            >
              <LogoMark
                className={cn(
                  "absolute h-5.5 w-5.5 transition-all duration-500",
                  menuOpen ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
                )}
              />
              <span
                className={cn(
                  "absolute flex h-5 w-5 items-center justify-center transition-all duration-500",
                  menuOpen ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0",
                )}
              >
                <span className="absolute h-0.5 w-5 rotate-45 rounded bg-card" />
                <span className="absolute h-0.5 w-5 -rotate-45 rounded bg-card" />
              </span>
            </button>
          </Magnetic>
        </div>
      </div>
    </header>
  );
}
