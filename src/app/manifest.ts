import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "کاربان — شبکه متخصصان ساختمان",
    short_name: "کاربان",
    description:
      "پلتفرم اتصال کارفرمایان به استادکاران و متخصصان ساختمانی",
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "fa",
    categories: ["business", "utilities", "lifestyle"],
    background_color: "#050b10",
    theme_color: "#f2cb1f",
    icons: [
      { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
  };
}
