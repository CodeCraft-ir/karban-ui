"use client";

import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PublicDataError({
  title = "بارگذاری اطلاعات ممکن نشد",
  description = "ارتباط با اطلاعات عمومی کاربان برقرار نشد. دوباره تلاش کنید.",
}: {
  title?: string;
  description?: string;
}) {
  const router = useRouter();

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6" aria-live="polite">
      <div className="rounded-3xl border border-line bg-card p-6 text-center sm:p-8">
        <h2 className="text-lg font-bold text-fg">{title}</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
          {description}
        </p>
        <Button
          type="button"
          variant="secondary"
          className="mt-5 gap-2"
          onClick={() => router.refresh()}
        >
          <RefreshCw className="h-4 w-4" />
          تلاش دوباره
        </Button>
      </div>
    </section>
  );
}

export function PublicDataEmpty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-3xl border border-dashed border-line bg-card p-8 text-center" aria-live="polite">
      <h2 className="text-lg font-bold text-fg">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">{description}</p>
    </section>
  );
}
