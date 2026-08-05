import { Star } from "lucide-react";
import { cn, faNum } from "@/lib/utils";

export function Rating({
  value,
  count,
  className,
}: {
  value: number;
  count?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Star className="h-4 w-4 fill-brand-500 text-brand-500" />
      <span className="text-sm font-medium text-slate-100">
        {faNum(value.toFixed(1))}
      </span>
      {count !== undefined && (
        <span className="text-xs text-slate-400">({faNum(count)} نظر)</span>
      )}
    </span>
  );
}
