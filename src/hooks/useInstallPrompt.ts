"use client";

import { useCallback, useEffect, useState } from "react";

/** Chromium's non-standard install prompt event. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "karban-install-dismissed";
const DISMISS_DAYS = 14;

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari legacy flag
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !/crios|fxios/i.test(navigator.userAgent)
  );
}

/**
 * useInstallPrompt — one hook powering every install surface.
 *
 * - Chromium: captures `beforeinstallprompt`, exposes `promptInstall()`.
 * - iOS Safari: no prompt API → `isIosSafari` flags the manual
 *   "Share → Add to Home Screen" fallback sheet.
 * - Already installed (standalone) or recently dismissed → all surfaces hide.
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosSafari, setIosSafari] = useState(false);
  const [dismissed, setDismissed] = useState(true); // safe default pre-mount

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setIosSafari(isIos());

    const ts = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    setDismissed(ts > 0 && Date.now() - ts < DISMISS_DAYS * 86_400_000);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
    return outcome === "accepted";
  }, [deferred]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }, []);

  return {
    /** Native prompt is armed (Chromium) */
    canPrompt: deferred !== null && !installed,
    /** iOS Safari — show manual instructions instead */
    isIosSafari: iosSafari && !installed,
    /** Any install surface should render */
    canInstall: !installed && (deferred !== null || (iosSafari && !isStandaloneSafe())),
    isInstalled: installed,
    bannerDismissed: dismissed,
    promptInstall,
    dismiss,
  };
}

function isStandaloneSafe() {
  try {
    return isStandalone();
  } catch {
    return false;
  }
}
