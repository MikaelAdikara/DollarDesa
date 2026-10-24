import { describe, expect, it } from "vitest";
import { bacterialMinutesPerHour, estimateK, integrateMeasured, ipFromWork, ipSinglePath, minutesUntilLimit, monteCarloIP, mu, statusOf } from "./ip";

// Reference values: DATA_PUBLIK_DETAK/01_data/03_uji_balik_indeks_paparan.csv and 04_jam_bakteri.csv
describe("Ratkowsky growth (04_jam_bakteri.csv)", () => {
  it.each([
    [20, 43.3],
    [24, 60.0],
    [30, 90.0],
    [36, 124.2],
  ])("%i degC -> %f bacterial minutes per wall hour", (T, expected) => {
    expect(bacterialMinutesPerHour(T)).toBeCloseTo(expected, 0);
  });
  it("is zero above Tmax (47.1 degC)", () => {
    expect(mu(48)).toBe(0);
  });
  it("36 vs 20 degC is the 2.9x shown on the poster", () => {
    expect(mu(36) / mu(20)).toBeCloseTo(2.87, 1);
  });
});

describe("backtest reproduction (03_uji_balik_indeks_paparan.csv)", () => {
  const cases: [string, number, number, "tertutup" | "tersentuh", number][] = [
    ["Patuh 4 jam", 4.0, 27, "tertutup", 0.23],
    ["SDN Jakarta Timur", 5.0, 30, "tersentuh", 0.85],
    ["SMPN 3 Berbah", 5.5, 28, "tersentuh", 0.93],
    ["Sidoarjo", 7.0, 30, "tersentuh", 1.39],
    ["SMKN 6 Semarang", 12.0, 29, "tersentuh", 2.56],
    ["Jayapura", 16.0, 27, "tersentuh", 3.16],
  ];
  it.each(cases)("%s median IP", (_n, gap, T, sc, expected) => {
    const r = monteCarloIP(gap, T, sc, 2000, 23);
    expect(r.median).toBeGreaterThan(expected - 0.08);
    expect(r.median).toBeLessThan(expected + 0.08);
  });
});

describe("measured path", () => {
  const t0 = Date.UTC(2026, 9, 26, 0, 0); // 07:00 WIB
  const h = (x: number) => t0 + x * 3.6e6;
  it("recovers k from two readings", () => {
    const k = 0.6;
    const Ta = 30;
    const T2 = Ta + (65 - Ta) * Math.exp(-k * 1.5);
    expect(estimateK({ at: h(0), foodC: 65, ambientC: Ta }, { at: h(1.5), foodC: T2, ambientC: Ta })).toBeCloseTo(k, 3);
  });
  it("matches the single-path integrator when the path is a single Newton curve", () => {
    const k = 0.6;
    const Ta = 30;
    const reads = [0, 1, 2.5].map((x) => ({ at: h(x), foodC: Ta + (65 - Ta) * Math.exp(-k * x), ambientC: Ta }));
    const m = integrateMeasured(reads, h(6), "tersentuh", { stepMin: 1 });
    const direct = ipSinglePath(6, Ta, k, 0.56, 1.5, 65, 0.005);
    expect(m.ipP95).toBeCloseTo(direct, 1);
  });
  it("lag acts as a deduction", () => {
    expect(ipFromWork(0.5, 0.56)).toBe(0);
    expect(ipFromWork(3.56, 0.56)).toBeCloseTo(1, 6);
  });
  it("time to limit is monotone and zero once over", () => {
    const reads = [{ at: h(0), foodC: 65, ambientC: 31 }, { at: h(2), foodC: 41, ambientC: 31 }];
    const left = minutesUntilLimit(reads, h(2), "tersentuh");
    expect(left).toBeGreaterThan(0);
    expect(Number.isFinite(left)).toBe(true);
    expect(minutesUntilLimit(reads, h(2) + (left + 5) * 60_000, "tersentuh")).toBe(0);
  });
  it("status thresholds follow the deck (Aman < 0.8 <= Waspada < 1.0 <= Buang)", () => {
    expect(statusOf(0.79)).toBe("aman");
    expect(statusOf(0.8)).toBe("waspada");
    expect(statusOf(0.999)).toBe("waspada");
    expect(statusOf(1)).toBe("buang");
  });
});
