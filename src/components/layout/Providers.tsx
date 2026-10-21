"use client";

import { type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { AuthSummaryProvider } from "@/components/layout/useAuthSummary";
import { AuthFlowProvider } from "@/components/sections/auth/AuthFlowContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <AuthSummaryProvider><AuthFlowProvider>{children}</AuthFlowProvider></AuthSummaryProvider>
    </ThemeProvider>
  );
}
