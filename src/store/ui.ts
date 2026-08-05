"use client";

import { create } from "zustand";

interface UIState {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  city: string;
  setCity: (city: string) => void;
  splashDone: boolean;
  setSplashDone: (done: boolean) => void;
  walletBalance: number;
  deductWallet: (amount: number) => void;
  unlockedLeads: string[];
  unlockLead: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  menuOpen: false,
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  city: "تهران",
  setCity: (city) => set({ city }),
  splashDone: false,
  setSplashDone: (splashDone) => set({ splashDone }),
  walletBalance: 480_000,
  deductWallet: (amount) =>
    set((s) => ({ walletBalance: Math.max(0, s.walletBalance - amount) })),
  unlockedLeads: ["l3"],
  unlockLead: (id) =>
    set((s) => ({ unlockedLeads: [...s.unlockedLeads, id] })),
}));
