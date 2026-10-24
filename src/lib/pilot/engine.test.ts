import { describe, expect, it } from "vitest";
import { localToEpoch, resolveClock } from "./clock";
import { evaluateBatch, evaluateDay, inspectionQueue, PCHART, summarize } from "./engine";
import { allocateSppg, PILOT_TOTAL_SPPG, PROVINCES } from "./reference";
import { batchById, kitchenDay, kitchens } from "./sim";

const DATE = "2026-10-23";

describe("pilot reference data", () => {
  it("has 999 SPPG across DIY, Papua and Sumatera Barat (BGN, Juni 2026)", () => {
    expect(PILOT_TOTAL_SPPG).toBe(999);
    expect(kitchens()).toHaveLength(999);
  });
  it("allocates each province total exactly across its regencies", () => {
    for (const p of PROVINCES) {
      const sum = [...allocateSppg(p).values()].reduce((a, b) => a + b, 0);
      expect(sum).toBe(p.sppg);
    }
  });
});

describe("simulation", () => {
  it("is deterministic", () => {
    const k = kitchens()[123];
    const a = kitchenDay(k, DATE).map((b) => [b.id, b.cookedAt, b.planned[1]?.foodC]);
    const b = kitchenDay({ ...k }, DATE).map((x) => [x.id, x.cookedAt, x.planned[1]?.foodC]);
    expect(b).toEqual(a);
  });
  it("round-trips batch ids", () => {
    const b = kitchenDay(kitchens()[5], DATE)[2];
    expect(batchById(b.id)?.school.id).toBe(b.school.id);
  });
  it("keeps the end-of-day exceedance near the p-chart baseline (p0 = 2%)", () => {
    const day = evaluateDay(DATE, Date.parse(`${DATE}T23:59:00+07:00`), []);
    const s = summarize(day);
    const rate = s.byStatus.buang / s.batches;
    expect(rate).toBeGreaterThan(0.005);
    expect(rate).toBeLessThan(0.035);
    expect(s.completeness).toBeGreaterThan(0.85);
  });
});

describe("decisions", () => {
  const b = kitchenDay(kitchens()[0], DATE)[0];
  it("a hold event turns the batch into Ditahan and removes the early warning", () => {
    const now = b.departAt + 10 * 60_000;
    const held = evaluateBatch(b, now, [{ id: "x", kind: "hold", serviceDate: DATE, batchId: b.id, reason: "uji", at: now - 1, actor: "Satgas", role: "dinas", createdAt: now }]);
    expect(held.phase).toBe("ditahan");
    expect(held.alert).toBe("none");
  });
  it("a hold in the future of the replay clock is ignored", () => {
    const now = b.departAt;
    const s = evaluateBatch(b, now, [{ id: "y", kind: "hold", serviceDate: DATE, batchId: b.id, reason: "uji", at: now + 3.6e6, actor: "Satgas", role: "dinas", createdAt: now }]);
    expect(s.held).toBeNull();
  });
  it("a missing 'matang' reading is replaced by the conservative 65 °C assumption", () => {
    const noCp1 = { ...b, planned: { ...b.planned, 1: undefined } };
    const s = evaluateBatch(noCp1, b.mealAt, []);
    expect(s.readings[0].assumed).toBe(true);
    expect(s.missing).toContain(1);
  });
  it("orders the inspection queue with today's alerts first", () => {
    const clock = resolveClock("10:15", localToEpoch(DATE, 10 * 60, 7));
    const states = evaluateDay(clock.serviceDate, clock.now, [], { province: "DIY" });
    const q = inspectionQueue("DIY", clock.serviceDate, states, 3);
    const firstNoAlert = q.findIndex((r) => r.alerts + r.servedOver === 0);
    expect(q.slice(firstNoAlert).every((r) => r.alerts + r.servedOver === 0)).toBe(true);
  });
  it("p-chart UCL matches the deck (0.114, signal at 3 of 20)", () => {
    expect(PCHART.ucl).toBeCloseTo(0.114, 3);
    expect(Math.ceil(PCHART.ucl * PCHART.n)).toBe(3);
  });
});
