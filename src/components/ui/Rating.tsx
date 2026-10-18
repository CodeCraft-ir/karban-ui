import { Star } from "lucide-react";
import { cn, faNum } from "@/lib/utils";

export function Rating({
  value,
  count,
  className,
}: {
  value: number | null;
  count?: number;
  className?: string;
}) {
  if (value === null || count === undefined || count <= 0) return null;

  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Star className="h-4 w-4 fill-primary text-primary" />
      <span className="text-sm font-medium text-fg">{faNum(value.toFixed(1))}</span>
      <span className="text-xs text-muted">({faNum(count)} نظر)</span>
    </span>
  );
}
