import { cn } from "@/lib/utils";

const BRAND_GRADIENTS = [
  "linear-gradient(135deg, #0072b6, #064e7a)",
  "linear-gradient(135deg, #f2cb1f, #a9880c)",
  "linear-gradient(135deg, #2e95e6, #0b4265)",
  "linear-gradient(135deg, #d4ae0b, #775c14)",
  "linear-gradient(135deg, #005c94, #050b10)",
  "linear-gradient(135deg, #f7db44, #8c6f11)",
];

/** Public avatars use the safe normalized URL when available, with initials as fallback. */
export function Avatar({
  name,
  src,
  hue = 45,
  className,
}: {
  name: string;
  src?: string | null;
  hue?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("‌");
  const index = Math.abs(hue) % BRAND_GRADIENTS.length;
  const onYellow = index % 2 === 1;

  return (
    <div
      className={cn(
        "relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl text-lg font-bold",
        onYellow ? "text-black/85" : "text-white/90",
        className,
      )}
      style={{ background: BRAND_GRADIENTS[index] }}
    >
      {src ? (
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{initials}</span>
      )}
      <span className="sr-only">{name}</span>
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" />
    </div>
  );
}
