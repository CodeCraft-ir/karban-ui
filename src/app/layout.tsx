import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";

const yekan = localFont({
  src: "../../public/fonts/Yekan.woff",
  variable: "--font-yekan-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "کاربان | شبکه متخصصان ساختمان",
    template: "%s | کاربان",
  },
  description:
    "کاربان؛ پلی میان کارفرمایان و استادکاران ساختمانی. متخصص مورد اعتماد محله‌ات را پیدا کن.",
  applicationName: "کاربان",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "کاربان",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b1120",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" className={`${yekan.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-ink-950 text-slate-50">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
