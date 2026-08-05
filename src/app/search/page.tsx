import type { Metadata } from "next";
import { SlidersHorizontal } from "lucide-react";
import { SpecialistList } from "@/components/sections/SpecialistList";
import { Badge } from "@/components/ui/Badge";
import { SPECIALISTS, CATEGORIES } from "@/lib/data";
import { faNum } from "@/lib/utils";

export const metadata: Metadata = { title: "جستجوی متخصص" };

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="px-4 pt-6 sm:px-6">
        <h1 className="text-2xl font-bold">جستجوی متخصص</h1>
        <p className="mt-1.5 text-sm text-muted">
          {faNum(SPECIALISTS.length)} متخصص در نزدیکی تو پیدا شد
        </p>

        {/* filter chips row */}
        <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          <button className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-4 text-sm text-primary">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            فیلترها
          </button>
          {CATEGORIES.slice(0, 8).map((c) => (
            <button
              key={c.id}
              className="h-9 shrink-0 rounded-full border border-line bg-elev px-4 text-sm text-fg-soft hover:border-primary/40 hover:text-primary"
            >
              {c.title}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-faint">
          مرتب‌سازی:
          <Badge tone="brand">نزدیک‌ترین</Badge>
          <Badge tone="neutral">بالاترین امتیاز</Badge>
          <Badge tone="neutral">بیشترین نظر</Badge>
        </div>
      </div>

      <SpecialistList specialists={SPECIALISTS} />
    </div>
  );
}
