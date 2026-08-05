import Link from "next/link";
import { ArrowLeft, ShieldCheck, Wallet2, Zap } from "lucide-react";
import { Hero } from "@/components/sections/Hero";
import { CategoryGrid } from "@/components/sections/CategoryGrid";
import { SpecialistList } from "@/components/sections/SpecialistList";
import { Reveal } from "@/components/motion/Reveal";
import { LogoMark } from "@/components/brand/Logo";
import { SPECIALISTS } from "@/lib/data";

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryGrid />
      <SpecialistList specialists={SPECIALISTS} />

      {/* Why Karban */}
      <section className="px-4 py-10 sm:px-6" aria-labelledby="why-title">
        <div className="mx-auto max-w-5xl">
          <h2 id="why-title" className="mb-7 text-xl font-bold sm:text-2xl">
            چرا کاربان؟
          </h2>
          <Reveal stagger={0.12} className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "هویت تایید شده",
                text: "همه متخصصان با مدارک هویتی و سابقه کاری احراز می‌شوند.",
              },
              {
                icon: Zap,
                title: "پاسخ سریع",
                text: "میانگین زمان پاسخ متخصصان کمتر از یک ساعت است.",
              },
              {
                icon: Wallet2,
                title: "پرداخت امن",
                text: "مبلغ پروژه تا تایید نهایی کارفرما نزد کاربان امانت می‌ماند.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-3xl border border-line bg-card p-6"
              >
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mb-2 font-bold text-fg">{title}</h3>
                <p className="text-sm leading-relaxed text-muted">{text}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Pro CTA band */}
      <section className="px-4 py-10 sm:px-6">
        <Reveal className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-4xl border border-primary/25 bg-gradient-to-l from-primary/15 via-card to-card p-7 sm:p-10">
            <LogoMark className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 text-primary/8" />
            <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-bold sm:text-2xl">
                  استادکار هستی؟ <span className="text-gold">به کاربان بپیوند</span>
                </h2>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                  پروژه‌های محله‌ات را ببین، مستقیم با کارفرما در تماس باش و
                  درآمدت را چند برابر کن.
                </p>
              </div>
              <Link
                href="/auth/select-role"
                className="inline-flex h-12 items-center gap-2 rounded-2xl bg-primary px-7 font-medium text-primary-fg shadow-[0_10px_28px_-8px_var(--glow)] hover:bg-primary-hover active:scale-95"
              >
                شروع کن
                <ArrowLeft className="h-4.5 w-4.5" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
