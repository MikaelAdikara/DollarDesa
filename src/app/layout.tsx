import type { Metadata, Viewport } from "next";
import { Geist_Mono, Schibsted_Grotesk } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const schibsted = Schibsted_Grotesk({ subsets: ["latin"], variable: "--font-schibsted", weight: ["400", "500", "600", "700", "800"] });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: { default: "DETAK · Deteksi Risiko, Setiap Detik", template: "%s · DETAK" },
  description: "Modul ke-8 SIPGN: Indeks Paparan setiap batch MBG dari suhu dan waktu, untuk dapur, sekolah, Dinas, dan BGN.",
};

export const viewport: Viewport = { themeColor: "var(--color-daun)", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${schibsted.variable} ${geistMono.variable}`}>
      <body className="min-h-dvh">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
