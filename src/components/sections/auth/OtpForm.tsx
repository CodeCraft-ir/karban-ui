"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { PencilLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, faNum } from "@/lib/utils";

const OTP_LENGTH = 5;
const COUNTDOWN = 60;
const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R;

/**
 * OTP verification — 5 boxes with auto-focus advance, paste support,
 * shake on wrong code, and an SVG countdown circle that drains over 60s.
 */
export function OtpForm() {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [seconds, setSeconds] = useState(COUNTDOWN);
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { contextSafe } = useGSAP({ scope: rootRef });

  useGSAP(
    () => {
      gsap.fromTo(
        ".otp-box",
        { y: 30, autoAlpha: 0, scale: 0.8 },
        { y: 0, autoAlpha: 1, scale: 1, duration: 0.6, stagger: 0.07, ease: "back.out(1.8)" },
      );
      gsap.fromTo(
        ".otp-el",
        { y: 20, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.09, ease: "power3.out" },
      );
    },
    { scope: rootRef },
  );

  // countdown
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [seconds]);

  const verify = contextSafe((code: string) => {
    // dummy: 12345 is the "right" code
    if (code === "12345") {
      setStatus("success");
      gsap.to(".otp-box", {
        borderColor: "#10b981",
        scale: 1.06,
        stagger: 0.05,
        duration: 0.25,
        yoyo: true,
        repeat: 1,
      });
      setTimeout(() => router.push("/auth/select-role"), 700);
    } else {
      setStatus("error");
      gsap.fromTo(
        ".otp-row",
        { x: 0 },
        { x: 10, duration: 0.07, repeat: 5, yoyo: true, ease: "power2.inOut", onComplete: () => gsap.set(".otp-row", { x: 0 }) },
      );
    }
  });

  const setDigit = (i: number, val: string) => {
    const v = val.replace(/[^0-9۰-۹]/g, "").slice(-1);
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    setStatus("idle");
    if (v && i < OTP_LENGTH - 1) inputsRef.current[i + 1]?.focus();
    const code = next.join("");
    if (code.length === OTP_LENGTH) verify(code);
  };

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus();
    }
  };

  const onPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!text) return;
    e.preventDefault();
    const next = Array(OTP_LENGTH).fill("");
    text.split("").forEach((d, i) => (next[i] = d));
    setDigits(next);
    inputsRef.current[Math.min(text.length, OTP_LENGTH - 1)]?.focus();
    if (text.length === OTP_LENGTH) verify(text);
  };

  const progress = seconds / COUNTDOWN;

  return (
    <div
      ref={rootRef}
      className="mx-auto flex min-h-[70dvh] w-full max-w-sm flex-col justify-center px-6 py-10 text-center"
    >
      <h1 className="otp-el text-2xl font-bold opacity-0">کد تایید را وارد کن</h1>
      <p className="otp-el mt-2.5 text-sm text-muted opacity-0">
        کد {faNum(5)} رقمی به شماره{" "}
        <span className="font-bold text-fg-soft" dir="ltr">
          ۰۹۱۲ ۳۴۵ ۶۷۸۹
        </span>{" "}
        پیامک شد
        <button className="mr-1.5 inline-flex items-center gap-0.5 text-primary hover:text-accent">
          <PencilLine className="h-3 w-3" />
          ویرایش
        </button>
      </p>

      {/* OTP boxes — visually LTR so digits read naturally */}
      <div className="otp-row mt-9 flex justify-center gap-2.5" dir="ltr" onPaste={onPaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            value={d}
            autoFocus={i === 0}
            inputMode="numeric"
            maxLength={2}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            aria-label={`رقم ${faNum(i + 1)}`}
            className={cn(
              "otp-box h-14 w-12 rounded-2xl border bg-elev text-center text-xl font-bold text-fg opacity-0 transition-colors duration-300 focus:outline-none",
              status === "error"
                ? "border-alert/80"
                : status === "success"
                  ? "border-success"
                  : "border-line focus:border-primary/80 focus:shadow-[0_0_0_4px_var(--glow-soft)]",
            )}
          />
        ))}
      </div>
      {status === "error" && (
        <p className="mt-3 text-xs text-alert">کد وارد شده صحیح نیست — راهنمایی: ۱۲۳۴۵</p>
      )}

      {/* Countdown circle */}
      <div className="otp-el mt-9 flex flex-col items-center gap-3 opacity-0">
        <div className="relative h-16 w-16">
          <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
            <circle cx="32" cy="32" r={RING_R} fill="none" stroke="var(--elev-3)" strokeWidth="4" />
            <circle
              cx="32"
              cy="32"
              r={RING_R}
              fill="none"
              stroke={seconds > 10 ? "var(--primary)" : "var(--color-alert)"}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - progress)}
              className="transition-[stroke-dashoffset,stroke] duration-1000 ease-linear"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-fg-soft">
            {faNum(seconds)}
          </span>
        </div>

        {seconds > 0 ? (
          <p className="text-xs text-faint">تا دریافت مجدد کد</p>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setSeconds(COUNTDOWN)}>
            ارسال مجدد کد
          </Button>
        )}
      </div>
    </div>
  );
}
