"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { LogoMark, LogoWordmark } from "@/components/brand/Logo";
import { useUIStore } from "@/store/ui";

/**
 * Splash — brand entrance choreography:
 * 1. golden mark scales in with elastic pop + slow rotation settle
 * 2. wordmark clips in from the mark
 * 3. tagline fades, then the whole veil wipes upward revealing the app
 * Plays once per browser session (persisted in sessionStorage).
 */
const SPLASH_KEY = "karban-splash-done";

export function Splash() {
  const rootRef = useRef<HTMLDivElement>(null);
  const splashDone = useUIStore((s) => s.splashDone);
  const setSplashDone = useUIStore((s) => s.setSplashDone);

  useGSAP(
    () => {
      if (splashDone) return;
      // already seen this session → skip instantly
      if (sessionStorage.getItem(SPLASH_KEY)) {
        setSplashDone(true);
        return;
      }
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          sessionStorage.setItem(SPLASH_KEY, "1");
          setSplashDone(true);
        },
      });

      tl.fromTo(
        ".splash-mark",
        { scale: 0.4, autoAlpha: 0, rotate: -30 },
        { scale: 1, autoAlpha: 1, rotate: 0, duration: 1.1, ease: "elastic.out(1, 0.5)" },
      )
        .fromTo(
          ".splash-word",
          { autoAlpha: 0, x: -24, clipPath: "inset(0 0 0 100%)" },
          { autoAlpha: 1, x: 0, clipPath: "inset(0 0 0 0%)", duration: 0.7 },
          "-=0.55",
        )
        .fromTo(
          ".splash-tag",
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.5 },
          "-=0.25",
        )
        .to(".splash-glow", { scale: 1.6, opacity: 0.35, duration: 0.8 }, "<")
        .to(rootRef.current, {
          yPercent: -100,
          duration: 0.85,
          delay: 0.45,
          ease: "power4.inOut",
        });
    },
    { scope: rootRef },
  );

  if (splashDone) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="gpu fixed inset-0 z-[100] flex flex-col items-center justify-center bg-ink-950"
    >
      {/* radial brand glow */}
      <div className="splash-glow pointer-events-none absolute h-72 w-72 rounded-full bg-brand-500/20 blur-[90px]" />
      <div className="relative flex items-center gap-4">
        <LogoMark className="splash-mark h-16 w-16 text-brand-500 opacity-0" />
        <LogoWordmark className="splash-word h-12 w-auto text-white opacity-0" />
      </div>
      <p className="splash-tag mt-6 text-sm text-slate-400 opacity-0">
        شبکه متخصصان ساختمان ایران
      </p>
    </div>
  );
}
