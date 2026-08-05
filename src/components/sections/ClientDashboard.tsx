"use client";

import { useState } from "react";
import {
  CheckCircle2,
  FolderKanban,
  MessagesSquare,
  Plus,
  Star,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { TapCard } from "@/components/motion/TapCard";
import { Reveal } from "@/components/motion/Reveal";
import { ProjectWizard } from "@/components/blocks/ProjectWizard";
import { CLIENT_PROJECTS } from "@/lib/data";
import { faNum, faPrice } from "@/lib/utils";

const STATS = [
  { icon: FolderKanban, label: "پروژه فعال", value: faNum(2), tone: "text-primary bg-primary/12" },
  { icon: MessagesSquare, label: "پیشنهاد جدید", value: faNum(8), tone: "text-azure-700 dark:text-azure-400 bg-azure-500/12" },
  { icon: CheckCircle2, label: "تکمیل شده", value: faNum(5), tone: "text-emerald-700 dark:text-emerald-400 bg-success/12" },
  { icon: Star, label: "نظر ثبت شده", value: faNum(4), tone: "text-amber-700 dark:text-amber-400 bg-warn/12" },
];

export function ClientDashboard() {
  const [wizardOpen, setWizardOpen] = useState(false);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">سلام، نیما 👋</h1>
          <p className="mt-1.5 text-sm text-muted">
            امروز چه کاری برایت انجام دهیم؟
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)} className="gap-1.5">
          <Plus className="h-4.5 w-4.5" />
          پروژه جدید
        </Button>
      </div>

      {/* Stats */}
      <Reveal stagger={0.08} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map(({ icon: Icon, label, value, tone }) => (
          <TapCard key={label}>
            <div className="rounded-3xl border border-line bg-card p-4">
              <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${tone}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="text-2xl font-bold text-fg">{value}</div>
              <div className="mt-0.5 text-xs text-muted">{label}</div>
            </div>
          </TapCard>
        ))}
      </Reveal>

      {/* Wallet strip */}
      <Reveal className="mt-4">
        <div className="flex items-center justify-between rounded-3xl border border-primary/25 bg-gradient-to-l from-primary/12 to-card p-5">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-fg">
              <Wallet className="h-5.5 w-5.5" />
            </span>
            <div>
              <div className="text-xs text-muted">موجودی کیف پول</div>
              <div className="text-lg font-bold text-fg">
                {faPrice(480_000)} <span className="text-xs font-normal text-muted">تومان</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm">
            افزایش موجودی
          </Button>
        </div>
      </Reveal>

      {/* Projects */}
      <div className="mb-4 mt-9 flex items-center justify-between">
        <h2 className="text-lg font-bold">پروژه‌های من</h2>
        <span className="text-xs text-faint">{faNum(CLIENT_PROJECTS.length)} پروژه</span>
      </div>

      <Reveal stagger={0.09} className="space-y-3.5">
        {CLIENT_PROJECTS.map((p) => (
          <TapCard key={p.id}>
            <article className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-5 transition-colors hover:border-primary/30 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="font-bold text-fg">{p.title}</h3>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1.5 text-xs text-muted">
                  {p.category} · {p.neighborhood} · {p.createdAt}
                </p>
              </div>
              <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end sm:gap-1">
                <div className="text-sm font-bold text-primary">
                  {faPrice(p.budget)}
                  <span className="mr-1 text-[10px] font-normal text-faint">تومان</span>
                </div>
                <div className="text-xs text-muted">
                  {faNum(p.proposals)} پیشنهاد دریافتی
                </div>
              </div>
            </article>
          </TapCard>
        ))}
      </Reveal>

      <ProjectWizard open={wizardOpen} onClose={() => setWizardOpen(false)} />
    </div>
  );
}
