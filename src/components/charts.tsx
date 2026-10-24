import { fmtClock } from "@/lib/pilot/clock";
import type { PPoint } from "@/lib/pilot/engine";

/**
 * One batch's journey: food temperature (left axis) and Indeks Paparan (right axis)
 * against local time, with the four checkpoints, the meal time, the 4-hour rule and "now".
 */
export function BatchJourneyChart(props: {
  path: { t: number; foodC: number; ip: number }[];
  readings: { checkpoint: number; at: number; foodC: number; source: string }[];
  cookedAt: number;
  mealAt: number;
  rule4hAt: number;
  now: number;
  tzOffset: number;
}) {
  const { path, readings, cookedAt, mealAt, rule4hAt, now, tzOffset } = props;
  if (!path.length) return null;
  const W = 640;
  const H = 260;
  const pad = { l: 40, r: 44, t: 18, b: 34 };
  const t0 = cookedAt - 15 * 60_000;
  const t1 = Math.max(mealAt + 60 * 60_000, rule4hAt + 20 * 60_000);
  const x = (t: number) => pad.l + ((t - t0) / (t1 - t0)) * (W - pad.l - pad.r);
  const yT = (c: number) => pad.t + (1 - (c - 20) / 50) * (H - pad.t - pad.b);
  const ipMax = Math.max(1.4, ...path.map((p) => p.ip));
  const yI = (v: number) => pad.t + (1 - v / ipMax) * (H - pad.t - pad.b);
  const pts = path.filter((p) => p.t >= t0 && p.t <= t1);
  const tempPath = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${yT(p.foodC).toFixed(1)}`).join("");
  const past = pts.filter((p) => p.t <= Math.min(now, mealAt));
  const future = pts.filter((p) => p.t >= Math.min(now, mealAt));
  const ipLine = (arr: typeof pts) => arr.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${yI(p.ip).toFixed(1)}`).join("");
  const hours: number[] = [];
  for (let t = Math.ceil(t0 / 3.6e6) * 3.6e6; t <= t1; t += 3.6e6) hours.push(t);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Grafik suhu makanan dan Indeks Paparan sepanjang perjalanan batch">
      <rect x={pad.l} y={yI(1)} width={W - pad.l - pad.r} height={yI(0.8) - yI(1)} fill="#fbf0cf" opacity={0.7} />
      <rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={yI(1) - pad.t} fill="#f9ddd5" opacity={0.55} />
      {hours.map((t) => (
        <g key={t}>
          <line x1={x(t)} x2={x(t)} y1={pad.t} y2={H - pad.b} stroke="#cfd5cc" strokeDasharray="2 4" />
          <text x={x(t)} y={H - pad.b + 16} textAnchor="middle" fontSize="11" fill="#66715f" fontFamily="var(--font-jetbrains)">
            {fmtClock(t, tzOffset)}
          </text>
        </g>
      ))}
      {[20, 30, 40, 50, 60, 70].map((c) => (
        <text key={c} x={pad.l - 6} y={yT(c) + 4} textAnchor="end" fontSize="10" fill="#66715f" fontFamily="var(--font-jetbrains)">
          {c}°
        </text>
      ))}
      {[0, 0.5, 1].map((v) => (
        <text key={v} x={W - pad.r + 6} y={yI(v) + 4} fontSize="10" fill="#66715f" fontFamily="var(--font-jetbrains)">
          {v.toFixed(1).replace(".", ",")}
        </text>
      ))}
      <line x1={x(rule4hAt)} x2={x(rule4hAt)} y1={pad.t} y2={H - pad.b} stroke="#17201a" strokeWidth={1.5} strokeDasharray="6 4" />
      <text x={x(rule4hAt) + 4} y={pad.t + 12} fontSize="10" fill="#17201a" fontFamily="var(--font-jetbrains)">
        batas 4 jam
      </text>
      <line x1={x(mealAt)} x2={x(mealAt)} y1={pad.t} y2={H - pad.b} stroke="#3b5a2c" strokeWidth={2} />
      <text x={x(mealAt) + 4} y={H - pad.b - 6} fontSize="10" fill="#3b5a2c" fontWeight={700} fontFamily="var(--font-jetbrains)">
        makan
      </text>
      {now > t0 && now < t1 ? (
        <g>
          <line x1={x(now)} x2={x(now)} y1={pad.t} y2={H - pad.b} stroke="#e5600e" strokeWidth={2} />
          <text x={x(now) - 4} y={pad.t + 12} textAnchor="end" fontSize="10" fill="#e5600e" fontWeight={700} fontFamily="var(--font-jetbrains)">
            sekarang
          </text>
        </g>
      ) : null}
      <path d={tempPath} fill="none" stroke="#66715f" strokeWidth={2} />
      <path d={ipLine(past)} fill="none" stroke="#17201a" strokeWidth={3} />
      <path d={ipLine(future)} fill="none" stroke="#17201a" strokeWidth={2.5} strokeDasharray="5 4" opacity={0.6} />
      {readings.map((r) => (
        <g key={r.checkpoint}>
          <circle cx={x(r.at)} cy={yT(r.foodC)} r={7} fill={r.source === "asumsi" ? "#fff" : "#3b5a2c"} stroke="#3b5a2c" strokeWidth={2} />
          <text x={x(r.at)} y={yT(r.foodC) + 3.5} textAnchor="middle" fontSize="9" fontWeight={700} fill={r.source === "asumsi" ? "#3b5a2c" : "#fff"}>
            {r.checkpoint}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function PChart({ points, ucl, p0 }: { points: PPoint[]; ucl: number; p0: number }) {
  if (!points.length) return null;
  const W = 640;
  const H = 180;
  const pad = { l: 36, r: 12, t: 14, b: 30 };
  const max = Math.max(0.3, ...points.map((p) => p.p));
  const x = (i: number) => pad.l + (i / Math.max(1, points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Kartu kendali p: proporsi ompreng lewat ambang per hari">
      <line x1={pad.l} x2={W - pad.r} y1={y(ucl)} y2={y(ucl)} stroke="#cc3418" strokeDasharray="6 4" />
      <text x={W - pad.r} y={y(ucl) - 4} textAnchor="end" fontSize="10" fill="#cc3418" fontFamily="var(--font-jetbrains)">
        UCL {ucl.toFixed(3).replace(".", ",")} (≥ 3/20)
      </text>
      <line x1={pad.l} x2={W - pad.r} y1={y(p0)} y2={y(p0)} stroke="#3b5a2c" strokeDasharray="2 4" />
      <text x={pad.l + 4} y={y(p0) - 4} fontSize="10" fill="#3b5a2c" fontFamily="var(--font-jetbrains)">
        p₀ 2%
      </text>
      <polyline points={points.map((p, i) => `${x(i)},${y(p.p)}`).join(" ")} fill="none" stroke="#17201a" strokeWidth={1.8} />
      {points.map((p, i) => (
        <g key={p.date}>
          <circle cx={x(i)} cy={y(p.p)} r={p.signal ? 5.5 : 3.5} fill={p.signal ? "#cc3418" : "#17201a"} />
          {i % 4 === 0 || i === points.length - 1 ? (
            <text x={x(i)} y={H - 10} textAnchor="middle" fontSize="10" fill="#66715f" fontFamily="var(--font-jetbrains)">
              {p.date.slice(8)}/{p.date.slice(5, 7)}
            </text>
          ) : null}
        </g>
      ))}
      {[0, 0.1, 0.2].filter((v) => v <= max).map((v) => (
        <text key={v} x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#66715f" fontFamily="var(--font-jetbrains)">
          {(v * 100).toFixed(0)}%
        </text>
      ))}
    </svg>
  );
}

export function CriteriaBars({ criteria, weights }: { criteria: Record<string, number>; weights: Record<string, number> }) {
  const labels: Record<string, string> = { riwayat: "Riwayat lewat ambang", kepatuhan: "SLHS & kelengkapan data", skala: "Skala penerima", keterpencilan: "Keterpencilan" };
  return (
    <dl className="grid gap-1">
      {Object.keys(weights).map((k) => (
        <div key={k} className="grid grid-cols-[1fr_90px] items-center gap-2 text-xs">
          <dt className="truncate text-ink-2">
            {labels[k]} <span className="font-mono text-muted">×{weights[k].toFixed(3).replace(".", ",")}</span>
          </dt>
          <dd className="h-2 overflow-hidden rounded-full bg-steel-2">
            <span className="block h-full rounded-full bg-daun" style={{ width: `${Math.round((criteria[k] ?? 0) * 100)}%` }} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
