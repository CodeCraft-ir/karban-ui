import { cn } from "@/lib/utils";

/**
 * Deterministic brand-duotone avatar — dummy-data friendly, no external
 * images. `hue` picks one of the brand recipes (yellow / blue mixes) so
 * avatars vary while staying strictly within the brand palette.
 */
const BRAND_GRADIENTS = [
  "linear-gradient(135deg, #0072b6, #064e7a)", // blue
  "linear-gradient(135deg, #f2cb1f, #a9880c)", // yellow
  "linear-gradient(135deg, #2e95e6, #0b4265)", // sky blue
  "linear-gradient(135deg, #d4ae0b, #775c14)", // deep yellow
  "linear-gradient(135deg, #005c94, #050b10)", // blue → black
  "linear-gradient(135deg, #f7db44, #8c6f11)", // bright yellow
];

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

  const idx = Math.abs(hue) % BRAND_GRADIENTS.length;
  const onYellow = idx % 2 === 1; // yellow recipes need black text

  return (
    <div
      className={cn(
        "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-bold",
        onYellow ? "text-black/85" : "text-white/90",
        className,
      )}
      style={{ background: BRAND_GRADIENTS[idx] }}
    >
      <span aria-hidden>{initials}</span>
      <span className="sr-only">{name}</span>
      {/* subtle top-light sheen */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" />
    </div>
  );
}
