"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import { resolveClock } from "@/lib/pilot/clock";

// Nav: N5 floating pill — detached from the edges, content-sized.
const NAV = [
  { href: "/dapur", label: "Dapur" },
  { href: "/sekolah", label: "Sekolah" },
  { href: "/dinas", label: "Dinas" },
  { href: "/bgn", label: "BGN" },
  { href: "/metode", label: "Metode" },
  { href: "/implementasi", label: "Implementasi" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center gap-2 rounded-full border border-line bg-card/90 py-1.5 pl-3 pr-1.5 shadow-[0_8px_30px_-18px_oklch(21%_0.02_145/0.45)] backdrop-blur-md">
        <Link href="/" className="flex shrink-0 items-center gap-2 rounded-full pr-2" aria-label="DETAK, beranda">
          <Mark />
          <span className="hidden text-[17px] font-extrabold tracking-tight text-ink sm:inline">DETAK</span>
        </Link>
        <Suspense fallback={<span className="flex-1" />}>
          <Nav />
          <ClockChip />
        </Suspense>
      </div>
    </header>
  );
}

export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden>
      <rect x="1" y="1" width="28" height="28" rx="9" fill="var(--color-daun)" />
      <path d="M5 16h5l2.5-6 4 11 2.5-5H25" fill="none" stroke="var(--color-detak-tint)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Nav() {
  const path = usePathname();
  const sp = useSearchParams();
  const t = sp.get("t");
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  return (
    <nav aria-label="Portal" className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] max-md:[mask-image:linear-gradient(to_right,black_82%,transparent)]">
      {NAV.map((n) => {
        const active = path === n.href || path.startsWith(n.href + "/") || (n.href === "/sekolah" && path.startsWith("/cek"));
        return (
          <Link
            key={n.href}
            href={n.href + q}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 ${active ? "bg-ink text-card" : "text-ink-2 hover:bg-paper-2"}`}
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
  const hm = clock.label.split("·").pop()?.trim() ?? "";
  return (
    <label className="relative hidden shrink-0 cursor-pointer items-center gap-2 rounded-full bg-paper-2 px-3 py-1.5 text-xs md:flex" title="Ganti jam simulasi">
      <span className="relative flex h-2 w-2">
        <span className={`absolute inline-flex h-full w-full rounded-full ${clock.mode === "live" ? "pulse-dot bg-aman" : "bg-detak"}`} />
      </span>
      <span className="font-mono font-medium text-ink tnum">{hm}</span>
      <span className="text-muted">{clock.mode === "live" ? "langsung" : "putar ulang"}</span>
      <select
        aria-label="Waktu simulasi"
        className="absolute inset-0 cursor-pointer opacity-0"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          const params = new URLSearchParams(sp.toString());
          if (v === "live") params.delete("t");
          else params.set("t", v);
          router.push(`${path}${params.size ? `?${params}` : ""}`);
        }}
      >
        <option value="live">Waktu nyata</option>
        {TIMES.map((x) => (
          <option key={x} value={x}>
            {x.replace(":", ".")} WIB
          </option>
        ))}
      </select>
    </label>
  );
}
