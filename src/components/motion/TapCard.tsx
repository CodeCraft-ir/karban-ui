"use client";

import { useRef, type HTMLAttributes } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

/**
 * TapCard — wraps any card with the Karban tap feedback loop:
 * press → scale 0.97, release → elastic spring back.
 */
export function TapCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: ref });

  const press = contextSafe(() =>
    gsap.to(ref.current, { scale: 0.97, duration: 0.14, ease: "power2.out" }),
  );
  const release = contextSafe(() =>
    gsap.to(ref.current, {
      scale: 1,
      duration: 0.6,
      ease: "elastic.out(1.05, 0.4)",
    }),
  );

  return (
    <div
      ref={ref}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      className={cn("gpu select-none will-change-transform", className)}
      {...props}
    >
      {children}
    </div>
  );
}
