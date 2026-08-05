"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

/**
 * GSAP-powered bottom sheet:
 * backdrop fades in with blur, panel slides up with a slight bounce
 * (back.out overshoot), closes with a quick power slide-down.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const [canPortal, setCanPortal] = useState(false);

  useEffect(() => {
    mounted.current = true;
    setCanPortal(true);
  }, []);

  useGSAP(
    () => {
      const root = rootRef.current;
      const backdrop = backdropRef.current;
      const panel = panelRef.current;
      if (!root || !backdrop || !panel) return;

      if (open) {
        gsap.set(root, { display: "block" });
        gsap.fromTo(
          backdrop,
          { opacity: 0 },
          { opacity: 1, duration: 0.35, ease: "power2.out" },
        );
        gsap.fromTo(
          panel,
          { yPercent: 110 },
          { yPercent: 0, duration: 0.6, ease: "back.out(1.15)" },
        );
      } else if (mounted.current) {
        gsap.to(backdrop, { opacity: 0, duration: 0.28, ease: "power2.in" });
        gsap.to(panel, {
          yPercent: 110,
          duration: 0.38,
          ease: "power3.in",
          onComplete: () => gsap.set(root, { display: "none" }),
        });
      } else {
        gsap.set(root, { display: "none" });
      }
    },
    { dependencies: [open] },
  );

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Portal only after mount — SSR HTML must match first client render.
  if (!canPortal) return null;

  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-[70] hidden" role="dialog" aria-modal="true">
      <div
        ref={backdropRef}
        onClick={onClose}
        className="absolute inset-0 bg-(--backdrop) backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        className={cn(
          "gpu absolute inset-x-0 bottom-0 mx-auto max-w-lg rounded-t-4xl border border-b-0 border-line bg-card px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_60px_-16px_var(--shade-strong)]",
          className,
        )}
      >
        {/* grabber */}
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-elev-3" />
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="text-lg font-bold text-fg">{title}</h3>}
          <button
            onClick={onClose}
            aria-label="بستن"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-elev-2 text-muted hover:bg-elev-3 hover:text-fg"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
