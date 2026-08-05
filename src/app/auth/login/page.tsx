import type { Metadata } from "next";
import { LoginForm } from "@/components/sections/auth/LoginForm";

export const metadata: Metadata = {
  title: "ورود / ثبت‌نام",
  robots: { index: false },
};

export default function LoginPage() {
  return <LoginForm />;
}
