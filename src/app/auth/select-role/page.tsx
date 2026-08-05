import type { Metadata } from "next";
import { RoleSelect } from "@/components/sections/auth/RoleSelect";

export const metadata: Metadata = {
  title: "انتخاب نقش",
  robots: { index: false },
};

export default function SelectRolePage() {
  return <RoleSelect />;
}
