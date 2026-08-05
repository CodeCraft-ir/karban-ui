"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

export interface Tab {
  id: string;
  label: string;
}

/**
 * Animated tabs — a golden underline glides between tabs and the
 * incoming panel slides in from the tab direction with a fade.
 */
export function Tabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const underlineRef = useRef<HTMLSpanElement>(null);
  const { contextSafe } = useGSAP({ scope: listRef });

  const moveUnderline = contextSafe((target: HTMLElement) => {
    const list = listRef.current;
    const underline = underlineRef.current;
    if (!list || !underline) return;
    const listRect = list.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    gsap.to(underline, {
      width: rect.width * 0.6,
      left: rect.left - listRect.left + rect.width * 0.2,
      duration: 0.5,
      ease: "elastic.out(1, 0.7)",
    });
  });

  useGSAP(
    () => {
      const list = listRef.current;
      if (!list) return;
      const activeEl = list.querySelector<HTMLElement>(`[data-tab="${active}"]`);
      if (activeEl) {
        const listRect = list.getBoundingClientRect();
        const rect = activeEl.getBoundingClientRect();
        gsap.set(underlineRef.current, {
          width: rect.width * 0.6,
          left: rect.left - listRect.left + rect.width * 0.2,
        });
      }
    },
    { scope: listRef },
  );

  return (
    <div
      ref={listRef}
      role="tablist"
      className={cn(
        "relative flex items-center gap-1 border-b border-line",
        className,
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          data-tab={tab.id}
          aria-selected={active === tab.id}
          onClick={(e) => {
            onChange(tab.id);
            moveUnderline(e.currentTarget);
          }}
          className={cn(
            "relative px-4 py-3 text-sm font-medium transition-colors duration-300",
            active === tab.id ? "text-primary" : "text-muted hover:text-fg",
          )}
        >
          {tab.label}
        </button>
      ))}
      <span
        ref={underlineRef}
        aria-hidden
        className="absolute bottom-0 h-0.5 rounded-full bg-primary shadow-[0_0_10px_1px_var(--glow)]"
      />
    </div>
  );
}
