"use client";

import { useRef, useState } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import {
  BadgeCheck,
  Clock,
  Lock,
  LockOpen,
  MapPin,
  Phone,
  Sparkles,
  User,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TapCard } from "@/components/motion/TapCard";
import { Reveal } from "@/components/motion/Reveal";
import { PRO_LEADS, type Lead } from "@/lib/data";
import { useUIStore } from "@/store/ui";
import { cn, faNum, faPrice } from "@/lib/utils";

function LeadCard({ lead, onUnlock }: { lead: Lead; onUnlock: (l: Lead) => void }) {
  const unlockedLeads = useUIStore((s) => s.unlockedLeads);
  const unlocked = lead.unlocked || unlockedLeads.includes(lead.id);
  const cardRef = useRef<HTMLDivElement>(null);

  return (
    <TapCard>
      <article
        ref={cardRef}
        className="rounded-3xl border border-line bg-card p-5 transition-colors hover:border-primary/30"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-fg">{lead.projectTitle}</h3>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-primary/70" />
                {lead.neighborhood} · {faNum(lead.distanceKm)} کیلومتر
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary/70" />
                {lead.postedAgo}
              </span>
            </p>
          </div>
          <Badge tone="brand" className="shrink-0">
            {lead.category}
          </Badge>
        </div>

        <div className="mb-4 text-sm">
          بودجه کارفرما:{" "}
          <span className="font-bold text-primary">{faPrice(lead.budget)}</span>{" "}
          <span className="text-xs text-faint">تومان</span>
        </div>

        {/* Contact — blurred glass until unlocked */}
        <div className="relative overflow-hidden rounded-2xl border border-line bg-elev p-4">
          <div
            className={cn(
              "flex items-center justify-between transition-all duration-700",
              !unlocked && "select-none blur-md",
            )}
            aria-hidden={!unlocked}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-elev-3 text-fg-soft">
                <User className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-bold text-fg">{lead.clientName}</div>
                <div className="text-xs text-muted" dir="ltr">
                  {unlocked ? lead.clientPhone : "۰۹•• ••• ••••"}
                </div>
              </div>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-success/15 text-emerald-700 dark:text-emerald-400">
              <Phone className="h-4.5 w-4.5" />
            </span>
          </div>

          {!unlocked && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-card/20 backdrop-blur-[2px]">
              <Lock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-fg-soft">
                اطلاعات تماس قفل است
              </span>
            </div>
          )}
        </div>

        <div className="mt-4">
          {unlocked ? (
            <Button variant="outline" className="w-full gap-2" disabled>
              <LockOpen className="h-4.5 w-4.5" />
              لید باز شده — با کارفرما تماس بگیر
            </Button>
          ) : (
            <Button className="w-full gap-2" onClick={() => onUnlock(lead)}>
              <Sparkles className="h-4.5 w-4.5" />
              خرید لید — {faPrice(lead.price)} تومان
            </Button>
          )}
        </div>
      </article>
    </TapCard>
  );
}

export function ProDashboard() {
  const [selected, setSelected] = useState<Lead | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { walletBalance, deductWallet, unlockLead } = useUIStore();
  const sheetBodyRef = useRef<HTMLDivElement>(null);
  const { contextSafe } = useGSAP({ scope: sheetBodyRef });

  const confirm = contextSafe(() => {
    if (!selected) return;
    setConfirming(true);
    // celebrate: coin count-down feel on the balance row
    gsap.fromTo(
      ".sheet-balance",
      { scale: 1 },
      { scale: 1.06, yoyo: true, repeat: 1, duration: 0.18, ease: "power2.inOut" },
    );
    setTimeout(() => {
      deductWallet(selected.price);
      unlockLead(selected.id);
      setConfirming(false);
      setSelected(null);
    }, 900);
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-7 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">داشبورد متخصص</h1>
            <BadgeCheck className="h-5.5 w-5.5 fill-primary/20 text-primary" />
          </div>
          <p className="mt-1.5 text-sm text-muted">
            {faNum(PRO_LEADS.length)} پروژه منطبق با تخصص تو در نزدیکی‌ات
          </p>
        </div>
      </div>

      {/* Wallet */}
      <Reveal>
        <div className="mb-7 flex items-center justify-between rounded-3xl border border-primary/25 bg-gradient-to-l from-primary/12 to-card p-5">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-fg">
              <Wallet className="h-5.5 w-5.5" />
            </span>
            <div>
              <div className="text-xs text-muted">اعتبار خرید لید</div>
              <div className="text-lg font-bold text-fg">
                {faPrice(walletBalance)}{" "}
                <span className="text-xs font-normal text-muted">تومان</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm">
            شارژ اعتبار
          </Button>
        </div>
      </Reveal>

      {/* Leads */}
      <Reveal stagger={0.1} className="space-y-4">
        {PRO_LEADS.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onUnlock={setSelected} />
        ))}
      </Reveal>

      {/* Unlock confirmation bottom sheet */}
      <BottomSheet
        open={selected !== null}
        onClose={() => !confirming && setSelected(null)}
        title="تایید خرید لید"
      >
        <div ref={sheetBodyRef}>
          {selected && (
            <>
              <div className="mb-4 rounded-2xl border border-line bg-elev p-4">
                <div className="text-sm font-bold text-fg">
                  {selected.projectTitle}
                </div>
                <div className="mt-1 text-xs text-muted">
                  {selected.neighborhood} · بودجه {faPrice(selected.budget)} تومان
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between text-fg-soft">
                  <span>هزینه باز کردن لید</span>
                  <span className="font-bold text-primary">
                    {faPrice(selected.price)} تومان
                  </span>
                </div>
                <div className="sheet-balance flex items-center justify-between text-fg-soft">
                  <span>موجودی فعلی</span>
                  <span className="font-bold">{faPrice(walletBalance)} تومان</span>
                </div>
                <div className="flex items-center justify-between border-t border-line pt-2.5 text-fg-soft">
                  <span>موجودی پس از خرید</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {faPrice(walletBalance - selected.price)} تومان
                  </span>
                </div>
              </div>

              <div className="mt-6 flex gap-2.5">
                <Button
                  className="flex-1 gap-2"
                  onClick={confirm}
                  disabled={confirming}
                >
                  {confirming ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-fg/40 border-t-primary-fg" />
                      در حال باز کردن...
                    </>
                  ) : (
                    <>
                      <LockOpen className="h-4.5 w-4.5" />
                      تایید و پرداخت
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setSelected(null)}
                  disabled={confirming}
                >
                  انصراف
                </Button>
              </div>
            </>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
