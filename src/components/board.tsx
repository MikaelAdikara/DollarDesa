import Link from "next/link";
import type { Status } from "@/lib/model/ip";
import { fmtClock, fmtDuration } from "@/lib/pilot/clock";
import type { BatchDetail } from "@/lib/pilot/engine";
import { fmtInt, fmtIp, STATUS_META } from "./ui";

/**
 * The live distribution board — one row per batch, read like an airport departures board:
 * meal time, destination, portions, Indeks Paparan, and how long until the safe window closes.
 */
export function Board({ rows, now, t, action, sub, empty, maxH }: { rows: BatchDetail[]; now: number; t?: string; action?: (r: BatchDetail) => React.ReactNode; sub?: (r: BatchDetail) => string; empty?: string; maxH?: string }) {
  const q = t ? `?t=${encodeURIComponent(t)}` : "";
  if (!rows.length) {
    return <p className="px-5 py-10 text-center text-sm text-night-muted">{empty ?? "Tidak ada batch."}</p>;
  }
  return (
    <ol className={`divide-y divide-night-line ${maxH ? `${maxH} overflow-y-auto [scrollbar-color:var(--color-night-line)_transparent]` : ""}`}>
      {rows.map((r) => {
        const status: Status = r.statusAtMeal;
        const meta = STATUS_META[status];
        const left = r.minutesLeft;
        const window = Math.max(1, (r.batch.mealAt - now) / 60_000);
        const frac = Number.isFinite(left) ? Math.max(0, Math.min(1, left / window)) : 1;
        return (
          <li key={r.id} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 sm:grid-cols-[72px_minmax(0,1fr)_120px_96px_auto] sm:px-5">
            <span className="font-mono text-xl font-medium text-night-ink tnum sm:text-2xl">{fmtClock(r.batch.mealAt, r.batch.tzOffset)}</span>
            <Link href={`/cek/${r.id}${q}`} className="min-w-0 rounded-md hover:underline">
              <span className="block truncate text-[15px] font-semibold text-night-ink">{r.batch.school.name}</span>
              <span className="block truncate text-xs text-night-muted">
                {sub ? sub(r) : `${r.batch.kitchen.name} · ${fmtInt(r.batch.school.portions)} porsi`}
              </span>
            </Link>
            <span className="hidden sm:block" aria-label={Number.isFinite(left) ? `aman ${fmtDuration(left)} lagi` : "aman"}>
              <span className="block h-1.5 overflow-hidden rounded-full bg-night-line">
                <span className="block h-full rounded-full" style={{ width: `${frac * 100}%`, background: left <= 0 ? "var(--color-buang)" : left < 30 ? "var(--color-waspada)" : "var(--color-aman)" }} />
              </span>
              <span className="mt-1 block font-mono text-[11px] text-night-muted tnum">{left <= 0 ? "batas habis" : Number.isFinite(left) ? `${fmtDuration(left)} lagi` : "aman"}</span>
            </span>
            <span className="text-right sm:text-left">
              <span className="block font-mono text-xl font-medium tnum" style={{ color: meta.hex }}>
                {fmtIp(r.ipAtMeal)}
              </span>
              <span className="block text-[11px] text-night-muted">{meta.label}</span>
            </span>
            {action ? <span className="col-span-3 flex justify-start gap-2 sm:col-span-1 sm:justify-end">{action(r)}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}

export function BoardHeader({ title, live, right }: { title: string; live?: string; right?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-night-line px-4 py-3 sm:px-5">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2 w-2">
          <span className="pulse-dot absolute inline-flex h-full w-full rounded-full bg-detak" />
        </span>
        <h2 className="text-base font-bold text-night-ink">{title}</h2>
        {live ? <span className="font-mono text-xs text-night-muted">{live}</span> : null}
      </div>
      {right}
    </div>
  );
}

export function BoardColumns({ action }: { action?: boolean }) {
  return (
    <div className={`hidden gap-x-4 px-5 pt-3 font-mono text-[10px] uppercase tracking-wider text-night-muted sm:grid ${action ? "grid-cols-[72px_minmax(0,1fr)_120px_96px_auto]" : "grid-cols-[72px_minmax(0,1fr)_120px_96px]"}`}>
      <span>Makan</span>
      <span>Tujuan</span>
      <span>Jendela aman</span>
      <span>IP saat makan</span>
      {action ? <span className="text-right">Tindakan</span> : null}
    </div>
  );
}
