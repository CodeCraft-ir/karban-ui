"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ChevronRight, ChevronLeft, X } from "lucide-react";
import type { PortfolioItem } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Deterministic gradient "photo" for dummy portfolio art. */
function ArtTile({
  item,
  className,
  onClick,
}: {
  item: PortfolioItem;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`مشاهده ${item.title}`}
      className={cn(
        "group relative block overflow-hidden rounded-3xl text-right",
        className,
      )}
      style={{
        background: `
          radial-gradient(120% 90% at 15% 10%, hsl(${item.hue} 70% 52% / 0.85), transparent 55%),
          radial-gradient(110% 100% at 85% 90%, hsl(${(item.hue + 60) % 360} 60% 30% / 0.9), transparent 60%),
          linear-gradient(160deg, hsl(${item.hue} 45% 20%), hsl(${(item.hue + 30) % 360} 50% 12%))`,
      }}
    >
      {/* texture grid */}
      <span
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(0deg, white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/90 to-transparent p-3.5 pt-10">
        <span className="mb-1 inline-block rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-medium text-primary-fg">
          {item.tag}
        </span>
        <span className="block text-sm font-bold text-white drop-shadow">
          {item.title}
        </span>
      </span>
      <span className="absolute inset-0 bg-white/0 transition-colors duration-300 group-hover:bg-wash" />
    </button>
  );
}

/**
 * Portfolio gallery — touch-swipeable scroll-snap slider + GSAP lightbox
 * (backdrop blur in, image scales from 0.85 with spring, arrow keys work).
 */
export function PortfolioGallery({ items }: { items: PortfolioItem[] }) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const artRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (lightbox === null) return;
      gsap.fromTo(
        lightboxRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "power2.out" },
      );
      gsap.fromTo(
        artRef.current,
        { scale: 0.85, y: 24, autoAlpha: 0 },
        { scale: 1, y: 0, autoAlpha: 1, duration: 0.55, ease: "back.out(1.3)" },
      );
    },
    { dependencies: [lightbox] },
  );

  const navigate = useCallback(
    (dir: 1 | -1) => {
      setLightbox((cur) => {
        if (cur === null) return cur;
        const next = (cur + dir + items.length) % items.length;
        gsap.fromTo(
          artRef.current,
          { x: dir * 40, autoAlpha: 0.4 },
          { x: 0, autoAlpha: 1, duration: 0.4, ease: "power3.out" },
        );
        return next;
      });
    },
    [items.length],
  );

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") navigate(1);
      if (e.key === "ArrowLeft") navigate(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, navigate]);

  return (
    <>
      {/* swipeable snap slider */}
      <div
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
        dir="rtl"
      >
        {items.map((item, i) => (
          <ArtTile
            key={item.id}
            item={item}
            onClick={() => setLightbox(i)}
            className="h-52 w-[78%] shrink-0 snap-center sm:h-60 sm:w-[46%] lg:w-[31%]"
          />
        ))}
      </div>

      {/* lightbox */}
      {lightbox !== null && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={items[lightbox].title}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-(--backdrop) p-5 backdrop-blur-lg"
          onClick={() => setLightbox(null)}
        >
          <button
            aria-label="بستن گالری"
            className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-wash-2 text-fg-soft hover:bg-wash-2"
            onClick={() => setLightbox(null)}
          >
            <X className="h-5 w-5" />
          </button>

          <button
            aria-label="تصویر قبلی"
            onClick={(e) => {
              e.stopPropagation();
              navigate(-1);
            }}
            className="absolute right-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-wash-2 text-fg-soft hover:bg-primary hover:text-primary-fg"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            aria-label="تصویر بعدی"
            onClick={(e) => {
              e.stopPropagation();
              navigate(1);
            }}
            className="absolute left-4 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-wash-2 text-fg-soft hover:bg-primary hover:text-primary-fg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div
            ref={artRef}
            className="gpu w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ArtTile item={items[lightbox]} className="aspect-[4/3] w-full cursor-default" />
          </div>
        </div>
      )}
    </>
  );
}
