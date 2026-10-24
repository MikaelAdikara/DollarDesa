import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", weight: ["500", "700", "800"] });
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains", weight: ["400", "600"] });

export const metadata: Metadata = {
  title: { default: "DETAK · Deteksi Risiko, Setiap Detik", template: "%s · DETAK" },
  description: "Modul ke-8 SIPGN: Indeks Paparan setiap batch MBG dari suhu dan waktu, untuk dapur, sekolah, Dinas, dan BGN.",
};

export const viewport: Viewport = { themeColor: "#3b5a2c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${bricolage.variable} ${jakarta.variable} ${jetbrains.variable}`}>
      <body className="steel min-h-dvh antialiased">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
