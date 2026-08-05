import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} aria-hidden />;
}

/** Full specialist-card shaped skeleton for initial loading states. */
export function SpecialistCardSkeleton() {
  return (
    <div className="rounded-3xl border border-ink-700/40 bg-ink-900/70 p-4">
      <div className="flex items-start gap-3.5">
        <Skeleton className="h-16 w-16 shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-2.5 pt-1">
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-4 flex gap-2.5">
        <Skeleton className="h-10 flex-1 rounded-2xl" />
        <Skeleton className="h-10 w-24 rounded-2xl" />
      </div>
    </div>
  );
}
