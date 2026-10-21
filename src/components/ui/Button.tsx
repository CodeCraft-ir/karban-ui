"use client";

import { forwardRef, useRef, type ButtonHTMLAttributes } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {tapFeedback} from '@/lib/tap-feedback';
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "accent" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-fg font-medium hover:bg-primary-hover shadow-[0_8px_24px_-8px_var(--glow)] hover:shadow-[0_12px_32px_-8px_var(--glow)]",
  secondary:
    "bg-elev-2 text-fg hover:bg-elev-3 border border-line",
  /* Brand blue — secondary CTAs, informational actions */
  accent:
    "bg-accent text-accent-fg font-medium hover:bg-accent-strong",
  ghost: "bg-transparent text-fg-soft hover:bg-wash",
  /* Blue outline — yellow text on white fails contrast, blue passes AA */
  outline:
    "bg-transparent border border-accent/60 text-accent hover:bg-accent/10",
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
      gsap.to(innerRef.current, tapFeedback(window.matchMedia('(prefers-reduced-motion: reduce)').matches,true));
    });
    const release = contextSafe(() => {
      gsap.to(innerRef.current, tapFeedback(window.matchMedia('(prefers-reduced-motion: reduce)').matches,false));
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
