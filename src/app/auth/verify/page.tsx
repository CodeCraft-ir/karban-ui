import type { Metadata } from "next";
import { OtpForm } from "@/components/sections/auth/OtpForm";

export const metadata: Metadata = {
  title: "تایید کد",
  robots: { index: false },
};

export default function VerifyPage() {
  return <OtpForm />;
}
