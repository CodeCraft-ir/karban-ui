"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { PencilLine } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn, faNum } from "@/lib/utils";
import { buildOtpRequest, canResendCode, readVerificationChallenge, mapAuthError, otpSlots, parseAuthChallenge, parseAuthResult, type AuthChallengePresentation } from "@/lib/auth-ui";
import { useAuthSummary } from '@/components/layout/useAuthSummary';
import { createActionGate } from '@/lib/owner-client';
import { useAuthFlow } from "./AuthFlowContext";

const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R;

type ApiBody = { challenge?: unknown; error?: { code?: unknown } };

function asDigit(value: string): string {
  return value.replace(/[^0-9۰-۹]/gu, "").slice(-1);
}

function secondsUntil(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

function safeChallengeError(cause: unknown): string {
  return mapAuthError(503, cause instanceof Error ? cause.message : "auth_unavailable");
}

export function OtpForm() {
  const { phone, role, clearFlow } = useAuthFlow();
  const [challenge, setChallenge] = useState<AuthChallengePresentation | null>(null);
  const [digits, setDigits] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(60);
  const [pending, setPending] = useState(true);
  const [status, setStatus] = useState<"idle" | "error" | "success">("idle");
  const [error, setError] = useState("");
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const {refresh: refreshSummary} = useAuthSummary();
  const actionGate = useRef(createActionGate());
  useEffect(()=>{ const gate=actionGate.current; return ()=>gate.cancel(); },[]);
  const { contextSafe } = useGSAP({ scope: rootRef });

  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { gsap.set('.otp-box, .otp-el',{autoAlpha:1}); return; }
    gsap.fromTo(".otp-box", { y: 30, autoAlpha: 0, scale: 0.8 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.6, stagger: 0.07, ease: "back.out(1.8)" });
    gsap.fromTo(".otp-el", { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.09, ease: "power3.out" });
  }, { scope: rootRef, dependencies: [challenge?.codeLength] });

  const applyChallenge = useCallback((next: AuthChallengePresentation) => {
    setChallenge(next);
    setDigits(Array(next.codeLength).fill(""));
    const remaining = secondsUntil(next.expiresAt);
    setDurationSeconds(Math.max(1, remaining));
    setSeconds(remaining);
    setStatus("idle");
    setError("");
    inputsRef.current = [];
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setPending(true);
    readVerificationChallenge(fetch,controller.signal)
      .then(next=>{if(!controller.signal.aborted) applyChallenge(next);})
      .catch((cause: unknown) => {
        if(controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : mapAuthError(503,'auth_unavailable'));
      })
      .finally(() => {if(!controller.signal.aborted)setPending(false);});
    return () => controller.abort();
  }, [applyChallenge]);

  useEffect(() => {
    if (!challenge) return;
    const tick = () => setSeconds(secondsUntil(challenge.expiresAt));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  const shake = contextSafe(() => {
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    gsap.fromTo(".otp-row", { x: 0 }, { x: 10, duration: 0.07, repeat: 5, yoyo: true, ease: "power2.inOut", onComplete: () => gsap.set(".otp-row", { x: 0 }) });
  });

  const verify = async (code: string) => {
    if (!challenge || pending || code.length !== challenge.codeLength) return;
    const action=actionGate.current.begin();if(!action)return;
    setPending(true);
    setError("");
    setStatus("idle");
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" },
        body: JSON.stringify({ code }),
      });
      const body = await response.json().catch(() => null) as Record<string, unknown> | null;
      if(!action.current())return;
      if (!response.ok) {
        const apiError = body?.error as { code?: unknown } | undefined;
        setStatus("error");
        setError(mapAuthError(response.status, apiError?.code));
        shake();
        return;
      }
      const result = parseAuthResult(body);
      await refreshSummary();
      if(!action.current())return;
      setStatus("success");
      clearFlow();
      router.replace(result.onboardingTo??result.redirectTo);
      router.refresh();
    } catch (cause: unknown) {
      if(!action.current())return;
      setStatus("error");
      setError(cause instanceof Error && cause.message === "invalid_auth_result" ? "پاسخ ورود معتبر نیست." : mapAuthError(503, "auth_unavailable"));
      shake();
    } finally {
      if(action.current())setPending(false);
      action.finish();
    }
  };

  const setDigit = (index: number, value: string) => {
    if (!challenge || pending) return;
    const next = [...digits];
    next[index] = asDigit(value);
    setDigits(next);
    setStatus("idle");
    setError("");
    if (next[index] && index < next.length - 1) inputsRef.current[index + 1]?.focus();
    const code = next.join("");
    if (code.length === challenge.codeLength) void verify(code);
  };

  const onPaste = (event: React.ClipboardEvent) => {
    if (!challenge || pending) return;
    const text = event.clipboardData.getData("text").replace(/[^0-9۰-۹]/gu, "").slice(0, challenge.codeLength);
    if (!text) return;
    event.preventDefault();
    const next = Array(challenge.codeLength).fill("");
    text.split("").forEach((digit, index) => { next[index] = digit; });
    setDigits(next);
    inputsRef.current[Math.min(text.length, challenge.codeLength - 1)]?.focus();
    if (text.length === challenge.codeLength) void verify(text);
  };

  const resend = async () => {
    if (!canResendCode(phone,pending,seconds)) return;
    const action=actionGate.current.begin();if(!action)return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/request", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" },
        body: JSON.stringify(buildOtpRequest(phone, role)),
      });
      const body = await response.json().catch(() => null) as ApiBody | null;
      if(!action.current())return;
      if (!response.ok) {setError(mapAuthError(response.status,body?.error?.code));return;}
      if (!body?.challenge) throw new Error("invalid_challenge");
      applyChallenge(parseAuthChallenge(body.challenge));
    } catch (cause: unknown) {
      if(action.current())setError(safeChallengeError(cause));
    } finally {
      if(action.current())setPending(false);
      action.finish();
    }
  };

  const slots = challenge ? otpSlots(challenge.codeLength) : [];
  const progress = challenge ? Math.min(1, seconds / durationSeconds) : 0;

  return (
    <div ref={rootRef} className="mx-auto flex min-h-[70dvh] w-full max-w-sm flex-col justify-center px-6 py-10 text-center">
      <h1 className="otp-el text-2xl font-bold opacity-0">کد تایید را وارد کن</h1>
      <p className="otp-el mt-2.5 text-sm text-muted opacity-0">کد {challenge ? faNum(challenge.codeLength) : ""} رقمی ارسال شد <button type="button" onClick={() => router.push("/auth/login")} className="mr-1.5 inline-flex items-center gap-0.5 text-primary hover:text-accent"><PencilLine className="h-3 w-3" /> ویرایش</button></p>

      <div className="otp-row mt-9 flex justify-center gap-2" dir="ltr" onPaste={onPaste} aria-busy={pending}>
        {slots.map((index) => (
          <input key={index} ref={(element) => { inputsRef.current[index] = element; }} value={digits[index] ?? ""} autoFocus={index === 0} inputMode="numeric" maxLength={1} disabled={!challenge || pending} onChange={(event) => setDigit(index, event.target.value)} onKeyDown={(event) => { if (event.key === "Backspace" && !digits[index] && index > 0) inputsRef.current[index - 1]?.focus(); }} aria-label={`رقم ${faNum(index + 1)}`} className={cn("otp-box h-14 w-11 rounded-2xl border bg-elev text-center text-xl font-bold text-fg opacity-0 transition-colors duration-300 focus:outline-none sm:w-12", status === "error" ? "border-alert/80" : status === "success" ? "border-success" : "border-line focus:border-primary/80 focus:shadow-[0_0_0_4px_var(--glow-soft)]")} />
        ))}
      </div>
      {error && <p role="alert" className="mt-3 text-xs text-alert">{error}</p>}
      {status === "success" && <p className="mt-3 text-xs text-success">ورود با موفقیت انجام شد.</p>}
      {challenge?.isSimulated && <p className="mt-2 text-xs text-muted">حالت شبیه‌سازی فعال است؛ کد در پنل محلی نمایش داده نمی‌شود.</p>}

      <div className="otp-el mt-9 flex flex-col items-center gap-3 opacity-0">
        <div className="relative h-16 w-16"><svg viewBox="0 0 64 64" className="h-full w-full -rotate-90"><circle cx="32" cy="32" r={RING_R} fill="none" stroke="var(--elev-3)" strokeWidth="4" /><circle cx="32" cy="32" r={RING_R} fill="none" stroke={seconds > 10 ? "var(--primary)" : "var(--color-alert)"} strokeWidth="4" strokeLinecap="round" strokeDasharray={RING_C} strokeDashoffset={RING_C * (1 - progress)} className="transition-[stroke-dashoffset,stroke] duration-1000 ease-linear" /></svg><span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-fg-soft">{faNum(seconds)}</span></div>
        {!phone ? <p className="text-xs leading-6 text-muted">برای ارسال مجدد، <a className="text-accent underline" href="/auth/login">شماره را دوباره وارد کنید</a>. تایید همین کد به ورود دوباره شماره نیاز ندارد.</p> : seconds > 0 ? <p className="text-xs text-faint">تا دریافت مجدد کد</p> : <Button variant="outline" size="sm" onClick={() => void resend()} disabled={pending}>ارسال مجدد کد</Button>}
      </div>
    </div>
  );
}
