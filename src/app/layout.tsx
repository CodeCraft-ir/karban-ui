import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";
import { AppShell } from "@/components/layout/AppShell";
import { SITE_URL, orgJsonLd, webSiteJsonLd } from "@/lib/seo";

const yekan = localFont({
  src: "../../public/fonts/Yekan.woff",
  variable: "--font-yekan-face",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "کاربان | استادکار و متخصص ساختمان مورد اعتماد، نزدیک تو",
    template: "%s | کاربان",
  },
  description:
    "با کاربان استادکار تایید‌شده محله‌ات را در چند دقیقه پیدا کن؛ برق‌کاری، لوله‌کشی، نقاشی و بازسازی با نظرات واقعی کارفرمایان و پرداخت امن.",
  applicationName: "کاربان",
  keywords: [
    "استادکار",
    "متخصص ساختمان",
    "برق‌کار",
    "لوله‌کش",
    "نقاشی ساختمان",
    "بازسازی خانه",
    "خدمات ساختمانی تهران",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "کاربان",
    title: "کاربان | استادکار مورد اعتماد، نزدیک تو",
    description:
      "شبکه متخصصان تایید‌شده ساختمان — از برق‌کاری تا بازسازی کامل، با نظرات واقعی و پرداخت امن.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary",
    title: "کاربان | استادکار مورد اعتماد، نزدیک تو",
    description: "شبکه متخصصان تایید‌شده ساختمان با پرداخت امن.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "کاربان",
  },
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
    // suppressHydrationWarning: next-themes mutates the class on <html>
    // before hydration to prevent theme flicker.
    <html
      lang="fa"
      dir="rtl"
      suppressHydrationWarning
      className={`${yekan.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-surface text-fg">
        {/* Structured data — Organization + WebSite w/ SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd()) }}
        />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
