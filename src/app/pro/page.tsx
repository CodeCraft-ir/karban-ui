import type { Metadata } from "next";
import { ProDashboard } from "@/components/sections/ProDashboard";

export const metadata: Metadata = { title: "داشبورد متخصص" };

export default function ProPage() {
  return <ProDashboard />;
}
