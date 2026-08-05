import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert latin digits to Persian digits — ۰۱۲۳۴۵۶۷۸۹ */
export function faNum(value: number | string): string {
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  return String(value).replace(/\d/g, (d) => fa[Number(d)]);
}

/** Format a number with Persian thousands separators, e.g. ۲٬۵۰۰٬۰۰۰ */
export function faPrice(value: number): string {
  return faNum(new Intl.NumberFormat("en-US").format(value).replace(/,/g, "٬"));
}
