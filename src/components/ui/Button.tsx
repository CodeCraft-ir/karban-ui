"use client";

import { forwardRef, useRef, type ButtonHTMLAttributes } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-brand-500 text-ink-900 font-medium hover:bg-brand-400 shadow-[0_8px_24px_-8px_rgb(245_184_0/0.5)] hover:shadow-[0_12px_32px_-8px_rgb(245_184_0/0.65)]",
  secondary:
    "bg-ink-800 text-slate-100 hover:bg-ink-700 border border-ink-700/60",
  ghost: "bg-transparent text-slate-200 hover:bg-white/5",
  outline:
    "bg-transparent border border-brand-500/60 text-brand-400 hover:bg-brand-500/10",
  danger: "bg-alert/90 text-white hover:bg-alert",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm rounded-xl gap-1.5",
  md: "h-11 px-5 text-[15px] rounded-2xl gap-2",
  lg: "h-13 px-7 text-base rounded-2xl gap-2.5",
  icon: "h-11 w-11 rounded-2xl",
};

/**
 * Button with a satisfying GSAP tap spring:
 * press → scale 0.95, release → springs back with elastic overshoot.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ className, variant = "primary", size = "md", ...props }, ref) {
    const innerRef = useRef<HTMLButtonElement>(null);
    const { contextSafe } = useGSAP({ scope: innerRef });

    const press = contextSafe(() => {
      gsap.to(innerRef.current, { scale: 0.95, duration: 0.12, ease: "power2.out" });
    });
    const release = contextSafe(() => {
      gsap.to(innerRef.current, {
        scale: 1,
        duration: 0.55,
        ease: "elastic.out(1.1, 0.45)",
      });
    });

    return (
      <button
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        className={cn(
          "inline-flex select-none items-center justify-center whitespace-nowrap will-change-transform",
          "disabled:pointer-events-none disabled:opacity-45",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    );
  },
);
