import type { Status } from "@/lib/model/ip";
import type { Phase } from "@/lib/pilot/engine";

export const STATUS_META: Record<Status, { label: string; verb: string; fg: string; bg: string; hex: string }> = {
  aman: { label: "Aman", verb: "Boleh dibagikan", fg: "text-aman", bg: "bg-aman-tint", hex: "#2f8a45" },
  waspada: { label: "Waspada", verb: "Bagikan segera", fg: "text-[#8a6100]", bg: "bg-waspada-tint", hex: "#d99a06" },
  buang: { label: "Buang", verb: "Jangan dibagikan", fg: "text-buang", bg: "bg-buang-tint", hex: "#cc3418" },
};

export function StatusPill({ status, size = "sm" }: { status: Status; size?: "sm" | "lg" }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold ${m.bg} ${m.fg} ${size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs"}`}>
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
  dimasak: "bg-steel-2 text-ink-2",
  di_dapur: "bg-daun-tint text-daun-2",
  perjalanan: "bg-detak-tint text-[#9a3f06]",
  di_sekolah: "bg-[#e2ebf3] text-[#284a66]",
  disantap: "bg-steel-2 text-muted",
  ditahan: "bg-ink text-white",
};

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{children}</p>;
}

export function SourceNote({ children }: { children: React.ReactNode }) {
  return <p className="text-xs leading-relaxed text-muted">{children}</p>;
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "buang" | "waspada" | "aman" | "detak" }) {
  const color = tone === "buang" ? "text-buang" : tone === "waspada" ? "text-[#8a6100]" : tone === "aman" ? "text-aman" : tone === "detak" ? "text-detak" : "text-ink";
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className={`font-display text-2xl font-bold tnum ${color}`}>{value}</p>
      {sub ? <p className="text-xs text-muted">{sub}</p> : null}
    </div>
  );
}
