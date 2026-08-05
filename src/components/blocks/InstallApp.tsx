"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Download, Share, SquarePlus, X, Zap, WifiOff, BellRing } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { cn } from "@/lib/utils";

/* ============================================================
   Install surfaces — powered by useInstallPrompt():
   1. <InstallButton>  — persistent header utility icon
   2. <InstallBanner>  — smart engagement-gated glass banner
   Both open the native Chromium prompt, or the iOS fallback
   sheet with Persian "Share → Add to Home Screen" steps.
   ============================================================ */

const BENEFITS = [
  { icon: Zap, text: "باز شدن فوری، مثل اپ‌های بومی" },
  { icon: WifiOff, text: "دسترسی سریع حتی با اینترنت ضعیف" },
  { icon: BellRing, text: "همیشه یک لمس تا استادکارها فاصله داری" },
];

function IosGuideSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <BottomSheet open={open} onClose={onClose} title="نصب کاربان روی آیفون">
      <ol className="space-y-4 pb-2 text-sm text-fg-soft">
        <li className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent">
            <Share className="h-5 w-5" />
          </span>
          <span>
            در نوار پایین سافاری روی دکمه <b className="text-fg">اشتراک‌گذاری</b> بزن
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-accent/12 text-accent">
            <SquarePlus className="h-5 w-5" />
          </span>
          <span>
            گزینه <b className="text-fg">«Add to Home Screen»</b> را انتخاب کن
          </span>
        </li>
        <li className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-fg font-bold">
            ۳
          </span>
          <span>
            روی <b className="text-fg">افزودن</b> بزن — کاربان کنار بقیه اپ‌هایت نشسته!
          </span>
        </li>
      </ol>
    </BottomSheet>
  );
}

/** Header utility icon — low-pressure, always discoverable. */
export function InstallButton({ className }: { className?: string }) {
  const { canPrompt, isIosSafari, isInstalled, promptInstall } = useInstallPrompt();
  const [iosOpen, setIosOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { contextSafe } = useGSAP({ scope: btnRef });

  const onClick = contextSafe(async () => {
    setSeen(true);
    gsap.fromTo(
      btnRef.current,
      { scale: 0.88 },
      { scale: 1, duration: 0.55, ease: "elastic.out(1.2, 0.45)" },
    );
    if (canPrompt) await promptInstall();
    else if (isIosSafari) setIosOpen(true);
  });

  if (isInstalled || (!canPrompt && !isIosSafari)) return null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={onClick}
        aria-label="نصب اپلیکیشن کاربان"
        title="نصب اپلیکیشن"
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent hover:bg-accent/20",
          className,
        )}
      >
        <Download className="h-4.5 w-4.5" />
        {/* attention dot until first interaction */}
        {!seen && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
        )}
      </button>
      <IosGuideSheet open={iosOpen} onClose={() => setIosOpen(false)} />
    </>
  );
}

/** Smart banner — appears only after engagement (2nd route or 30s dwell),
    remembers dismissal for 14 days. */
export function InstallBanner() {
  const { canPrompt, isIosSafari, isInstalled, bannerDismissed, promptInstall, dismiss } =
    useInstallPrompt();
  const [engaged, setEngaged] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const views = useRef(0);
  const { contextSafe } = useGSAP({ scope: rootRef });

  // Engagement gate: 2nd page view OR 30s dwell — never on landing hit.
  useEffect(() => {
    views.current += 1;
    if (views.current >= 2) setEngaged(true);
  }, [pathname]);
  useEffect(() => {
    const t = setTimeout(() => setEngaged(true), 30_000);
    return () => clearTimeout(t);
  }, []);

  const visible =
    engaged && !isInstalled && !bannerDismissed && (canPrompt || isIosSafari);

  useGSAP(
    () => {
      if (!rootRef.current) return;
      if (visible) {
        gsap.fromTo(
          rootRef.current,
          { yPercent: 130, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.7, ease: "back.out(1.4)", delay: 0.4 },
        );
      }
    },
    { dependencies: [visible] },
  );

  const onInstall = contextSafe(async () => {
    if (canPrompt) {
      const accepted = await promptInstall();
      if (!accepted) dismiss();
    } else if (isIosSafari) {
      setIosOpen(true);
    }
  });

  const onDismiss = contextSafe(() => {
    gsap.to(rootRef.current, {
      yPercent: 130,
      opacity: 0,
      duration: 0.35,
      ease: "power3.in",
      onComplete: dismiss,
    });
  });

  if (!visible) return <IosGuideSheet open={iosOpen} onClose={() => setIosOpen(false)} />;

  return (
    <>
      <div
        ref={rootRef}
        role="complementary"
        aria-label="نصب اپلیکیشن"
        className="glass gpu fixed inset-x-3 z-[60] mx-auto max-w-md rounded-3xl p-4 shadow-[0_18px_50px_-12px_var(--shade-strong)] bottom-[calc(var(--bottom-nav-h)+1.25rem)] md:bottom-6"
      >
        <button
          onClick={onDismiss}
          aria-label="بستن پیشنهاد نصب"
          className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-wash hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="pl-8 text-[15px] font-bold text-fg">
          کاربان را روی گوشی‌ات داشته باش
        </p>
        <ul className="mt-2.5 space-y-1.5">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2 text-[13px] text-muted">
              <Icon className="h-3.5 w-3.5 shrink-0 text-accent" />
              {text}
            </li>
          ))}
        </ul>
        <div className="mt-3.5 flex items-center gap-2.5">
          <button
            onClick={onInstall}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary font-medium text-primary-fg shadow-[0_8px_24px_-8px_var(--glow)] hover:bg-primary-hover active:scale-95"
          >
            <Download className="h-4.5 w-4.5" />
            نصب رایگان
          </button>
          <button
            onClick={onDismiss}
            className="h-11 rounded-2xl px-4 text-sm text-muted hover:bg-wash"
          >
            بعداً
          </button>
        </div>
      </div>
      <IosGuideSheet open={iosOpen} onClose={() => setIosOpen(false)} />
    </>
  );
}
