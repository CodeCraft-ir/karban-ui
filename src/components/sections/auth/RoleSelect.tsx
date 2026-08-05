"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ArrowLeft, HardHat, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLES = [
  {
    id: "client",
    icon: UserRound,
    title: "کارفرما هستم",
    text: "پروژه دارم و دنبال استادکار مطمئن می‌گردم",
    href: "/dashboard",
    accent: "from-azure-500/25",
    glow: "56, 150, 255",
  },
  {
    id: "pro",
    icon: HardHat,
    title: "متخصص ساختمانی هستم",
    text: "مهارت دارم و دنبال پروژه و مشتری جدیدم",
    href: "/pro",
    accent: "from-primary/30",
    glow: "245, 184, 0",
  },
] as const;

/**
 * Role selection — the "aha" moment.
 * Cards tilt in 3D toward the pointer (perspective transform driven by
 * GSAP), a golden border-glow follows the cursor, and tap fires a
 * squash-and-launch into the chosen dashboard.
 */
export function RoleSelect() {
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { contextSafe } = useGSAP({ scope: rootRef });

  useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .fromTo(".role-title", { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7 })
        .fromTo(
          ".role-card",
          { y: 70, autoAlpha: 0, rotateX: -14 },
          { y: 0, autoAlpha: 1, rotateX: 0, duration: 0.9, stagger: 0.14, ease: "back.out(1.5)" },
          "-=0.35",
        );
    },
    { scope: rootRef },
  );

  const tilt = contextSafe((e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType !== "mouse") return;
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    gsap.to(card, {
      rotateY: (px - 0.5) * -14,
      rotateX: (py - 0.5) * 10,
      duration: 0.45,
      ease: "power2.out",
      transformPerspective: 900,
    });
    card.style.setProperty("--mx", `${px * 100}%`);
    card.style.setProperty("--my", `${py * 100}%`);
  });

  const untilt = contextSafe((e: React.PointerEvent<HTMLButtonElement>) => {
    gsap.to(e.currentTarget, {
      rotateX: 0,
      rotateY: 0,
      duration: 0.8,
      ease: "elastic.out(1, 0.4)",
    });
  });

  const choose = contextSafe((e: React.PointerEvent<HTMLButtonElement>, href: string) => {
    const card = e.currentTarget;
    gsap
      .timeline({ onComplete: () => router.push(href) })
      .to(card, { scale: 0.94, duration: 0.12, ease: "power2.out" })
      .to(card, { scale: 1.04, autoAlpha: 0.9, duration: 0.28, ease: "back.out(2)" });
  });

  return (
    <div
      ref={rootRef}
      className="mx-auto flex min-h-[75dvh] w-full max-w-2xl flex-col justify-center px-5 py-10"
      style={{ perspective: "1000px" }}
    >
      <div className="role-title text-center opacity-0">
        <h1 className="text-2xl font-bold sm:text-3xl">
          خوش آمدی! <span className="text-gold">نقش تو</span> در کاربان چیست؟
        </h1>
        <p className="mt-3 text-sm text-muted">
          بعداً می‌توانی از تنظیمات، نقش دیگری هم اضافه کنی
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5">
        {ROLES.map(({ id, icon: Icon, title, text, href, accent, glow }) => (
          <button
            key={id}
            onPointerMove={tilt}
            onPointerLeave={untilt}
            onPointerUp={(e) => choose(e, href)}
            className={cn(
              "role-card gpu group relative overflow-hidden rounded-4xl border border-line p-7 text-right opacity-0 will-change-transform",
              "bg-gradient-to-b to-card",
              accent,
              "hover:border-transparent",
            )}
            style={
              {
                "--mx": "50%",
                "--my": "50%",
              } as React.CSSProperties
            }
          >
            {/* cursor-following border glow */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                background: `radial-gradient(240px circle at var(--mx) var(--my), rgb(${glow} / 0.22), transparent 65%)`,
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-4xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{
                padding: "1.5px",
                background: `radial-gradient(200px circle at var(--mx) var(--my), rgb(${glow} / 0.75), transparent 70%)`,
                WebkitMask:
                  "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
              }}
            />

            <span className="relative z-10 mb-14 flex h-16 w-16 items-center justify-center rounded-3xl bg-wash text-primary transition-all duration-500 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-fg group-hover:shadow-[0_14px_34px_-8px_var(--glow)] sm:mb-20">
              <Icon className="h-8 w-8" />
            </span>

            <span className="relative z-10 block text-xl font-bold text-fg">
              {title}
            </span>
            <span className="relative z-10 mt-2 block text-sm leading-relaxed text-muted">
              {text}
            </span>

            <span className="relative z-10 mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
              ادامه
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
