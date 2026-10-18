import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { AppShell } from "@/components/layout/AppShell";
import { SITE_URL, orgJsonLd, serializeJsonLd, webSiteJsonLd } from "@/lib/seo";

const yekan = localFont({
  src: "../../public/fonts/Yekan.woff",
  variable: "--font-yekan-face",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "کاربان | فهرست متخصصان ساختمان",
    template: "%s | کاربان",
  },
  description: "فهرست عمومی متخصصان و خدمات ساختمانی کاربان.",
  applicationName: "کاربان",
  keywords: ["استادکار", "متخصص ساختمان", "برق‌کار", "لوله‌کش", "نقاشی ساختمان", "بازسازی خانه"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "کاربان",
    title: "کاربان | فهرست متخصصان ساختمان",
    description: "فهرست عمومی متخصصان و خدمات ساختمانی کاربان.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary",
    title: "کاربان | فهرست متخصصان ساختمان",
    description: "فهرست عمومی متخصصان و خدمات ساختمانی کاربان.",
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "کاربان" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#050b10" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning className={`${yekan.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface text-fg">
        <script type="application/ld+json">{serializeJsonLd(orgJsonLd())}</script>
        <script type="application/ld+json">{serializeJsonLd(webSiteJsonLd())}</script>
        <Providers><AppShell>{children}</AppShell></Providers>
      </body>
    </html>
  );
}
