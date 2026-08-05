"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  PenLine,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { CATEGORIES } from "@/lib/data";
import { cn, faNum, faPrice } from "@/lib/utils";

const STEPS = [
  { id: 0, title: "عنوان پروژه", icon: PenLine },
  { id: 1, title: "موقعیت مکانی", icon: MapPin },
  { id: 2, title: "بودجه", icon: Wallet },
  { id: 3, title: "تصاویر", icon: Camera },
] as const;

const BUDGET_PRESETS = [5_000_000, 15_000_000, 30_000_000, 50_000_000, 100_000_000];

/**
 * Post Project Wizard — full-screen modal; steps slide horizontally
 * with GSAP (no reloads), progress dots morph, and the final step
 * celebrates with a springy check.
 */
export function ProjectWizard({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [budget, setBudget] = useState(BUDGET_PRESETS[1]);
  const [pin, setPin] = useState({ x: 50, y: 45 });
  const [canPortal, setCanPortal] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: rootRef });

  useEffect(() => setCanPortal(true), []);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      if (open) {
        gsap.set(root, { display: "flex" });
        gsap.fromTo(root, { opacity: 0 }, { opacity: 1, duration: 0.3 });
        gsap.fromTo(
          ".wizard-panel",
          { y: 60, scale: 0.95, autoAlpha: 0 },
          { y: 0, scale: 1, autoAlpha: 1, duration: 0.6, ease: "back.out(1.3)" },
        );
      } else {
        gsap.to(root, {
          opacity: 0,
          duration: 0.25,
          onComplete: () => {
            gsap.set(root, { display: "none" });
            setStep(0);
            setDone(false);
          },
        });
      }
    },
    { dependencies: [open] },
  );

  /** slide the steps track; RTL layout → step N sits at x = +N*100% */
  const goTo = contextSafe((next: number) => {
    if (next < 0 || next >= STEPS.length) return;
    setStep(next);
    gsap.to(trackRef.current, {
      xPercent: next * 100,
      duration: 0.65,
      ease: "power4.inOut",
    });
  });

  const finish = contextSafe(() => {
    setDone(true);
    gsap.fromTo(
      ".wizard-done",
      { scale: 0.4, autoAlpha: 0 },
      { scale: 1, autoAlpha: 1, duration: 0.8, ease: "elastic.out(1, 0.45)", delay: 0.1 },
    );
  });

  // Portal only after mount — SSR HTML must match first client render.
  if (!canPortal) return null;

  return createPortal(
    <div
      ref={rootRef}
      className="fixed inset-0 z-[70] hidden items-end justify-center bg-(--backdrop) backdrop-blur-md sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="ثبت پروژه جدید"
    >
      <div className="wizard-panel relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-4xl border border-line bg-card sm:rounded-4xl">
        {/* header */}
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 className="text-lg font-bold">
            {done ? "ثبت شد!" : "ثبت پروژه جدید"}
          </h2>
          <button
            onClick={onClose}
            aria-label="بستن"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-elev-2 text-muted hover:bg-elev-3 hover:text-fg"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {done ? (
          <div className="wizard-done flex flex-col items-center px-6 py-14 text-center">
            <span className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-10 w-10" strokeWidth={3} />
            </span>
            <h3 className="text-xl font-bold">پروژه‌ات ثبت شد</h3>
            <p className="mt-2.5 max-w-xs text-sm leading-relaxed text-muted">
              به‌زودی متخصصان واجد شرایط محله‌ات پیشنهادشان را برایت ارسال می‌کنند.
            </p>
            <Button className="mt-7 px-10" onClick={onClose}>
              عالیه!
            </Button>
          </div>
        ) : (
          <>
            {/* progress */}
            <div className="flex items-center justify-center gap-2 px-5 pt-5">
              {STEPS.map((s, i) => (
                <div key={s.id} className="flex items-center gap-2">
                  <button
                    onClick={() => i < step && goTo(i)}
                    aria-label={s.title}
                    aria-current={i === step ? "step" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all duration-400",
                      i === step
                        ? "bg-primary text-primary-fg shadow-[0_6px_16px_-4px_var(--glow)]"
                        : i < step
                          ? "bg-success/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-elev-2 text-faint",
                    )}
                  >
                    {i < step ? <Check className="h-3.5 w-3.5" /> : <s.icon className="h-3.5 w-3.5" />}
                    <span className={cn(i !== step && "hidden sm:inline")}>{s.title}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <span
                      className={cn(
                        "h-0.5 w-4 rounded-full transition-colors duration-400",
                        i < step ? "bg-success/50" : "bg-elev-3",
                      )}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* sliding steps track */}
            <div className="flex-1 overflow-hidden">
              <div ref={trackRef} className="flex h-full">
                {/* Step 1 — Title */}
                <div className="w-full shrink-0 space-y-4 px-6 py-7">
                  <Input
                    id="pw-title"
                    label="عنوان پروژه"
                    placeholder="مثلا: برق‌کشی واحد ۱۰۰ متری"
                    icon={<PenLine className="h-4 w-4" />}
                  />
                  <div>
                    <label className="mb-2 block text-sm font-medium text-fg-soft">
                      دسته‌بندی
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.slice(0, 6).map((c, i) => (
                        <button
                          key={c.id}
                          className={cn(
                            "rounded-full border px-3.5 py-1.5 text-[13px] transition-all",
                            i === 0
                              ? "border-primary/60 bg-primary/12 text-primary"
                              : "border-line bg-elev text-muted hover:border-primary/40",
                          )}
                        >
                          {c.title}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="توضیحات بیشتر پروژه (اختیاری)..."
                    className="w-full rounded-2xl border border-line bg-elev p-4 text-[15px] text-fg placeholder:text-faint focus:border-primary/70 focus:outline-none"
                  />
                </div>

                {/* Step 2 — Location pinning */}
                <div className="w-full shrink-0 px-6 py-7">
                  <p className="mb-3 text-sm text-muted">
                    روی نقشه ضربه بزن تا محل پروژه مشخص شود
                  </p>
                  <div
                    className="relative h-56 cursor-crosshair overflow-hidden rounded-3xl border border-line"
                    style={{
                      background:
                        "radial-gradient(80% 80% at 30% 20%, #1c2a44, #0f172a)",
                    }}
                    onClick={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      setPin({
                        x: ((e.clientX - r.left) / r.width) * 100,
                        y: ((e.clientY - r.top) / r.height) * 100,
                      });
                    }}
                  >
                    {/* fake streets */}
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-15"
                      style={{
                        backgroundImage:
                          "linear-gradient(0deg, #64748b 1.5px, transparent 1.5px), linear-gradient(90deg, #64748b 1.5px, transparent 1.5px), linear-gradient(45deg, transparent 48%, #64748b 49%, #64748b 51%, transparent 52%)",
                        backgroundSize: "56px 56px, 72px 72px, 120px 120px",
                      }}
                    />
                    {/* pin */}
                    <span
                      className="absolute z-10 -translate-x-1/2 -translate-y-full transition-all duration-300 ease-out"
                      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    >
                      <MapPin className="h-9 w-9 fill-primary/25 text-primary drop-shadow-[0_4px_8px_var(--glow)]" />
                      <span className="absolute -bottom-0.5 left-1/2 h-1.5 w-4 -translate-x-1/2 rounded-[100%] bg-ink-950/60 blur-[2px]" />
                    </span>
                    <span className="absolute bottom-3 right-3 rounded-xl bg-(--backdrop) px-3 py-1.5 text-xs text-fg-soft backdrop-blur">
                      تهران، سعادت‌آباد
                    </span>
                  </div>
                </div>

                {/* Step 3 — Budget */}
                <div className="w-full shrink-0 px-6 py-7">
                  <p className="mb-5 text-sm text-muted">بودجه حدودی پروژه‌ات چقدر است؟</p>
                  <div className="mb-6 text-center">
                    <span className="text-3xl font-bold text-gold">{faPrice(budget)}</span>
                    <span className="mr-2 text-sm text-muted">تومان</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {BUDGET_PRESETS.map((b) => (
                      <button
                        key={b}
                        onClick={() => setBudget(b)}
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-sm transition-all",
                          budget === b
                            ? "border-primary/60 bg-primary/12 font-bold text-primary"
                            : "border-line bg-elev text-muted hover:border-primary/30",
                        )}
                      >
                        {faPrice(b)}
                      </button>
                    ))}
                    <button className="rounded-2xl border border-dashed border-line px-3 py-3 text-sm text-faint hover:border-primary/40 hover:text-primary">
                      مبلغ دلخواه
                    </button>
                  </div>
                </div>

                {/* Step 4 — Photos */}
                <div className="w-full shrink-0 px-6 py-7">
                  <p className="mb-4 text-sm text-muted">
                    عکس از محل کار به متخصص کمک می‌کند قیمت دقیق‌تری بدهد
                  </p>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10">
                      <Camera className="h-6 w-6" />
                      <span className="text-xs">افزودن عکس</span>
                    </button>
                    {[38, 220].map((h) => (
                      <div
                        key={h}
                        className="aspect-square rounded-2xl border border-line"
                        style={{
                          background: `linear-gradient(140deg, hsl(${h} 35% 26%), hsl(${h + 40} 40% 15%))`,
                        }}
                      />
                    ))}
                  </div>
                  <p className="mt-4 text-xs text-faint">
                    حداکثر {faNum(6)} تصویر — فرمت JPG یا PNG
                  </p>
                </div>
              </div>
            </div>

            {/* footer nav */}
            <div className="flex gap-2.5 border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {step > 0 && (
                <Button variant="secondary" onClick={() => goTo(step - 1)} className="gap-1 px-5">
                  <ChevronRight className="h-4 w-4" />
                  قبلی
                </Button>
              )}
              <Button
                className="flex-1 gap-1"
                onClick={() => (step === STEPS.length - 1 ? finish() : goTo(step + 1))}
              >
                {step === STEPS.length - 1 ? "ثبت نهایی پروژه" : "مرحله بعد"}
                {step < STEPS.length - 1 && <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
