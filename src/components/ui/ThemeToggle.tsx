"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

/**
 * ThemeToggle — GSAP sun↔moon morph:
 * on click the icon spins a full 360°, squashes to 0, swaps shape at the
 * midpoint, then elastic-pops back while the sun rays fan out (or the
 * moon crater fades in). Renders a neutral placeholder until mounted to
 * avoid any hydration mismatch.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<SVGSVGElement>(null);
  const { contextSafe } = useGSAP({ scope: btnRef });

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  const toggle = contextSafe(() => {
    const next = isDark ? "light" : "dark";
    const icon = iconRef.current;

    gsap
      .timeline()
      // wind up: spin + shrink
      .to(icon, {
        rotate: 180,
        scale: 0,
        duration: 0.28,
        ease: "power3.in",
        // swap the theme (and therefore the icon shape) at the midpoint
        onComplete: () => setTheme(next),
      })
      // release: finish the 360° with an elastic pop
      .to(icon, {
        rotate: 360,
        scale: 1,
        duration: 0.75,
        ease: "elastic.out(1.1, 0.5)",
      })
      .set(icon, { rotate: 0 });

    // button itself gives a satisfying squash
    gsap
      .timeline()
      .to(btnRef.current, { scale: 0.88, duration: 0.12, ease: "power2.out" })
      .to(btnRef.current, { scale: 1, duration: 0.6, ease: "elastic.out(1.2, 0.4)" });
  });

  return (
    <button
      ref={btnRef}
      onClick={mounted ? toggle : undefined}
      aria-label={mounted && isDark ? "حالت روشن" : "حالت تاریک"}
      title={mounted && isDark ? "حالت روشن" : "حالت تاریک"}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-2xl bg-wash text-primary hover:bg-wash-2",
        className,
      )}
    >
      <svg
        ref={iconRef}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="gpu h-5 w-5 will-change-transform"
        aria-hidden
      >
        {/* Neutral circle until mounted (identical SSR/client markup) */}
        {!mounted ? (
          <circle cx="12" cy="12" r="5" />
        ) : isDark ? (
          /* moon — crescent */
          <path d="M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="currentColor" fillOpacity="0.15" />
        ) : (
          /* sun — disc + rays */
          <>
            <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.15" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </>
        )}
      </svg>
    </button>
  );
}
