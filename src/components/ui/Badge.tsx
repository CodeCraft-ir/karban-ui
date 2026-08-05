import { type ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/data";

type Tone = "brand" | "success" | "alert" | "warn" | "neutral" | "info";

const tones: Record<Tone, string> = {
  brand: "bg-brand-500/15 text-brand-400 border-brand-500/25",
  success: "bg-success/15 text-emerald-400 border-success/25",
  alert: "bg-alert/15 text-red-400 border-alert/25",
  warn: "bg-warn/15 text-amber-400 border-warn/25",
  neutral: "bg-slate-500/15 text-slate-300 border-slate-500/25",
  info: "bg-sky-500/15 text-sky-400 border-sky-500/25",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const statusTone: Record<ProjectStatus, Tone> = {
  "در انتظار": "warn",
  "در حال انجام": "info",
  "تکمیل شده": "success",
  "لغو شده": "alert",
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={statusTone[status]}>{status}</Badge>;
}

/** Golden verified checkmark — the trust anchor of Karban. */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-brand-400",
        className,
      )}
      title="هویت تایید شده"
    >
      <BadgeCheck className="h-4.5 w-4.5 fill-brand-500/20" />
      <span className="sr-only">هویت تایید شده</span>
    </span>
  );
}
