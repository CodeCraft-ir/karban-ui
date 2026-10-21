"use client";

import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { parseAccountSummary } from "@/lib/auth-ui";
import { createAuthSummaryStore, type AuthSummaryReader, type AuthSummaryStore } from "./auth-summary-store";

function createBrowserReader(): AuthSummaryReader {
  return {
    async read() {
      const response = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
      if (response.status === 401) return null;
      if (!response.ok) throw new Error("account_unavailable");
      return parseAccountSummary(await response.json());
    },
    async logout() {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Sec-Fetch-Site": "same-origin" },
        body: "{}",
      });
      if (!response.ok) throw new Error("logout_failed");
    },
  };
}

const AuthSummaryContext = createContext<AuthSummaryStore | null>(null);

export function AuthSummaryProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<AuthSummaryStore | null>(null);
  if (!storeRef.current) storeRef.current = createAuthSummaryStore(createBrowserReader());
  const store = storeRef.current;

  useEffect(() => {
    void store.load();
  }, [store]);

  return <AuthSummaryContext.Provider value={store}>{children}</AuthSummaryContext.Provider>;
}

export function useAuthSummary() {
  const store = useContext(AuthSummaryContext);
  if (!store) throw new Error("AuthSummaryProvider is missing");
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return {
    ...snapshot,
    refresh: store.load,
    clearAccount: store.clearAccount,
    logout: store.logout,
  };
}
