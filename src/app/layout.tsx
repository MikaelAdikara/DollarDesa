import type { Metadata, Viewport } from "next";
import { Fredoka, Funnel_Display, Funnel_Sans, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const display = Funnel_Display({ subsets: ["latin"], variable: "--font-funnel-display", weight: ["500", "600", "700", "800"] });
const sans = Funnel_Sans({ subsets: ["latin"], variable: "--font-funnel", weight: ["400", "500", "600", "700"] });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", weight: ["400", "500", "600"] });
const wordmark = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", weight: ["700"] });

export const metadata: Metadata = {
  title: { default: "DETAK · Deteksi Risiko, Setiap Detik", template: "%s · DETAK" },
  description: "Modul ke-8 SIPGN: Indeks Paparan setiap batch MBG dari suhu dan waktu, untuk dapur, sekolah, Dinas, dan BGN.",
};

export const viewport: Viewport = { themeColor: "oklch(97.4% 0.004 75)", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${display.variable} ${sans.variable} ${mono.variable} ${wordmark.variable}`}>
      <body className="min-h-dvh">
        <SiteHeader />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
