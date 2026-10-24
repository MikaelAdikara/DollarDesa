import type { BatchDetail, BatchState } from "../pilot/engine";

/** Public JSON shape of a batch (API + client components). */
export function batchJson(s: BatchState) {
  const b = s.batch;
  return {
    id: s.id,
    serviceDate: b.serviceDate,
    province: s.province.id,
    regency: { id: s.regency.id, name: s.regency.name },
    kitchen: { id: b.kitchen.id, name: b.kitchen.name, slhs: b.kitchen.slhs },
    school: { id: b.school.id, name: b.school.name, level: b.school.level, portions: b.school.portions },
    menu: b.menu,
    scenario: b.scenario,
    timezone: s.province.tzLabel,
    times: { cookStart: b.cookStart, cookedAt: b.cookedAt, departAt: b.departAt, arriveAt: b.arriveAt, mealAt: b.mealAt, rule4hAt: s.rule4hAt },
    readings: s.readings.map((r) => ({ checkpoint: r.checkpoint, at: r.at, foodC: r.foodC, ambientC: r.ambientC, source: r.assumed ? "asumsi" : r.source })),
    missing: s.missing,
    phase: s.phase,
    held: s.held,
    ip: { now: round3(s.ipNow), atMeal: round3(s.ipAtMeal) },
    status: { now: s.statusNow, atMeal: s.statusAtMeal },
    alert: s.alert,
  };
}

export function batchDetailJson(d: BatchDetail) {
  return {
    ...batchJson(d),
    minutesUntilLimit: Number.isFinite(d.minutesLeft) ? Math.round(d.minutesLeft) : null,
    path: d.path.filter((_, i) => i % 3 === 0).map((p) => ({ t: p.t, foodC: Math.round(p.foodC * 10) / 10, ip: round3(p.ip) })),
  };
}

function round3(x: number) {
  return Math.round(x * 1000) / 1000;
}
