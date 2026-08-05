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
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          {label}
        </label>
      )}
      <div className="group relative">
        {icon && (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-400">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          className={cn(
            "h-12 w-full rounded-2xl border border-ink-700/70 bg-ink-800/60 px-4 text-[15px] text-slate-100",
            "placeholder:text-slate-500 transition-all duration-300",
            "focus:border-brand-500/70 focus:bg-ink-800 focus:shadow-[0_0_0_4px_rgb(245_184_0/0.12)] focus:outline-none",
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
