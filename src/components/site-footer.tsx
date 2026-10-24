import Link from "next/link";
import { Wordmark } from "./wordmark";

export function SiteFooter() {
  return (
    <footer className="mx-auto mb-8 max-w-7xl px-4 sm:px-6">
      <div className="flex flex-col gap-8 border-t border-line pt-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Wordmark height={64} />
          <p className="mt-4 text-sm text-muted">Deteksi Risiko, Setiap Detik · modul ke-8 SIPGN</p>
        </div>
        <nav aria-label="Tautan bawah" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2">
          <Link className="whitespace-nowrap hover:text-ink" href="/metode">
            Metode
          </Link>
          <Link className="whitespace-nowrap hover:text-ink" href="/implementasi#data">
            Data & sumber
          </Link>
          <Link className="whitespace-nowrap hover:text-ink" href="/implementasi#faq">
            Pertanyaan umum
          </Link>
        </nav>
      </div>
      <p className="mt-6 text-xs text-muted">Data operasional disimulasikan dari angka resmi BGN, BPS, dan insiden terdokumentasi.</p>
    </footer>
  );
}
