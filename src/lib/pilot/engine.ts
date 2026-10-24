/**
 * Turns raw checkpoint readings into the decisions DETAK shows:
 * Indeks Paparan now and at the planned meal time, status, early warnings,
 * data completeness, the kitchen-level inspection queue and the p-chart.
 */
import { integrateMeasured, minutesUntilLimit, rng, statusOf, type Reading, type Status } from "../model/ip";
import type { DetakEvent } from "../store";
import { previousSchoolDay } from "./clock";
import { PROVINCES, type Province, type ProvinceId, type Regency } from "./reference";
import { CHECKPOINTS, kitchenDay, kitchens, kitchensIn, type Checkpoint, type DayBatch, type Kitchen, type SimReading } from "./sim";

export type Phase = "dimasak" | "di_dapur" | "perjalanan" | "di_sekolah" | "disantap" | "ditahan";

export const PHASE_LABEL: Record<Phase, string> = {
  dimasak: "Sedang dimasak",
  di_dapur: "Matang, di dapur",
  perjalanan: "Dalam perjalanan",
  di_sekolah: "Tiba di sekolah",
  disantap: "Sudah disantap",
  ditahan: "Ditahan",
};

export interface StateReading extends SimReading {
  assumed?: boolean;
}

export interface BatchState {
  id: string;
  batch: DayBatch;
  province: Province;
  regency: Regency;
  readings: StateReading[];
  due: Checkpoint[];
  missing: Checkpoint[];
  phase: Phase;
  held: { by: string; role: string; reason: string; at: number } | null;
  ipNow: number;
  statusNow: Status;
  ipAtMeal: number;
  statusAtMeal: Status;
  rule4hAt: number;
  alert: "none" | "early" | "served_over";
}

const PROV = new Map(PROVINCES.map((p) => [p.id, p]));
const REG = new Map(PROVINCES.flatMap((p) => p.regencies.map((r) => [r.id, r] as const)));

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Evaluate one batch at time `now` given the events recorded for it. */
export function evaluateBatch(b: DayBatch, now: number, events: DetakEvent[] = []): BatchState {
  const province = PROV.get(b.kitchen.provinceId)!;
  const regency = REG.get(b.kitchen.regencyId)!;
  const byCp = new Map<Checkpoint, StateReading>();
  for (const cp of [1, 2, 3, 4] as Checkpoint[]) {
    const r = b.planned[cp];
    if (r && r.at <= now) byCp.set(cp, r);
  }
  let held: BatchState["held"] = null;
  for (const e of events) {
    if (e.batchId !== b.id) continue;
    if (e.kind === "reading" && e.at <= now) byCp.set(e.checkpoint, { checkpoint: e.checkpoint, at: e.at, foodC: e.foodC, ambientC: e.ambientC, source: "petugas" });
    if (e.kind === "hold" && e.at <= now) held = { by: e.actor, role: e.role, reason: e.reason, at: e.at };
    if (e.kind === "release" && e.at <= now) held = null;
  }

  const plannedAt: Record<Checkpoint, number> = { 1: b.cookedAt, 2: b.departAt, 3: b.arriveAt, 4: b.mealAt - 5 * 60_000 };
  const due = ([1, 2, 3, 4] as Checkpoint[]).filter((cp) => plannedAt[cp] <= now);
  const missing = due.filter((cp) => !byCp.has(cp));

  const readings = [...byCp.values()].sort((x, y) => x.at - y.at);
  // A missing "matang" reading is replaced by the conservative assumption used in the model (65 °C at the planned time).
  if (!byCp.has(1) && now >= b.cookedAt) {
    readings.unshift({ checkpoint: 1, at: b.cookedAt, foodC: 65, ambientC: b.schoolAmbientC + 2, source: "sim", assumed: true });
  }

  const asReadings: Reading[] = readings.map(({ at, foodC, ambientC }) => ({ at, foodC, ambientC }));
  const nowEval = integrateMeasured(asReadings, Math.min(now, b.mealAt), b.scenario, { projectAmbientC: b.schoolAmbientC, stepMin: 4 });
  const mealEval = integrateMeasured(asReadings, b.mealAt, b.scenario, { projectAmbientC: b.schoolAmbientC, stepMin: 4 });

  // Teachers hold a batch at the pre-meal check when the projection is over the limit (simulated adoption ~75%).
  const cp4 = byCp.get(4);
  if (!held && cp4 && cp4.source === "sim" && mealEval.ipP95 >= 1 && rng(hash(b.id + "hold"))() < 0.75) {
    held = { by: "Guru piket", role: "sekolah", reason: "IP ≥ 1,0 pada cek pra-konsumsi", at: cp4.at };
  }

  let phase: Phase = "dimasak";
  if (held) phase = "ditahan";
  else if (now >= b.mealAt) phase = "disantap";
  else if (now >= b.arriveAt) phase = "di_sekolah";
  else if (now >= b.departAt) phase = "perjalanan";
  else if (now >= b.cookedAt) phase = "di_dapur";

  const statusAtMeal = statusOf(mealEval.ipP95);
  let alert: BatchState["alert"] = "none";
  if (!held && statusAtMeal === "buang") alert = phase === "disantap" ? "served_over" : phase === "dimasak" ? "none" : "early";

  return {
    id: b.id,
    batch: b,
    province,
    regency,
    readings,
    due,
    missing,
    phase,
    held,
    ipNow: phase === "dimasak" ? 0 : nowEval.ipP95,
    statusNow: phase === "dimasak" ? "aman" : nowEval.status,
    ipAtMeal: mealEval.ipP95,
    statusAtMeal,
    rule4hAt: b.cookedAt + 4 * 3.6e6,
    alert,
  };
}

export interface BatchDetail extends BatchState {
  minutesLeft: number;
  path: { t: number; foodC: number; ip: number }[];
  pathMeal: { t: number; foodC: number; ip: number }[];
}

export function detailOf(s: BatchState, now: number): BatchDetail {
  const rs: Reading[] = s.readings.map(({ at, foodC, ambientC }) => ({ at, foodC, ambientC }));
  const end = Math.max(s.batch.mealAt + 90 * 60_000, now);
  const full = integrateMeasured(rs, end, s.batch.scenario, { projectAmbientC: s.batch.schoolAmbientC, stepMin: 5 });
  const toIp = (w: number) => Math.max(0, w - 0.56) / 3;
  const path = full.path.map((p) => ({ t: p.t, foodC: p.foodC, ip: toIp(p.work) }));
  const minutesLeft = s.phase === "dimasak" ? Infinity : minutesUntilLimit(rs, Math.min(now, s.batch.mealAt), s.batch.scenario, { projectAmbientC: s.batch.schoolAmbientC });
  return { ...s, minutesLeft, path, pathMeal: path.filter((p) => p.t <= s.batch.mealAt) };
}

// ---------------------------------------------------------------------------
// Day evaluation + caches
// ---------------------------------------------------------------------------

const dayCache = new Map<string, BatchState[]>();

export function evaluateDay(serviceDate: string, now: number, events: DetakEvent[], filter?: { province?: ProvinceId; regency?: string; kitchen?: string }): BatchState[] {
  const minuteKey = Math.floor(now / 60_000);
  const evKey = events.length ? events[events.length - 1].id + events.length : "0";
  const key = `${serviceDate}|${minuteKey}|${evKey}|${filter?.province ?? ""}|${filter?.regency ?? ""}|${filter?.kitchen ?? ""}`;
  const hit = dayCache.get(key);
  if (hit) return hit;
  const ks = filter?.kitchen ? kitchens().filter((k) => k.id === filter.kitchen) : kitchensIn(filter?.province, filter?.regency);
  const byBatch = new Map<string, DetakEvent[]>();
  for (const e of events) {
    const arr = byBatch.get(e.batchId) ?? [];
    arr.push(e);
    byBatch.set(e.batchId, arr);
  }
  const out: BatchState[] = [];
  for (const k of ks) for (const b of kitchenDay(k, serviceDate)) out.push(evaluateBatch(b, now, byBatch.get(b.id)));
  if (dayCache.size > 200) dayCache.clear();
  dayCache.set(key, out);
  return out;
}

/** Past school days, fully elapsed, simulation only (used for trends, p-chart, KPI). */
export function pastDays(serviceDate: string, n: number): string[] {
  const out: string[] = [];
  let d = serviceDate;
  for (let i = 0; i < n; i++) {
    d = previousSchoolDay(d);
    out.push(d);
  }
  return out.reverse();
}

const histCache = new Map<string, BatchState[]>();
export function historyDay(serviceDate: string, province?: ProvinceId): BatchState[] {
  const key = `${serviceDate}|${province ?? ""}`;
  const hit = histCache.get(key);
  if (hit) return hit;
  const endOfDay = Date.parse(`${serviceDate}T23:59:00+07:00`);
  const out = evaluateDay(serviceDate, endOfDay, [], { province });
  if (histCache.size > 120) histCache.clear();
  histCache.set(key, out);
  return out;
}

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

export interface Summary {
  batches: number;
  portions: number;
  byStatus: Record<Status, number>;
  portionsByStatus: Record<Status, number>;
  early: number;
  servedOver: number;
  held: number;
  heldPortions: number;
  due: number;
  recorded: number;
  completeness: number;
  phases: Record<Phase, number>;
}

export function summarize(states: BatchState[]): Summary {
  const s: Summary = {
    batches: states.length,
    portions: 0,
    byStatus: { aman: 0, waspada: 0, buang: 0 },
    portionsByStatus: { aman: 0, waspada: 0, buang: 0 },
    early: 0,
    servedOver: 0,
    held: 0,
    heldPortions: 0,
    due: 0,
    recorded: 0,
    completeness: 1,
    phases: { dimasak: 0, di_dapur: 0, perjalanan: 0, di_sekolah: 0, disantap: 0, ditahan: 0 },
  };
  for (const b of states) {
    const p = b.batch.school.portions;
    s.portions += p;
    s.byStatus[b.statusAtMeal]++;
    s.portionsByStatus[b.statusAtMeal] += p;
    if (b.alert === "early") s.early++;
    if (b.alert === "served_over") s.servedOver++;
    if (b.held) {
      s.held++;
      s.heldPortions += p;
    }
    s.due += b.due.length;
    s.recorded += b.due.length - b.missing.length;
    s.phases[b.phase]++;
  }
  s.completeness = s.due ? s.recorded / s.due : 1;
  return s;
}

export interface KitchenRow {
  kitchen: Kitchen;
  regency: Regency;
  batches: number;
  maxIpAtMeal: number;
  alerts: number;
  servedOver: number;
  missing: number;
  due: number;
}

export function kitchenRows(states: BatchState[]): KitchenRow[] {
  const m = new Map<string, KitchenRow>();
  for (const s of states) {
    const k = s.batch.kitchen;
    const row = m.get(k.id) ?? { kitchen: k, regency: s.regency, batches: 0, maxIpAtMeal: 0, alerts: 0, servedOver: 0, missing: 0, due: 0 };
    row.batches++;
    row.maxIpAtMeal = Math.max(row.maxIpAtMeal, s.ipAtMeal);
    if (s.alert === "early") row.alerts++;
    if (s.alert === "served_over") row.servedOver++;
    row.missing += s.missing.length;
    row.due += s.due.length;
    m.set(k.id, row);
  }
  return [...m.values()];
}

// --- p-chart (deck slide B7): n = 20 ompreng sampled per kitchen per day, p0 = 2 % ---------------
export const PCHART = { n: 20, p0: 0.02, ucl: 0.02 + 3 * Math.sqrt((0.02 * 0.98) / 20) } as const; // 0.114 -> signal at >= 3/20

export interface PPoint {
  date: string;
  over: number;
  n: number;
  p: number;
  signal: boolean;
}

/** Each sampled ompreng = batch P95 IP at meal with ±12 % lognormal spread between containers. */
function sampleCount(states: BatchState[], seed: string): number {
  if (!states.length) return 0;
  const r = rng(hash(seed));
  let over = 0;
  for (let i = 0; i < PCHART.n; i++) {
    const s = states[i % states.length];
    const u1 = Math.max(1e-9, r());
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * r());
    if (s.ipAtMeal * Math.exp(0.12 * z) >= 1) over++;
  }
  return over;
}

export function pChart(kitchenId: string, serviceDate: string, todayStates: BatchState[] | null, days = 20): PPoint[] {
  const k = kitchens().find((x) => x.id === kitchenId);
  if (!k) return [];
  const pts: PPoint[] = [];
  for (const d of pastDays(serviceDate, days)) {
    const states = evaluateDay(d, Date.parse(`${d}T23:59:00+07:00`), [], { kitchen: k.id });
    const over = sampleCount(states, d + k.id);
    pts.push({ date: d, over, n: PCHART.n, p: over / PCHART.n, signal: over / PCHART.n > PCHART.ucl });
  }
  if (todayStates) {
    const ts = todayStates.filter((s) => s.batch.kitchen.id === k.id && (s.phase === "disantap" || s.phase === "ditahan"));
    if (ts.length) {
      const over = sampleCount(ts, serviceDate + k.id);
      pts.push({ date: serviceDate, over, n: PCHART.n, p: over / PCHART.n, signal: over / PCHART.n > PCHART.ucl });
    }
  }
  return pts;
}

// --- Inspection queue: AHP–SAW at kitchen level (deck B7 weights, adapted criteria) --------------
export const AHP_WEIGHTS = { riwayat: 0.4658, kepatuhan: 0.2771, skala: 0.1611, keterpencilan: 0.096 } as const;

export interface QueueRow extends KitchenRow {
  score: number;
  criteria: { riwayat: number; kepatuhan: number; skala: number; keterpencilan: number };
  exceedRate: number;
  signalDays: number;
  reasons: string[];
}

export function inspectionQueue(province: ProvinceId, serviceDate: string, todayStates: BatchState[], historyDays = 10): QueueRow[] {
  const rows = kitchenRows(todayStates.filter((s) => s.province.id === province));
  const hist = pastDays(serviceDate, historyDays).map((d) => historyDay(d, province));
  const ex = new Map<string, { over: number; total: number; signal: number; missing: number; due: number }>();
  hist.forEach((day, i) => {
    const perK = new Map<string, BatchState[]>();
    for (const s of day) {
      const arr = perK.get(s.batch.kitchen.id) ?? [];
      arr.push(s);
      perK.set(s.batch.kitchen.id, arr);
    }
    for (const [kid, ss] of perK) {
      const e = ex.get(kid) ?? { over: 0, total: 0, signal: 0, missing: 0, due: 0 };
      e.over += ss.filter((s) => s.ipAtMeal >= 1).length;
      e.total += ss.length;
      e.missing += ss.reduce((a, s) => a + s.missing.length, 0);
      e.due += ss.reduce((a, s) => a + s.due.length, 0);
      if (sampleCount(ss, `${hist.length}-${i}-${kid}`) / PCHART.n > PCHART.ucl) e.signal++;
      ex.set(kid, e);
    }
  });
  const maxBen = Math.max(...rows.map((r) => r.kitchen.beneficiaries), 1);
  const raw = rows.map((r) => {
    const e = ex.get(r.kitchen.id) ?? { over: 0, total: 1, signal: 0, missing: 0, due: 1 };
    const exceedRate = e.over / Math.max(1, e.total);
    const missRate = (e.missing + r.missing) / Math.max(1, e.due + r.due);
    return { r, e, exceedRate, missRate };
  });
  const maxEx = Math.max(...raw.map((x) => x.exceedRate), 0.01);
  return raw
    .map(({ r, e, exceedRate, missRate }) => {
      const criteria = {
        riwayat: Math.min(1, exceedRate / maxEx),
        kepatuhan: Math.min(1, (r.kitchen.slhs ? 0 : 0.6) + Math.min(0.4, missRate * 4)),
        skala: r.kitchen.beneficiaries / maxBen,
        keterpencilan: r.regency.remoteness,
      };
      const score = AHP_WEIGHTS.riwayat * criteria.riwayat + AHP_WEIGHTS.kepatuhan * criteria.kepatuhan + AHP_WEIGHTS.skala * criteria.skala + AHP_WEIGHTS.keterpencilan * criteria.keterpencilan;
      const reasons: string[] = [];
      if (r.alerts) reasons.push(`${r.alerts} batch diproyeksikan lewat ambang hari ini`);
      if (r.servedOver) reasons.push(`${r.servedOver} batch tersaji di atas ambang`);
      if (e.signal) reasons.push(`sinyal kartu kendali ${e.signal}× dalam ${historyDays} hari`);
      if (!r.kitchen.slhs) reasons.push("belum ber-SLHS");
      if (missRate > 0.06) reasons.push(`data titik cek bolong ${(missRate * 100).toFixed(0)}%`);
      return { ...r, score, criteria, exceedRate, signalDays: e.signal, reasons };
    })
    .sort((a, b) => b.alerts + b.servedOver - (a.alerts + a.servedOver) || b.score - a.score);
}

export function checkpointLabel(cp: Checkpoint) {
  return CHECKPOINTS[cp].short;
}
