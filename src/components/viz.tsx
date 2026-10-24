import { fmtClock } from "@/lib/pilot/clock";
import type { BatchDetail, BatchState, Phase } from "@/lib/pilot/engine";
import { quantile } from "@/lib/model/ip";

const ZONE = (v: number) => (v >= 1 ? "var(--color-buang)" : v >= 0.8 ? "var(--color-waspada)" : "var(--color-aman)");
const MONO = "var(--font-geist-mono)";

/** Distribution of Indeks Paparan at meal time across batches, with thresholds and percentiles. */
export function IpHistogram({ states, height = 220 }: { states: BatchState[]; height?: number }) {
  const W = 680;
  const H = height;
  const pad = { l: 44, r: 16, t: 26, b: 40 };
  const step = 0.05;
  const maxX = 1.6;
  const bins = Array.from({ length: Math.round(maxX / step) + 1 }, () => 0);
  const vals = states.map((s) => s.ipAtMeal).sort((a, b) => a - b);
  for (const v of vals) bins[Math.min(bins.length - 1, Math.floor(v / step))]++;
  const maxC = Math.max(1, ...bins);
  const bw = (W - pad.l - pad.r) / bins.length;
  const x = (v: number) => pad.l + (v / (maxX + step)) * (W - pad.l - pad.r);
  const yScale = (c: number) => (Math.sqrt(c) / Math.sqrt(maxC)) * (H - pad.t - pad.b);
  const p50 = quantile(vals, 0.5);
  const p95 = quantile(vals, 0.95);
  const over = vals.filter((v) => v >= 1).length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Sebaran Indeks Paparan saat makan untuk ${states.length} batch`}>
      <rect x={x(0.8)} y={pad.t} width={x(1) - x(0.8)} height={H - pad.t - pad.b} fill="var(--color-waspada-tint)" opacity={0.6} />
      <rect x={x(1)} y={pad.t} width={W - pad.r - x(1)} height={H - pad.t - pad.b} fill="var(--color-buang-tint)" opacity={0.6} />
      {bins.map((c, i) => {
        const h = yScale(c);
        return c ? <rect key={i} x={pad.l + i * bw + 1} y={H - pad.b - h} width={bw - 2} height={h} rx={2} fill={ZONE(i * step)} /> : null;
      })}
      {[0, 0.4, 0.8, 1.0, 1.2, 1.6].map((v) => (
        <text key={v} x={x(v)} y={H - pad.b + 16} textAnchor="middle" fontSize="11" fill="var(--color-muted)" fontFamily={MONO}>
          {v === 1.6 ? "≥1,6" : v.toFixed(1).replace(".", ",")}
        </text>
      ))}
      <text x={pad.l} y={H - 6} fontSize="11" fill="var(--color-muted)">Indeks Paparan saat jam makan (P95)</text>
      {[1, 10, 100, 1000].filter((c) => c <= maxC).map((c) => (
        <g key={c}>
          <line x1={pad.l - 4} x2={W - pad.r} y1={H - pad.b - yScale(c)} y2={H - pad.b - yScale(c)} stroke="var(--color-line)" strokeDasharray="2 4" />
          <text x={pad.l - 8} y={H - pad.b - yScale(c) + 4} textAnchor="end" fontSize="10" fill="var(--color-muted)" fontFamily={MONO}>
            {c}
          </text>
        </g>
      ))}
      {[["P50", p50], ["P95", p95]].map(([l, v]) => (
        <g key={l as string}>
          <line x1={x(v as number)} x2={x(v as number)} y1={pad.t - 6} y2={H - pad.b} stroke="var(--color-ink)" strokeWidth={1.5} />
          <text x={x(v as number) + 4} y={pad.t + 4} fontSize="11" fontWeight={700} fill="var(--color-ink)" fontFamily={MONO}>
            {l} {(v as number).toFixed(2).replace(".", ",")}
          </text>
        </g>
      ))}
      <text x={W - pad.r} y={pad.t - 10} textAnchor="end" fontSize="12" fontWeight={700} fill="var(--color-buang)">
        {over} batch ≥ 1,0
      </text>
    </svg>
  );
}

const FLOW: { phase: Phase; label: string; color: string }[] = [
  { phase: "di_dapur", label: "Matang, di dapur", color: "var(--color-ink-2)" },
  { phase: "perjalanan", label: "Dalam perjalanan", color: "var(--color-detak)" },
  { phase: "di_sekolah", label: "Tiba di sekolah", color: "var(--color-route)" },
  { phase: "disantap", label: "Sudah disantap", color: "var(--color-line-2)" },
];

function phaseAt(s: BatchState, t: number): Phase {
  const b = s.batch;
  if (t >= b.mealAt) return "disantap";
  if (t >= b.arriveAt) return "di_sekolah";
  if (t >= b.departAt) return "perjalanan";
  if (t >= b.cookedAt) return "di_dapur";
  return "dimasak";
}

/** Operational rhythm of the day: how many batches are in each phase, every 10 minutes (local time). */
export function DayFlow({ states, now, tzOffset, height = 220 }: { states: BatchState[]; now: number; tzOffset: number; height?: number }) {
  if (!states.length) return null;
  const W = 680;
  const H = height;
  const pad = { l: 44, r: 12, t: 12, b: 34 };
  const start = Math.min(...states.map((s) => s.batch.cookedAt)) - 20 * 60_000;
  const end = Math.max(...states.map((s) => s.batch.mealAt)) + 30 * 60_000;
  const stepMs = 10 * 60_000;
  const ts: number[] = [];
  for (let t = start; t <= end; t += stepMs) ts.push(t);
  const counts = ts.map((t) => {
    const c: Record<string, number> = { di_dapur: 0, perjalanan: 0, di_sekolah: 0, disantap: 0 };
    for (const s of states) {
      const p = phaseAt(s, t);
      if (p in c) c[p]++;
    }
    return c;
  });
  const total = states.length;
  const x = (t: number) => pad.l + ((t - start) / (end - start)) * (W - pad.l - pad.r);
  const y = (v: number) => H - pad.b - (v / total) * (H - pad.t - pad.b);
  let acc = ts.map(() => 0);
  const layers = FLOW.map((f) => {
    const lower = acc;
    const upper = acc.map((a, i) => a + counts[i][f.phase]);
    acc = upper;
    const d = `M${ts.map((t, i) => `${x(t)},${y(upper[i])}`).join("L")}L${ts
      .map((t, i) => `${x(t)},${y(lower[i])}`)
      .reverse()
      .join("L")}Z`;
    return { ...f, d };
  });
  const hours: number[] = [];
  for (let t = Math.ceil(start / 3.6e6) * 3.6e6; t <= end; t += 3.6e6) hours.push(t);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Jumlah batch per tahap sepanjang hari">
        {layers.map((l) => (
          <path key={l.phase} d={l.d} fill={l.color} opacity={l.phase === "disantap" ? 0.55 : 0.92} />
        ))}
        {hours.map((t) => (
          <text key={t} x={x(t)} y={H - pad.b + 16} textAnchor="middle" fontSize="11" fill="var(--color-muted)" fontFamily={MONO}>
            {fmtClock(t, tzOffset)}
          </text>
        ))}
        {[0, 0.5, 1].map((v) => (
          <text key={v} x={pad.l - 8} y={y(v * total) + 4} textAnchor="end" fontSize="10" fill="var(--color-muted)" fontFamily={MONO}>
            {Math.round(v * total)}
          </text>
        ))}
        {now > start && now < end ? (
          <g>
            <line x1={x(now)} x2={x(now)} y1={pad.t} y2={H - pad.b} stroke="var(--color-ink)" strokeWidth={2} />
            <text x={x(now) + 4} y={pad.t + 10} fontSize="11" fontWeight={700} fill="var(--color-ink)" fontFamily={MONO}>
              sekarang
            </text>
          </g>
        ) : null}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-3 text-xs text-ink-2">
        {FLOW.map((f) => (
          <span key={f.phase} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: f.color }} /> {f.label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}

/**
 * Action window for each early warning: a bar from now to the planned meal time, with the
 * moment the batch's P95 IP reaches 1.0 marked. Everything right of that mark is unsafe.
 */
export function ActionWindow({ alerts, now, tzOffset }: { alerts: BatchDetail[]; now: number; tzOffset: number }) {
  if (!alerts.length) return null;
  const rows = alerts.slice(0, 14);
  const W = 680;
  const rowH = 22;
  const pad = { l: 190, r: 14, t: 22, b: 26 };
  const H = pad.t + rows.length * rowH + pad.b;
  const end = Math.max(...rows.map((a) => a.batch.mealAt)) + 10 * 60_000;
  const start = now - 5 * 60_000;
  const x = (t: number) => pad.l + ((t - start) / (end - start)) * (W - pad.l - pad.r);
  const ticks: number[] = [];
  for (let t = Math.ceil(start / 1.8e6) * 1.8e6; t <= end; t += 1.8e6) ticks.push(t);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Jendela tindakan untuk setiap peringatan dini">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={pad.t - 6} y2={H - pad.b} stroke="var(--color-line)" />
          <text x={x(t)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-muted)" fontFamily={MONO}>
            {fmtClock(t, tzOffset)}
          </text>
        </g>
      ))}
      <line x1={x(now)} x2={x(now)} y1={pad.t - 10} y2={H - pad.b} stroke="var(--color-ink)" strokeWidth={2} />
      <text x={x(now)} y={pad.t - 12} textAnchor="middle" fontSize="10" fontWeight={700} fill="var(--color-ink)" fontFamily={MONO}>
        sekarang
      </text>
      {rows.map((a, i) => {
        const y = pad.t + i * rowH;
        const cross = Number.isFinite(a.minutesLeft) ? now + a.minutesLeft * 60_000 : a.batch.mealAt;
        return (
          <g key={a.id}>
            <text x={pad.l - 10} y={y + 14} textAnchor="end" fontSize="11" fill="var(--color-ink)">
              {a.batch.school.name.length > 26 ? a.batch.school.name.slice(0, 25) + "…" : a.batch.school.name}
            </text>
            <rect x={x(now)} y={y + 4} width={Math.max(0, x(Math.min(cross, a.batch.mealAt)) - x(now))} height={13} rx={3} fill="var(--color-aman)" opacity={0.85} />
            <rect x={x(Math.min(cross, a.batch.mealAt))} y={y + 4} width={Math.max(0, x(a.batch.mealAt) - x(Math.min(cross, a.batch.mealAt)))} height={13} rx={3} fill="var(--color-buang)" />
            <circle cx={x(a.batch.mealAt)} cy={y + 10.5} r={4} fill="var(--color-ink)" />
          </g>
        );
      })}
    </svg>
  );
}

/** Portion funnel for the pilot dashboard: each step is a subset of the first, drawn to the same linear scale. */
export function Funnel({ steps }: { steps: { label: string; value: number; note: string; color: string }[] }) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <ol className="divide-y divide-line">
      {steps.map((s) => (
        <li key={s.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 py-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)_120px]">
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{s.label}</span>
            <span className="block truncate text-xs text-muted">{s.note}</span>
          </span>
          <span className="order-last col-span-2 block h-2 overflow-hidden rounded-full bg-paper-2 sm:order-none sm:col-span-1">
            <span className="block h-full rounded-full" style={{ width: `${Math.max(0.8, (s.value / max) * 100)}%`, background: s.color }} />
          </span>
          <span className="text-right">
            <span className="block font-mono text-lg tnum">{Math.round(s.value).toLocaleString("id-ID")}</span>
            <span className="block font-mono text-[11px] text-muted tnum">{((s.value / max) * 100).toFixed(s.value / max < 0.01 ? 2 : 1).replace(".", ",")}%</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
