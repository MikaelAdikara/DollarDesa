/**
 * Deterministic stand-in for the SIPGN master data feed + the field devices.
 *
 * In production these come from SIPGN (kitchens, schools, delivery plan) and
 * from the thermometers / room sensors / CCTV timestamps. For the prototype we
 * generate them from the real provincial totals in reference.ts with a seeded
 * RNG, so every visitor sees the same kitchens and the same day.
 */
import { localToEpoch } from "./clock";
import { allocateSppg, PROVINCES, type Province, type ProvinceId, type Regency } from "./reference";
import { rng, type Reading, type Scenario } from "../model/ip";
import geo from "../geo/indonesia.json";

type GeoFeature = { c: string; p: string | null; r: number[][][] };
const LAND = new Map<string, number[][][]>();
for (const f of (geo as { features: GeoFeature[] }).features) {
  if (!f.p) continue;
  const key = f.p.replace("~", "");
  LAND.set(key, [...(LAND.get(key) ?? []), ...f.r]);
}

function onLand(provinceId: string, lon: number, lat: number): boolean {
  const rings = LAND.get(provinceId);
  if (!rings) return true;
  return rings.some((ring) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi) inside = !inside;
    }
    return inside;
  });
}

export type Level = "PAUD" | "SD" | "SMP" | "SMA" | "3B";

export interface School {
  id: string;
  name: string;
  level: Level;
  kitchenId: string;
  portions: number;
  travelMin: number;
  /** Planned serving time, minutes after local midnight. */
  mealMin: number;
}

export interface Kitchen {
  id: string; // e.g. 3404-017
  name: string;
  provinceId: ProvinceId;
  regencyId: string;
  district: string;
  lon: number;
  lat: number;
  beneficiaries: number;
  slhs: boolean;
  /** 0 disciplined .. 1 habitually slow to send food out. */
  delayHabit: number;
  /** Probability a scheduled checkpoint reading is missing. */
  missRate: number;
  /** Months since the kitchen started operating. */
  ageMonths: number;
  schools: School[];
}

export type Checkpoint = 1 | 2 | 3 | 4;
export const CHECKPOINTS: Record<Checkpoint, { short: string; label: string; who: string; device: string }> = {
  1: { short: "Matang", label: "Dapur: suhu awal setelah matang", who: "Petugas SPPG", device: "Termometer tusuk" },
  2: { short: "Berangkat", label: "Berangkat: suhu ruang penyimpanan", who: "Petugas SPPG", device: "Sensor suhu ruang + CCTV" },
  3: { short: "Tiba", label: "Tiba: cek suhu sebelum dimuat ke kelas", who: "Penerima di sekolah", device: "Termometer tusuk" },
  4: { short: "Pra-konsumsi", label: "Pra-konsumsi: cek ulang & logbook", who: "Guru piket", device: "Termometer tusuk + logbook" },
};

export interface SimReading extends Reading {
  checkpoint: Checkpoint;
  source: "sim" | "petugas";
}

export interface DayBatch {
  id: string;
  serviceDate: string;
  school: School;
  kitchen: Kitchen;
  tzOffset: number;
  scenario: Scenario;
  menu: string;
  cookStart: number;
  cookedAt: number;
  departAt: number;
  arriveAt: number;
  mealAt: number;
  /** All four planned readings (some may be missing = undefined). Values are what the device would read. */
  planned: Partial<Record<Checkpoint, SimReading>>;
  /** Ambient at the school (classroom sensor), used to project after the last reading. */
  schoolAmbientC: number;
}

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const LEVEL_MEAL: Record<Level, [number, number]> = {
  PAUD: [8 * 60 + 30, 9 * 60],
  "3B": [9 * 60, 10 * 60],
  SD: [9 * 60 + 30, 10 * 60 + 15],
  SMP: [10 * 60, 11 * 60],
  SMA: [11 * 60, 12 * 60],
};

const MENUS: { name: string; scenario: Scenario }[] = [
  { name: "Nasi, ayam goreng, tumis buncis, pisang", scenario: "tersentuh" },
  { name: "Nasi, telur balado, sayur sop, jeruk", scenario: "tersentuh" },
  { name: "Nasi, ikan tongkol suwir, capcay, semangka", scenario: "tersentuh" },
  { name: "Nasi, tempe bacem, sayur bening bayam, susu", scenario: "tersentuh" },
  { name: "Nasi kuning, ayam suwir, urap, pepaya", scenario: "tersentuh" },
  { name: "Nasi, rendang daging, gulai nangka, pisang", scenario: "tersentuh" },
  { name: "Nasi, ikan kuah kuning, tumis kangkung, pepaya", scenario: "tersentuh" },
];

let KITCHENS: Kitchen[] | null = null;
let BY_ID: Map<string, Kitchen> | null = null;

function buildKitchens(): Kitchen[] {
  const out: Kitchen[] = [];
  for (const p of PROVINCES) {
    const alloc = allocateSppg(p);
    for (const reg of p.regencies) {
      const n = alloc.get(reg.id) ?? 0;
      for (let i = 0; i < n; i++) out.push(makeKitchen(p, reg, i, n));
    }
  }
  return out;
}

function makeKitchen(p: Province, reg: Regency, i: number, n: number): Kitchen {
  const id = `${reg.id}-${String(i + 1).padStart(3, "0")}`;
  const r = rng(hash(id));
  const district = reg.districts[i % reg.districts.length];
  const sameDistrict = Math.floor(i / reg.districts.length) + 1;
  const spread = 0.05 + 0.25 * reg.remoteness + Math.min(0.15, n / 2000);
  let lon = reg.lon;
  let lat = reg.lat;
  for (let tries = 0; tries < 25; tries++) {
    const cand = [reg.lon + (r() - 0.5) * spread * 1.4, reg.lat + (r() - 0.5) * spread] as const;
    if (onLand(p.id, cand[0], cand[1])) {
      [lon, lat] = cand;
      break;
    }
  }
  const beneficiaries = Math.round(p.beneficiariesPerSppg * (0.7 + 0.6 * r()));
  const slhs = r() < (p.id === "PAPUA" ? 0.38 : p.id === "SUMBAR" ? 0.58 : 0.55);
  const delayHabit = Math.min(1, Math.pow(r(), 2.6) * (1 + reg.remoteness));
  const missRate = 0.015 + 0.06 * reg.remoteness + (slhs ? 0 : 0.02) + 0.03 * Math.pow(r(), 4);
  const ageMonths = Math.round(2 + 18 * r());
  const kitchen: Kitchen = { id, name: `SPPG ${district} ${sameDistrict}`, provinceId: p.id, regencyId: reg.id, district, lon, lat, beneficiaries, slhs, delayHabit, missRate, ageMonths, schools: [] };

  // Roughly 300 portions per delivery group; one group is the 3B (balita / ibu hamil & menyusui) round via posyandu.
  const b3 = Math.max(300, Math.round(beneficiaries * 0.12));
  let remaining = beneficiaries - b3;
  const levels: Level[] = [];
  while (remaining > 120) {
    const roll = r();
    const lvl: Level = roll < 0.12 ? "PAUD" : roll < 0.62 ? "SD" : roll < 0.84 ? "SMP" : "SMA";
    const portions = Math.min(remaining, Math.round((lvl === "PAUD" ? 90 : lvl === "SD" ? 260 : 360) * (0.7 + 0.6 * r())));
    levels.push(lvl);
    kitchen.schools.push(makeSchool(kitchen, reg, lvl, portions, kitchen.schools.length, r));
    remaining -= portions;
  }
  kitchen.schools.push(makeSchool(kitchen, reg, "3B", b3 + Math.max(0, remaining), kitchen.schools.length, r));
  return kitchen;
}

function makeSchool(k: Kitchen, reg: Regency, level: Level, portions: number, idx: number, r: () => number): School {
  const num = 1 + Math.floor(r() * 6);
  // Schools sit in the kitchen's own district or the next one along the list (a short route).
  const home = reg.districts.indexOf(k.district);
  const district = reg.districts[(home + (r() < 0.7 ? 0 : 1)) % reg.districts.length];
  const name = level === "3B" ? `Posyandu ${district} (3B)` : level === "PAUD" ? `TK Pertiwi ${district} ${num}` : `${level}N ${num} ${district}`;
  const baseTravel = 8 + 22 * r() + 70 * reg.remoteness * r();
  const [m0, m1] = LEVEL_MEAL[level];
  return {
    id: `${k.id}-${idx + 1}`,
    name,
    level,
    kitchenId: k.id,
    portions,
    travelMin: Math.round(baseTravel),
    mealMin: Math.round(m0 + (m1 - m0) * r()),
  };
}

export function kitchens(): Kitchen[] {
  if (!KITCHENS) {
    KITCHENS = buildKitchens();
    BY_ID = new Map(KITCHENS.map((k) => [k.id, k]));
  }
  return KITCHENS;
}

export function kitchenById(id: string): Kitchen | undefined {
  kitchens();
  return BY_ID!.get(id);
}

export function kitchensIn(provinceId?: ProvinceId, regencyId?: string): Kitchen[] {
  return kitchens().filter((k) => (!provinceId || k.provinceId === provinceId) && (!regencyId || k.regencyId === regencyId));
}

const PROV = new Map(PROVINCES.map((p) => [p.id, p]));
const REG = new Map(PROVINCES.flatMap((p) => p.regencies.map((r) => [r.id, r] as const)));

/** Diurnal ambient profile: cooler at dawn, peaks around 13:00. */
export function ambientAt(baseC: number, localMin: number): number {
  const h = localMin / 60;
  return baseC + 2.4 * Math.sin(((h - 7.5) / 24) * 2 * Math.PI) - 0.6;
}

/** Newton cooling for the simulated "truth" between two times. */
function cool(T0: number, Ta: number, k: number, hours: number) {
  return Ta + (T0 - Ta) * Math.exp(-k * hours);
}

const dayCache = new Map<string, DayBatch[]>();

/** All delivery batches of one kitchen for one service day. */
export function kitchenDay(k: Kitchen, serviceDate: string): DayBatch[] {
  const key = `${serviceDate}|${k.id}`;
  const hit = dayCache.get(key);
  if (hit) return hit;
  const prov = PROV.get(k.provinceId)!;
  const reg = REG.get(k.regencyId)!;
  const r = rng(hash(key));
  const tz = prov.tzOffset;
  const menu = MENUS[hash(serviceDate + k.provinceId) % MENUS.length];
  // Bad days: a kitchen sometimes starts late and has to cook earlier / send late.
  const badDay = r() < 0.015 + 0.07 * k.delayHabit;
  const cookStartMin = (badDay ? 60 : 120) + Math.round(r() * 75);
  const firstCooked = cookStartMin + 210 + Math.round(r() * 40);
  const sorted = [...k.schools].sort((a, b) => a.mealMin - a.travelMin - (b.mealMin - b.travelMin));
  const out: DayBatch[] = sorted.map((s, i) => {
    const cookedMin = firstCooked + i * (12 + Math.round(r() * 10));
    // Portioning + waiting for the vehicle. Habitual delay and bad days stretch it.
    const plannedDepart = s.mealMin - s.travelMin - 20 - Math.round(r() * 25);
    const departMin = Math.max(cookedMin + 25, plannedDepart + Math.round(k.delayHabit * 50 * r()) + (badDay ? 45 + Math.round(45 * r()) : 0));
    const arriveMin = departMin + Math.round(s.travelMin * (0.85 + 0.4 * r()));
    const mealMin = Math.max(s.mealMin, arriveMin + 10);

    const kTrue = 0.35 + 0.65 * r();
    const kitchenAmb = ambientAt(reg.ambientC, cookedMin) + 2 + r() * 1.5;
    const boxAmb = ambientAt(reg.ambientC, departMin) + 1 + r() * 2;
    const roomAmb = ambientAt(reg.ambientC, mealMin) + (r() - 0.4);
    const T1 = 62 + r() * 6;
    const T2 = cool(T1, kitchenAmb, kTrue, (departMin - cookedMin) / 60);
    const T3 = cool(T2, boxAmb, kTrue, (arriveMin - departMin) / 60);
    const T4 = cool(T3, roomAmb, kTrue, (mealMin - 5 - arriveMin) / 60);

    const at = (min: number) => localToEpoch(serviceDate, min, tz);
    const noise = () => (r() - 0.5) * 0.8;
    const miss = (extra: number) => r() < k.missRate + extra;
    const planned: Partial<Record<Checkpoint, SimReading>> = {};
    if (!miss(0)) planned[1] = { checkpoint: 1, at: at(cookedMin), foodC: round1(T1 + noise()), ambientC: round1(kitchenAmb), source: "sim" };
    if (!miss(0.01)) planned[2] = { checkpoint: 2, at: at(departMin), foodC: round1(T2 + noise()), ambientC: round1(boxAmb), source: "sim" };
    if (!miss(0.02 + reg.remoteness * 0.03)) planned[3] = { checkpoint: 3, at: at(arriveMin), foodC: round1(T3 + noise()), ambientC: round1(roomAmb), source: "sim" };
    if (!miss(0.03)) planned[4] = { checkpoint: 4, at: at(mealMin - 5), foodC: round1(T4 + noise()), ambientC: round1(roomAmb), source: "sim" };

    return {
      id: `${serviceDate.replaceAll("-", "")}-${s.id}`,
      serviceDate,
      school: s,
      kitchen: k,
      tzOffset: tz,
      scenario: menu.scenario,
      menu: menu.name,
      cookStart: at(cookStartMin),
      cookedAt: at(cookedMin),
      departAt: at(departMin),
      arriveAt: at(arriveMin),
      mealAt: at(mealMin),
      planned,
      schoolAmbientC: round1(roomAmb),
    };
  });
  if (dayCache.size > 40000) dayCache.clear();
  dayCache.set(key, out);
  return out;
}

function round1(x: number) {
  return Math.round(x * 10) / 10;
}

/** Parse "20261026-3404-017-3" -> parts. */
export function parseBatchId(id: string): { serviceDate: string; kitchenId: string; schoolId: string } | null {
  const m = /^(\d{4})(\d{2})(\d{2})-(\d{4}-\d{3})-(\d{1,2})$/.exec(id);
  if (!m) return null;
  return { serviceDate: `${m[1]}-${m[2]}-${m[3]}`, kitchenId: m[4], schoolId: `${m[4]}-${m[5]}` };
}

export function batchById(id: string): DayBatch | undefined {
  const p = parseBatchId(id);
  if (!p) return undefined;
  const k = kitchenById(p.kitchenId);
  if (!k) return undefined;
  return kitchenDay(k, p.serviceDate).find((b) => b.school.id === p.schoolId);
}
