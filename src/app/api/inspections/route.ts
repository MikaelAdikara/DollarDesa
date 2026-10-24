import type { NextRequest } from "next/server";
import { z } from "zod";
import { AHP_WEIGHTS, inspectionQueue } from "@/lib/pilot/engine";
import { dayContext } from "@/lib/server/context";
import { clockMeta, ok, zodFail } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const Q = z.object({ province: z.enum(["DIY", "PAPUA", "SUMBAR"]), limit: z.coerce.number().int().min(1).max(200).default(25), t: z.string().optional() });

/** GET /api/inspections?province=DIY — kitchen visit order (AHP–SAW, weights from deck slide B7). */
export async function GET(req: NextRequest) {
  const q = Q.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!q.success) return zodFail(q.error);
  const { clock, states, store } = await dayContext(q.data.t, { province: q.data.province });
  const rows = inspectionQueue(q.data.province, clock.serviceDate, states)
    .slice(0, q.data.limit)
    .map((r, i) => ({ rank: i + 1, kitchen: { id: r.kitchen.id, name: r.kitchen.name, regency: r.regency.name, slhs: r.kitchen.slhs }, score: Math.round(r.score * 1000) / 1000, criteria: r.criteria, alertsToday: r.alerts, servedOverToday: r.servedOver, exceedRate10d: r.exceedRate, signalDays10d: r.signalDays, reasons: r.reasons }));
  return ok(rows, { ...clockMeta(clock, store), weights: AHP_WEIGHTS });
}
