import type { Status } from "@/lib/model/ip";
import type { Phase } from "@/lib/pilot/engine";

export const STATUS_META: Record<Status, { label: string; verb: string; fg: string; bg: string; hex: string }> = {
  aman: { label: "Aman", verb: "Boleh dibagikan", fg: "text-aman", bg: "bg-aman-tint", hex: "var(--color-aman)" },
  waspada: { label: "Waspada", verb: "Bagikan segera", fg: "text-waspada-ink", bg: "bg-waspada-tint", hex: "var(--color-waspada)" },
  buang: { label: "Buang", verb: "Jangan dibagikan", fg: "text-buang", bg: "bg-buang-tint", hex: "var(--color-buang)" },
};

export function StatusPill({ status, size = "sm" }: { status: Status; size?: "sm" | "lg" }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${m.bg} ${m.fg} ${size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"}`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: m.hex }} />
      {m.label}
    </span>
  );
}

export function fmtIp(ip: number) {
  return ip.toFixed(2).replace(".", ",");
}

export function fmtInt(n: number) {
  return Math.round(n).toLocaleString("id-ID");
}

export function fmtPct(x: number, digits = 1) {
  return `${(x * 100).toFixed(digits).replace(".", ",")}%`;
}

export const PHASE_STYLE: Record<Phase, string> = {
  dimasak: "bg-paper-2 text-ink-2",
  di_dapur: "bg-daun-tint text-daun-2",
  perjalanan: "bg-detak-tint text-ink",
  di_sekolah: "bg-paper-2 text-route",
  disantap: "bg-paper-2 text-muted",
  ditahan: "bg-ink text-card",
};

/** Small context line above a page title. Sentence case, no tracking. */
export function Kicker({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}

/** Big number with a quiet label underneath; used in hairline-separated strips, never inside its own card. */
export function Figure({ value, label, tone, info, size = "lg" }: { value: React.ReactNode; label: React.ReactNode; tone?: "buang" | "waspada" | "aman" | "detak"; info?: React.ReactNode; size?: "lg" | "xl" }) {
  const color = tone === "buang" ? "text-buang" : tone === "waspada" ? "text-waspada-ink" : tone === "aman" ? "text-aman" : tone === "detak" ? "text-detak" : "text-ink";
  return (
    <div className="min-w-0">
      <p className={`font-mono font-medium leading-none tracking-tight tnum ${color} ${size === "xl" ? "text-[44px] sm:text-[56px]" : "text-[30px] sm:text-[36px]"}`}>{value}</p>
      <p className="mt-2 flex items-center text-[13px] text-muted">
        {label}
        {info}
      </p>
    </div>
  );
}

export function SegLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <a href={href} aria-current={active ? "true" : undefined} className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors duration-150 ${active ? "bg-ink text-card" : "text-ink-2 hover:bg-paper-2"}`}>
      {children}
    </a>
  );
}

/** Pill search field that submits as a plain GET form, so it works without JavaScript. */
export function SearchBox({ action, hidden, placeholder, defaultValue, label, size = "md" }: { action: string; hidden: Record<string, string | undefined>; placeholder: string; defaultValue?: string; label: string; size?: "md" | "lg" }) {
  return (
    <form action={action} role="search" className={`flex w-full items-center gap-1 rounded-full border border-line-2 bg-card p-1 transition-colors duration-150 focus-within:border-ink ${size === "lg" ? "max-w-xl" : "max-w-sm"}`}>
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label className="sr-only" htmlFor={`q-${action}`}>
        {label}
      </label>
      <input id={`q-${action}`} name="q" defaultValue={defaultValue} placeholder={placeholder} className={`min-w-0 flex-1 bg-transparent px-4 outline-none placeholder:text-muted focus-visible:outline-none ${size === "lg" ? "py-2.5 text-base" : "py-1.5 text-sm"}`} />
      <button className={`shrink-0 whitespace-nowrap rounded-full bg-ink font-semibold text-card transition-opacity duration-150 hover:opacity-90 ${size === "lg" ? "px-5 py-2.5 text-sm" : "px-4 py-1.5 text-xs"}`}>Cari</button>
    </form>
  );
}
