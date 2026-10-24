"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { resolveClock } from "@/lib/pilot/clock";

const NAV = [
  { href: "/dapur", label: "Dapur", who: "SPPG" },
  { href: "/sekolah", label: "Sekolah", who: "Guru & orang tua" },
  { href: "/dinas", label: "Dinas", who: "Control panel" },
  { href: "/bgn", label: "BGN", who: "Pilot" },
  { href: "/metode", label: "Metode", who: "Model" },
  { href: "/implementasi", label: "Implementasi", who: "Arsitektur" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-steel/90 backdrop-blur supports-[backdrop-filter]:bg-steel/75">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
        <Link href="/" className="flex items-center gap-2 rounded-md" aria-label="DETAK, beranda">
          <Wordmark />
        </Link>
        <Suspense fallback={<nav className="hidden flex-1 md:block" />}>
          <Nav />
          <ClockChip />
        </Suspense>
      </div>
    </header>
  );
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
        <rect x="1" y="1" width="28" height="28" rx="8" fill="#3b5a2c" />
        <path d="M5 16h5l2.5-6 4 11 2.5-5H25" fill="none" stroke="#fde8d8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-[21px] font-extrabold tracking-tight text-daun">DETAK</span>
    </span>
  );
}

function Nav() {
  const path = usePathname();
  const sp = useSearchParams();
  const t = sp.get("t");
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  return (
    <nav aria-label="Portal" className="-mx-1 flex flex-1 items-center gap-0.5 overflow-x-auto px-1 md:justify-center">
      {NAV.map((n) => {
        const active = path === n.href || path.startsWith(n.href + "/");
        return (
          <Link
            key={n.href}
            href={n.href + q}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold transition-colors ${active ? "bg-daun text-white" : "text-ink-2 hover:bg-white/70"}`}
          >
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

const TIMES = ["06:30", "08:00", "09:15", "10:15", "11:30", "13:00"];

function ClockChip() {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const t = sp.get("t");
  const clock = useMemo(() => resolveClock(t), [t]);
  const value = t ?? (clock.mode === "live" ? "live" : "10:15");
  return (
    <label className="hidden shrink-0 items-center gap-2 rounded-lg border border-line bg-white px-2 py-1 text-xs lg:flex">
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full rounded-full ${clock.mode === "live" ? "pulse-dot bg-aman" : "bg-detak"}`} />
      </span>
      <span className="font-semibold text-ink-2">{clock.mode === "live" ? "Waktu nyata" : "Putar ulang"}</span>
      <select
        aria-label="Waktu simulasi"
        className="cursor-pointer rounded bg-steel px-1 py-0.5 font-mono text-xs"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          const params = new URLSearchParams(sp.toString());
          if (v === "live") params.delete("t");
          else params.set("t", v);
          router.push(`${path}${params.size ? `?${params}` : ""}`);
        }}
      >
        <option value="live">sekarang</option>
        {TIMES.map((x) => (
          <option key={x} value={x}>
            {x.replace(":", ".")} WIB
          </option>
        ))}
      </select>
    </label>
  );
}
