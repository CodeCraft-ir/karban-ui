"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowLeft, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/brand/Logo";
import { faNum } from "@/lib/utils";

export function LoginForm() {
  const [phone, setPhone] = useState("");
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(".auth-logo", { scale: 0.5, autoAlpha: 0, rotate: -20 }, { scale: 1, autoAlpha: 1, rotate: 0, duration: 0.9, ease: "elastic.out(1, 0.5)" })
        .fromTo(".auth-el", { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, stagger: 0.09 }, "-=0.4");
    },
    { scope: rootRef },
  );

  const valid = /^09\d{9}$/.test(phone.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));

  return (
    <div
      ref={rootRef}
      className="mx-auto flex min-h-[70dvh] w-full max-w-sm flex-col justify-center px-6 py-10"
    >
      <LogoMark className="auth-logo mx-auto mb-7 h-16 w-16 text-primary opacity-0" />

      <h1 className="auth-el text-center text-2xl font-bold opacity-0">
        ورود به <span className="text-gold">کاربان</span>
      </h1>
      <p className="auth-el mt-2.5 text-center text-sm leading-relaxed text-muted opacity-0">
        شماره موبایلت را وارد کن؛ کد تایید برایت پیامک می‌شود
      </p>

      <form
        className="auth-el mt-9 opacity-0"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) router.push("/auth/verify");
        }}
      >
        <div className="group relative">
          <Smartphone className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted transition-colors group-focus-within:text-primary" />
          <input
            type="tel"
            inputMode="tel"
            dir="ltr"
            autoFocus
            maxLength={11}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/[^0-9۰-۹]/g, ""))}
            placeholder="0912 345 6789"
            aria-label="شماره موبایل"
            className="h-14 w-full rounded-2xl border border-line bg-elev pl-4 pr-12 text-center text-lg tracking-[0.15em] text-fg placeholder:text-faint placeholder:tracking-normal focus:border-primary/70 focus:shadow-[0_0_0_4px_var(--glow-soft)] focus:outline-none"
          />
        </div>

        <Button type="submit" size="lg" disabled={!valid} className="mt-5 w-full gap-2">
          دریافت کد تایید
          <ArrowLeft className="h-4.5 w-4.5" />
        </Button>
      </form>

      <p className="auth-el mt-6 text-center text-xs leading-relaxed text-faint opacity-0">
        با ورود، <button className="text-primary hover:text-accent">قوانین کاربان</button> را
        می‌پذیری. تعرفه پیامک: {faNum(0)} تومان
      </p>
    </div>
  );
}
