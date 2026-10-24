// Quick check of simulated pilot outcomes: npx tsx scripts/calibrate.ts
import { evaluateDay, summarize, historyDay, inspectionQueue, pChart } from "../src/lib/pilot/engine";
import { resolveClock } from "../src/lib/pilot/clock";
import { kitchens } from "../src/lib/pilot/sim";

const t0 = performance.now();
const clock = resolveClock("10:15");
const ks = kitchens();
console.log("kitchens", ks.length, "schools", ks.reduce((a, k) => a + k.schools.length, 0), "build ms", (performance.now() - t0).toFixed(0));
const t1 = performance.now();
const day = evaluateDay(clock.serviceDate, clock.now, []);
console.log("evaluate day ms", (performance.now() - t1).toFixed(0), "batches", day.length);
console.log(clock.label, summarize(day));
const t2 = performance.now();
const end = historyDay(clock.serviceDate);
console.log("end of day ms", (performance.now() - t2).toFixed(0), summarize(end));
for (const p of ["DIY", "PAPUA", "SUMBAR"] as const) {
  const s = summarize(end.filter((b) => b.province.id === p));
  console.log(p, "buang%", ((100 * s.byStatus.buang) / s.batches).toFixed(1), "waspada%", ((100 * s.byStatus.waspada) / s.batches).toFixed(1), "held", s.held, "servedOver", s.servedOver, "complete", (s.completeness * 100).toFixed(1));
}
const t3 = performance.now();
const q = inspectionQueue("DIY", clock.serviceDate, day);
console.log("queue ms", (performance.now() - t3).toFixed(0), q.slice(0, 5).map((r) => [r.kitchen.name, r.score.toFixed(3), r.reasons.join("; ")]));
console.log("pchart", pChart(q[0].kitchen.id, clock.serviceDate, day).map((p) => p.over).join(","));
