"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, icon, error, id, ...props },
  ref,
) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-2 block text-sm font-medium text-fg-soft"
        >
          {label}
        </label>
      )}
      <div className="group relative">
        {icon && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted transition-colors group-focus-within:text-accent">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "h-12 w-full rounded-2xl border border-line bg-elev px-4 text-[15px] text-fg",
            "placeholder:text-faint transition-all duration-300",
            "focus:border-accent/70 focus:bg-elev-2 focus:shadow-[0_0_0_4px_var(--accent-glow)] focus:outline-none",
            icon && "pr-11",
            error && "border-alert/70",
            className,
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-alert">{error}</p>}
    </div>
  );
});
