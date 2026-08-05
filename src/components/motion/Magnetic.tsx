"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

/**
 * Magnetic — the element is gently pulled toward the pointer within
 * its bounds and springs back on leave. Also fires a quick tap pulse
 * on touch devices where hover doesn't exist.
 */
export function Magnetic({
  children,
  strength = 0.35,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: ref });

  const onMove = contextSafe((e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * strength;
    const y = (e.clientY - rect.top - rect.height / 2) * strength;
    gsap.to(el, { x, y, duration: 0.4, ease: "power3.out" });
  });

  const onLeave = contextSafe(() => {
    gsap.to(ref.current, {
      x: 0,
      y: 0,
      duration: 0.7,
      ease: "elastic.out(1, 0.35)",
    });
  });

  const onTap = contextSafe((e: React.PointerEvent) => {
    if (e.pointerType === "mouse") return;
    gsap
      .timeline()
      .to(ref.current, { scale: 0.88, duration: 0.1, ease: "power2.out" })
      .to(ref.current, { scale: 1, duration: 0.5, ease: "elastic.out(1.2, 0.4)" });
  });

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={onTap}
      className={cn("gpu inline-block will-change-transform", className)}
    >
      {children}
    </div>
  );
}
