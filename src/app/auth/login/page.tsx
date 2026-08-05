import type { Metadata } from "next";
import { LoginForm } from "@/components/sections/auth/LoginForm";

export const metadata: Metadata = { title: "ورود / ثبت‌نام" };

export default function LoginPage() {
  return <LoginForm />;
}
