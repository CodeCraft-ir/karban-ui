"use client";

import { type ReactNode } from "react";
import { SmoothScroll } from "./SmoothScroll";
import { Splash } from "./Splash";
import { Header } from "./Header";
import { MobileMenu } from "./MobileMenu";
import { BottomNav } from "./BottomNav";

/** Client shell: smooth scroll + splash + chrome around every page. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SmoothScroll>
      <Splash />
      <Header />
      <MobileMenu />
      <main className="flex-1 pb-[calc(var(--bottom-nav-h)+2rem)] pt-(--header-h) md:pb-8">
        {children}
      </main>
      <BottomNav />
    </SmoothScroll>
  );
}
