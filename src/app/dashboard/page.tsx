import type { Metadata } from "next";
import { ClientDashboard } from "@/components/sections/ClientDashboard";

export const metadata: Metadata = { title: "داشبورد کارفرما" };

export default function DashboardPage() {
  return <ClientDashboard />;
}
