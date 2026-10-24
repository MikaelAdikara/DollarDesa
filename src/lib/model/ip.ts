/**
 * Indeks Paparan (IP): accumulated Bacillus cereus growth along a batch's
 * time-temperature path, divided by the 3-log margin (10^2 -> 10^5 CFU/g).
 *
 * Ported 1:1 from DATA_PUBLIK_DETAK/02_kode/backtest.py:
 *  - Ratkowsky full model, B. cereus vegetative (Dong et al. 2025):
 *      sqrt(mu) = a (T - Tmin) [1 - exp(b (T - Tmax))]   mu in log10 CFU/g per hour
 *  - Newton cooling toward ambient: T(t) = Ta + (T0 - Ta) e^{-k t}
 *  - Baranyi-style lag: growth only starts once accumulated "work" passes h0
 *  - IP = growth / 3   (IP 1.0 = safety margin used up)
 */

export const RATKOWSKY = { a: 0.022, b: 0.424, Tmin: -2.568, Tmax: 47.108 } as const;
export const LOG_MARGIN = 3; // log10(10^5 / 10^2)
export const H0_RANGE = [0.5, 1.7] as const;
export const K_RANGE = [0.35, 1.0] as const; // per hour, ompreng biasa (ASUMSI)
export const T_COOKED = 65; // degC, assumed temperature when food leaves the kitchen

/** Growth-rate multiplier: covered rice vs hand-touched side dishes (backtest "tertutup" / "tersentuh"). */
export const SCENARIO_SCALE = { tertutup: 1.0, tersentuh: 1.5 } as const;
export type Scenario = keyof typeof SCENARIO_SCALE;

export const THRESHOLD = { waspada: 0.8, buang: 1.0 } as const;
export type Status = "aman" | "waspada" | "buang";

export function statusOf(ip: number): Status {
  if (ip >= THRESHOLD.buang) return "buang";
  if (ip >= THRESHOLD.waspada) return "waspada";
  return "aman";
}

/** Ratkowsky growth rate (log10 CFU/g per hour). Zero outside (Tmin, Tmax). */
export function mu(T: number): number {
  const { a, b, Tmin, Tmax } = RATKOWSKY;
  if (T <= Tmin || T >= Tmax) return 0;
  const s = a * (T - Tmin) * (1 - Math.exp(b * (T - Tmax)));
  return s > 0 ? s * s : 0;
}

/** Minutes of bacterial growth per wall-clock hour, relative to 24 degC (= 60 min). */
export function bacterialMinutesPerHour(T: number): number {
  return (60 * mu(T)) / mu(24);
}

/** Direct port of backtest.IP(): single path from T0 with constant ambient. */
export function ipSinglePath(gapH: number, Tamb: number, k: number, h0: number, scale = 1, T0 = T_COOKED, dt = 0.02): number {
  let t = 0;
  let work = 0;
  let grow = 0;
  while (t < gapH) {
    const T = Tamb + (T0 - Tamb) * Math.exp(-k * t);
    const m = mu(T) * scale;
    if (work < h0) work += m * dt;
    else grow += m * dt;
    t += dt;
  }
  return grow / LOG_MARGIN;
}

/** Small seeded PRNG (mulberry32) so Monte Carlo results are reproducible. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export interface MonteCarloResult {
  median: number;
  p5: number;
  p95: number;
  pOver: number; // P(IP >= 1)
  samples: number[];
}

/** Monte Carlo over unknown cooling constant k and lag h0, as in backtest.py. */
export function monteCarloIP(gapH: number, Tamb: number, scenario: Scenario, runs = 4000, seed = 23, kRange: readonly [number, number] = K_RANGE): MonteCarloResult {
  const r = rng(seed);
  const scale = SCENARIO_SCALE[scenario];
  const samples: number[] = new Array(runs);
  let over = 0;
  for (let i = 0; i < runs; i++) {
    const k = kRange[0] + (kRange[1] - kRange[0]) * r();
    const h0 = H0_RANGE[0] + (H0_RANGE[1] - H0_RANGE[0]) * r();
    const v = ipSinglePath(gapH, Tamb, k, h0, scale);
    samples[i] = v;
    if (v >= 1) over++;
  }
  const sorted = [...samples].sort((x, y) => x - y);
  return { median: quantile(sorted, 0.5), p5: quantile(sorted, 0.05), p95: quantile(sorted, 0.95), pOver: over / runs, samples };
}

// ---------------------------------------------------------------------------
// Measured path (what DETAK does in production)
// ---------------------------------------------------------------------------

/** One checkpoint reading: food core temperature + ambient (room/box) sensor at a time. */
export interface Reading {
  at: number; // epoch ms
  foodC: number;
  ambientC: number;
}

/**
 * Cooling constant estimated from two consecutive food readings under the
 * same ambient: k = -ln((T2 - Ta) / (T1 - Ta)) / dt. Falls back to the
 * conservative mid of K_RANGE when the data cannot identify k.
 */
export function estimateK(a: Reading, b: Reading): number {
  const dtH = (b.at - a.at) / 3.6e6;
  const Ta = (a.ambientC + b.ambientC) / 2;
  const num = b.foodC - Ta;
  const den = a.foodC - Ta;
  if (dtH <= 0 || den <= 0.5 || num <= 0.05 || num >= den) return (K_RANGE[0] + K_RANGE[1]) / 2;
  const k = -Math.log(num / den) / dtH;
  return Math.min(Math.max(k, 0.05), 3);
}

export interface PathPoint {
  t: number; // epoch ms
  foodC: number;
  ambientC: number;
  work: number; // accumulated scale * integral mu dt
}

export interface MeasuredResult {
  /** P95 IP at `until` (h0 at its 5th percentile -> conservative). */
  ipP95: number;
  /** Median IP at `until`. */
  ipMedian: number;
  status: Status;
  path: PathPoint[];
  /** Cumulative work at `until` (before lag). */
  work: number;
}

const H0_P5 = H0_RANGE[0] + 0.05 * (H0_RANGE[1] - H0_RANGE[0]);
const H0_P50 = (H0_RANGE[0] + H0_RANGE[1]) / 2;

/** Lag acts as a deduction on accumulated work: grow = max(0, W - h0). Exact for this model. */
export function ipFromWork(work: number, h0: number): number {
  return Math.max(0, work - h0) / LOG_MARGIN;
}

/**
 * Integrates growth along the measured path. Between readings the food cools
 * (Newton) from the measured temperature toward the sensor ambient with k fitted
 * from that pair of readings. After the last reading the path is projected with
 * the last ambient and last k (or `projectAmbientC` if given, e.g. classroom sensor).
 */
export function integrateMeasured(readings: Reading[], until: number, scenario: Scenario, opts: { projectAmbientC?: number; stepMin?: number } = {}): MeasuredResult {
  const scale = SCENARIO_SCALE[scenario];
  const stepH = (opts.stepMin ?? 3) / 60;
  const rs = [...readings].sort((x, y) => x.at - y.at);
  const path: PathPoint[] = [];
  if (rs.length === 0) {
    return { ipP95: 0, ipMedian: 0, status: "aman", path, work: 0 };
  }
  let work = 0;
  const ks: number[] = [];
  for (let i = 0; i + 1 < rs.length; i++) ks.push(estimateK(rs[i], rs[i + 1]));
  const lastK = ks.length ? ks[ks.length - 1] : (K_RANGE[0] + K_RANGE[1]) / 2;

  const segEnd = (i: number) => (i + 1 < rs.length ? rs[i + 1].at : Math.max(until, rs[i].at));
  for (let i = 0; i < rs.length; i++) {
    const start = rs[i];
    const end = Math.min(segEnd(i), until);
    if (end <= start.at && i + 1 < rs.length) continue;
    const isProjection = i === rs.length - 1;
    const Ta = isProjection ? (opts.projectAmbientC ?? start.ambientC) : (start.ambientC + rs[i + 1].ambientC) / 2;
    const k = isProjection ? lastK : ks[i];
    const totalH = Math.max(0, (end - start.at) / 3.6e6);
    const n = Math.max(1, Math.ceil(totalH / stepH));
    const dt = totalH / n;
    path.push({ t: start.at, foodC: start.foodC, ambientC: Ta, work });
    for (let j = 0; j < n; j++) {
      const tMid = (j + 0.5) * dt;
      const T = Ta + (start.foodC - Ta) * Math.exp(-k * tMid);
      work += mu(T) * scale * dt;
      const tEnd = (j + 1) * dt;
      path.push({ t: start.at + tEnd * 3.6e6, foodC: Ta + (start.foodC - Ta) * Math.exp(-k * tEnd), ambientC: Ta, work });
    }
    if (end >= until) break;
  }
  const ipP95 = ipFromWork(work, H0_P5);
  return { ipP95, ipMedian: ipFromWork(work, H0_P50), status: statusOf(ipP95), path, work };
}

/**
 * Minutes from `from` until the P95 IP reaches 1.0 if the batch keeps its
 * current trajectory. Returns 0 if already over, Infinity if not within `horizonH`.
 */
export function minutesUntilLimit(readings: Reading[], from: number, scenario: Scenario, opts: { projectAmbientC?: number; horizonH?: number } = {}): number {
  const now = integrateMeasured(readings, from, scenario, opts);
  if (now.ipP95 >= 1) return 0;
  const horizon = (opts.horizonH ?? 12) * 60;
  let lo = 0;
  let hi = horizon;
  const at = (min: number) => integrateMeasured(readings, from + min * 60_000, scenario, opts).ipP95;
  if (at(hi) < 1) return Infinity;
  for (let i = 0; i < 18; i++) {
    const mid = (lo + hi) / 2;
    if (at(mid) >= 1) hi = mid;
    else lo = mid;
  }
  return hi;
}
