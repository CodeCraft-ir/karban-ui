"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { RegistrationRole } from "@/lib/contracts/auth";

interface AuthFlowValue {
  phone: string;
  role: RegistrationRole;
  setFlow: (phone: string, role: RegistrationRole) => void;
  clearFlow: () => void;
}

const AuthFlowContext = createContext<AuthFlowValue | null>(null);

export function AuthFlowProvider({ children }: { children: ReactNode }) {
  const [flow, setFlowState] = useState<{ phone: string; role: RegistrationRole }>({ phone: "", role: "client" });
  const value = useMemo<AuthFlowValue>(() => ({
    ...flow,
    setFlow: (phone, role) => setFlowState({ phone, role }),
    clearFlow: () => setFlowState({ phone: "", role: "client" }),
  }), [flow]);
  return <AuthFlowContext.Provider value={value}>{children}</AuthFlowContext.Provider>;
}

export function useAuthFlow(): AuthFlowValue {
  const value = useContext(AuthFlowContext);
  if (!value) throw new Error("AuthFlowProvider is missing");
  return value;
}
