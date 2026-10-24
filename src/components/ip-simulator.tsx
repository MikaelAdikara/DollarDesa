"use client";

import { useMemo, useState } from "react";
import { bacterialMinutesPerHour, H0_RANGE, K_RANGE, mu, quantile, rng, SCENARIO_SCALE, statusOf, T_COOKED, type Scenario } from "@/lib/model/ip";
import { InfoTip } from "./info-tip";

const RUNS = 600;
const DT = 0.025;
const HORIZON = 16;
const SAMPLE_EVERY = 0.25; // h

/** For each Monte Carlo sample, IP at every 15 minutes up to 16 h. */
function simulate(Tamb: number, scenario: Scenario, log0: number) {
  const r = rng(23);
  const scale = SCENARIO_SCALE[scenario];
  const need = 5 - log0;
  const nPts = Math.round(HORIZON / SAMPLE_EVERY) + 1;
  const series: number[][] = Array.from({ length: nPts }, () => new Array(RUNS));
  const every = Math.round(SAMPLE_EVERY / DT);
  for (let s = 0; s < RUNS; s++) {
    const k = K_RANGE[0] + (K_RANGE[1] - K_RANGE[0]) * r();
    const h0 = H0_RANGE[0] + (H0_RANGE[1] - H0_RANGE[0]) * r();
    let work = 0;
    let grow = 0;
    series[0][s] = 0;
    for (let i = 1, t = 0; i <= HORIZON / DT; i++, t += DT) {
      const T = Tamb + (T_COOKED - Tamb) * Math.exp(-k * t);
      const m = mu(T) * scale;
      if (work < h0) work += m * DT;
      else grow += m * DT;
      if (i % every === 0) series[i / every][s] = grow / need;
    }
  }
  return series.map((arr) => arr.slice().sort((a, b) => a - b));
}

export function IpSimulator() {
  const [T, setT] = useState(30);
  const [gap, setGap] = useState(5);
  const [scenario, setScenario] = useState<Scenario>("tersentuh");
  const [log0, setLog0] = useState(2);
  const sorted = useMemo(() => simulate(T, scenario, log0), [T, scenario, log0]);
  const idx = Math.round(gap / SAMPLE_EVERY);
  const atGap = sorted[idx];
  const p50 = quantile(atGap, 0.5);
  const p95 = quantile(atGap, 0.95);
  const pOver = atGap.filter((v) => v >= 1).length / atGap.length;
  const safeIdx = sorted.findIndex((arr) => quantile(arr, 0.95) >= 1);
  const safeH = safeIdx < 0 ? null : safeIdx * SAMPLE_EVERY;
  const status = statusOf(p95);
  const color = status === "buang" ? "#cc3418" : status === "waspada" ? "#d99a06" : "#2f8a45";

  // fan chart geometry
  const W = 640;
  const H = 260;
  const pad = { l: 40, r: 14, t: 14, b: 32 };
  const maxY = Math.max(1.6, Math.min(4, quantile(sorted[sorted.length - 1], 0.95) * 1.05));
  const x = (h: number) => pad.l + (h / HORIZON) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - Math.min(v, maxY) / maxY) * (H - pad.t - pad.b);
  const band = (lo: number, hi: number) => {
    const up = sorted.map((a, i) => `${x(i * SAMPLE_EVERY)},${y(quantile(a, hi))}`);
    const dn = sorted.map((a, i) => `${x(i * SAMPLE_EVERY)},${y(quantile(a, lo))}`).reverse();
    return `M${up.join("L")}L${dn.join("L")}Z`;
  };
  const line = (q: number) => "M" + sorted.map((a, i) => `${x(i * SAMPLE_EVERY)},${y(quantile(a, q))}`).join("L");

  // histogram at gap
  const bins = 24;
  const hMax = Math.max(1.5, quantile(atGap, 0.995));
  const counts = new Array(bins).fill(0);
  for (const v of atGap) counts[Math.min(bins - 1, Math.floor((v / hMax) * bins))]++;
  const cMax = Math.max(...counts);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <form className="card grid content-start gap-5 p-5" onSubmit={(e) => e.preventDefault()} data-tour="sim-controls">
        <Slider label="Suhu ruang" unit="°C" min={18} max={36} step={1} value={T} onChange={setT} hint={`${bacterialMinutesPerHour(T).toFixed(0)} menit pertumbuhan per 1 jam dinding`} />
        <Slider label="Jeda matang → disantap" unit="jam" min={1} max={16} step={0.25} value={gap} onChange={setGap} hint={gap > 4 ? `${(gap - 4).toFixed(2).replace(".", ",")} jam melewati aturan 4 jam` : "masih dalam aturan 4 jam"} />
        <fieldset>
          <legend className="text-xs font-semibold text-ink-2">Jenis makanan</legend>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {(["tertutup", "tersentuh"] as Scenario[]).map((s) => (
              <button key={s} type="button" aria-pressed={scenario === s} onClick={() => setScenario(s)} className={`rounded-lg px-2 py-2 text-xs font-semibold ${scenario === s ? "bg-ink text-white" : "bg-steel-2 text-ink-2"}`}>
                {s === "tertutup" ? "Nasi tertutup ×1,0" : "Lauk tersentuh ×1,5"}
              </button>
            ))}
          </div>
        </fieldset>
        <Slider label="Beban awal" unit="log CFU/g" min={1} max={4} step={1} value={log0} onChange={setLog0} hint={log0 === 2 ? "baku: dapur ber-SLHS (10²)" : log0 > 2 ? "kebersihan dapur buruk: margin menyempit" : "sangat higienis"} />
        <p className="text-xs leading-relaxed text-muted">
          {RUNS} simulasi Monte Carlo: laju pendinginan k ~ U({K_RANGE[0]}; {K_RANGE[1]}) per jam dan lag h₀ ~ U({H0_RANGE[0]}; {H0_RANGE[1]}). Ambang 10⁵ CFU/g.
        </p>
      </form>

      <div className="grid content-start gap-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-tour="sim-result">
          <Result label="IP P95" value={p95.toFixed(2).replace(".", ",")} color={color} info="Indeks Paparan yang dilampaui hanya oleh 5% simulasi terburuk. Dipakai DETAK untuk status supaya kekeliruan berpihak pada keselamatan." />
          <Result label="IP median" value={p50.toFixed(2).replace(".", ",")} info="Nilai tengah dari semua simulasi; kondisi yang paling mungkin." />
          <Result label="P(IP ≥ 1)" value={`${Math.round(pOver * 100)}%`} info="Persentase simulasi yang sudah melewati batas 10⁵ CFU/g pada jeda ini." />
          <Result label="Batas aman model" value={safeH === null ? "> 16 j" : `${safeH.toFixed(2).replace(".", ",")} j`} info="Jeda terpanjang sebelum IP P95 mencapai 1,0 untuk suhu dan jenis makanan ini. Bandingkan dengan aturan 4 jam." />
        </div>
        <div className="card p-4" data-tour="sim-fan">
          <p className="flex items-center text-sm font-semibold">
            Indeks Paparan terhadap jam sejak matang
            <InfoTip title="Kipas Monte Carlo">Pita gelap = 50% simulasi di tengah (P25–P75), pita terang = 90% (P5–P95). Garis tebal = P95. Garis putus vertikal = jeda yang dipilih; garis 4 jam = aturan BGN.</InfoTip>
          </p>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 h-auto w-full" role="img" aria-label="Kipas Monte Carlo Indeks Paparan">
            <rect x={pad.l} y={y(1)} width={W - pad.l - pad.r} height={y(0.8) - y(1)} fill="#fbf0cf" />
            <rect x={pad.l} y={pad.t} width={W - pad.l - pad.r} height={y(1) - pad.t} fill="#f9ddd5" opacity={0.6} />
            {[0, 2, 4, 6, 8, 10, 12, 14, 16].map((h) => (
              <text key={h} x={x(h)} y={H - 10} textAnchor="middle" fontSize="11" fill="#66715f" fontFamily="var(--font-jetbrains)">
                {h}j
              </text>
            ))}
            {[0, 0.5, 1, 1.5, 2, 3, 4].filter((v) => v <= maxY).map((v) => (
              <text key={v} x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#66715f" fontFamily="var(--font-jetbrains)">
                {String(v).replace(".", ",")}
              </text>
            ))}
            <path d={band(0.05, 0.95)} fill="#3b5a2c" opacity={0.18} />
            <path d={band(0.25, 0.75)} fill="#3b5a2c" opacity={0.35} />
            <path d={line(0.95)} fill="none" stroke={color} strokeWidth={3} />
            <line x1={x(4)} x2={x(4)} y1={pad.t} y2={H - pad.b} stroke="#17201a" strokeDasharray="6 4" />
            <text x={x(4) + 4} y={pad.t + 12} fontSize="10" fill="#17201a" fontFamily="var(--font-jetbrains)">
              aturan 4 jam
            </text>
            <line x1={x(gap)} x2={x(gap)} y1={pad.t} y2={H - pad.b} stroke="#e5600e" strokeWidth={2} />
            <circle cx={x(gap)} cy={y(p95)} r={6} fill={color} stroke="#fff" strokeWidth={2} />
            {safeH !== null ? <circle cx={x(safeH)} cy={y(1)} r={4} fill="#17201a" /> : null}
          </svg>
        </div>
        <div className="card p-4">
          <p className="flex items-center text-sm font-semibold">
            Sebaran {RUNS} simulasi pada jeda {gap.toString().replace(".", ",")} jam
            <InfoTip title="Kenapa sebaran, bukan satu angka">Laju pendinginan ompreng dan kondisi awal bakteri tidak diketahui pasti. Daripada menebak satu nilai, DETAK menjalankan banyak kemungkinan lalu mengambil persentil ke-95.</InfoTip>
          </p>
          <svg viewBox="0 0 640 120" className="mt-2 h-auto w-full" role="img" aria-label="Histogram hasil simulasi">
            {counts.map((c, i) => {
              const v = (i / bins) * hMax;
              const h = (c / cMax) * 90;
              return <rect key={i} x={40 + i * (580 / bins) + 1} y={100 - h} width={580 / bins - 2} height={h} rx={2} fill={v >= 1 ? "#cc3418" : v >= 0.8 ? "#d99a06" : "#2f8a45"} />;
            })}
            <line x1={40 + (1 / hMax) * 580} x2={40 + (1 / hMax) * 580} y1={4} y2={100} stroke="#17201a" strokeDasharray="4 3" />
            <text x={40 + (1 / hMax) * 580 + 4} y={14} fontSize="10" fontFamily="var(--font-jetbrains)" fill="#17201a">
              IP 1,0
            </text>
            {[0, 0.5, 1, 1.5, 2, 3].filter((v) => v <= hMax).map((v) => (
              <text key={v} x={40 + (v / hMax) * 580} y={116} textAnchor="middle" fontSize="10" fill="#66715f" fontFamily="var(--font-jetbrains)">
                {String(v).replace(".", ",")}
              </text>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}

function Slider({ label, unit, min, max, step, value, onChange, hint }: { label: string; unit: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void; hint: string }) {
  return (
    <label className="grid gap-1">
      <span className="flex items-baseline justify-between text-xs font-semibold text-ink-2">
        {label}
        <span className="font-mono text-lg text-ink tnum">
          {String(value).replace(".", ",")} <span className="text-xs text-muted">{unit}</span>
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="accent-[#3b5a2c]" />
      <span className="text-[11px] text-muted">{hint}</span>
    </label>
  );
}

function Result({ label, value, color, info }: { label: string; value: string; color?: string; info: string }) {
  return (
    <div className="card px-4 py-3">
      <p className="flex items-center text-xs font-semibold text-muted">
        {label}
        <InfoTip title={label}>{info}</InfoTip>
      </p>
      <p className="font-display text-3xl font-bold tnum" style={color ? { color } : undefined}>
        {value}
      </p>
    </div>
  );
}
