import { cn } from "@/lib/utils";

/**
 * Deterministic gradient avatar — dummy-data friendly, no external images.
 * `hue` drives a unique two-stop gradient per specialist.
 */
export function Avatar({
  name,
  hue = 45,
  className,
}: {
  name: string;
  hue?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("‌");

  return (
    <div
      className={cn(
        "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-bold text-white/90",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 65% 42%), hsl(${(hue + 40) % 360} 70% 28%))`,
      }}
    >
      <span aria-hidden>{initials}</span>
      <span className="sr-only">{name}</span>
      {/* subtle top-light sheen */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" />
    </div>
  );
}
