"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowLeft, HardHat, Smartphone, UserRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/brand/Logo";
import { cn, faNum } from "@/lib/utils";
import { buildOtpRequest, parseAuthChallenge, mapAuthError } from "@/lib/auth-ui";
import type { RegistrationRole } from "@/lib/contracts/auth";
import { useAuthFlow } from "./AuthFlowContext";
import {createActionGate} from "@/lib/owner-client";

const ROLES: Array<{ id: RegistrationRole; title: string; text: string; icon: typeof UserRound }> = [
  { id: "client", title: "کارفرما هستم", text: "پروژه دارم و دنبال متخصص مطمئن می‌گردم", icon: UserRound },
  { id: "specialist", title: "متخصص ساختمانی هستم", text: "مهارت دارم و دنبال پروژه و مشتری جدیدم", icon: HardHat },
];

function asDigits(value: string): string {
  return value.replace(/[۰-۹]/gu, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
}

export function LoginForm() {
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<RegistrationRole>("client");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [challengeNotice, setChallengeNotice] = useState<{ codeLength: 5 | 6; isSimulated: boolean } | null>(null);
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const { setFlow } = useAuthFlow();
  const gate=useRef(createActionGate());
  useEffect(()=>{const g=gate.current;return ()=>g.cancel();},[]);

  useGSAP(() => {
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){gsap.set(".auth-logo,.auth-el",{autoAlpha:1});return;}
    gsap
      .timeline({ defaults: { ease: "power3.out" } })
      .fromTo(".auth-logo", { scale: 0.5, autoAlpha: 0, rotate: -20 }, { scale: 1, autoAlpha: 1, rotate: 0, duration: 0.9, ease: "elastic.out(1, 0.5)" })
      .fromTo(".auth-el", { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.09 }, "-=0.4");
  }, { scope: rootRef });

  const valid = /^09\d{9}$/.test(asDigits(phone));
  const requestCode = async () => {
    if (!valid || pending) return;
    const action=gate.current.begin();if(!action)return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/auth/request", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" },
        body: JSON.stringify(buildOtpRequest(phone, role)),
      });
      const body = await response.json().catch(() => null) as { challenge?: unknown; error?: { code?: unknown } } | null;
      if(!action.current())return;
      if (!response.ok || !body?.challenge) {
        setError(mapAuthError(response.status, body?.error?.code));
        return;
      }
      const challenge = parseAuthChallenge(body.challenge);
      setFlow(phone, role);
      setChallengeNotice({ codeLength: challenge.codeLength, isSimulated: challenge.isSimulated });
      router.push("/auth/verify");
    } catch {
      if(action.current())setError(mapAuthError(503, "auth_unavailable"));
    } finally {
      if(action.current())setPending(false);
      action.finish();
    }
  };

  return (
    <div ref={rootRef} className="mx-auto flex min-h-[70dvh] w-full max-w-sm flex-col justify-center px-6 py-10">
      <LogoMark className="auth-logo mx-auto mb-7 h-16 w-16 text-primary opacity-0" />
      <h1 className="auth-el text-center text-2xl font-bold opacity-0">ورود به <span className="text-gold">کاربان</span></h1>
      <p className="auth-el mt-2.5 text-center text-sm leading-relaxed text-muted opacity-0">شماره موبایلت را وارد کن؛ کد تایید برایت ارسال می‌شود</p>

      <div className="auth-el mt-7 grid gap-2 opacity-0" role="radiogroup" aria-label="نقش حساب">
        {ROLES.map(({ id, title, text, icon: Icon }) => (
          <button
            key={id}
            type="button"
            disabled={pending}
            role="radio"
            aria-checked={role === id}
            onClick={() => setRole(id)}
            className={cn("flex items-center gap-3 rounded-2xl border p-3 text-right transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary", role === id ? "border-primary/70 bg-primary/10" : "border-line bg-elev hover:border-primary/40")}
          >
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", role === id ? "bg-primary text-primary-fg" : "bg-wash text-muted")}><Icon className="h-5 w-5" /></span>
            <span><span className="block text-sm font-bold text-fg">{title}</span><span className="mt-0.5 block text-xs text-muted">{text}</span></span>
          </button>
        ))}
      </div>

      <form className="auth-el mt-5 opacity-0" onSubmit={(event) => { event.preventDefault(); void requestCode(); }}>
        <div className="group relative">
          <Smartphone className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary" />
          <input disabled={pending} type="tel" inputMode="tel" dir="ltr" autoFocus maxLength={11} value={phone} onChange={(event) => { setPhone(event.target.value.replace(/[^0-9۰-۹]/gu, "")); setError(""); }} placeholder="09xx xxx xxxx" aria-label="شماره موبایل" className="h-14 w-full rounded-2xl border border-line bg-elev pl-4 pr-12 text-center text-lg tracking-[0.15em] text-fg placeholder:text-faint placeholder:tracking-normal focus:border-primary/70 focus:shadow-[0_0_0_4px_var(--glow-soft)] focus:outline-none" />
        </div>
        <Button type="submit" size="lg" disabled={!valid || pending} className="mt-5 w-full gap-2">
          {pending ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-fg/40 border-t-primary-fg" /> در حال ارسال...</> : <>دریافت کد تایید <ArrowLeft className="h-4.5 w-4.5" /></>}
        </Button>
      </form>
      {error && <p role="alert" className="mt-3 text-center text-xs text-alert">{error}</p>}
      {challengeNotice && <p className="mt-3 text-center text-xs text-muted">کد {faNum(challengeNotice.codeLength)} رقمی آماده شد{challengeNotice.isSimulated ? " (حالت شبیه‌سازی)" : ""}</p>}
      <p className="auth-el mt-6 text-center text-xs leading-relaxed text-faint opacity-0">با ورود، <button type="button" className="text-primary hover:text-accent">قوانین کاربان</button> را می‌پذیری.</p>
    </div>
  );
}
