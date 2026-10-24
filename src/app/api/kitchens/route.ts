import type { NextRequest } from "next/server";
import { z } from "zod";
import { kitchenRows } from "@/lib/pilot/engine";
import { dayContext } from "@/lib/server/context";
import { clockMeta, ok, zodFail } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const Q = z.object({
  province: z.enum(["DIY", "PAPUA", "SUMBAR"]).optional(),
  regency: z.string().regex(/^\d{4}$/).optional(),
  t: z.string().optional(),
});

/** GET /api/kitchens?province=DIY&regency=3404 — kitchens with today's roll-up. */
export async function GET(req: NextRequest) {
  const q = Q.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!q.success) return zodFail(q.error);
  const { clock, states, store } = await dayContext(q.data.t, { province: q.data.province, regency: q.data.regency });
  const rows = kitchenRows(states).map((r) => ({
    id: r.kitchen.id,
    name: r.kitchen.name,
    province: r.kitchen.provinceId,
    regency: r.regency.name,
    lon: r.kitchen.lon,
    lat: r.kitchen.lat,
    beneficiaries: r.kitchen.beneficiaries,
    slhs: r.kitchen.slhs,
    batches: r.batches,
    maxIpAtMeal: Math.round(r.maxIpAtMeal * 1000) / 1000,
    alerts: r.alerts,
    servedOver: r.servedOver,
    completeness: r.due ? 1 - r.missing / r.due : 1,
  }));
  return ok(rows, { ...clockMeta(clock, store), count: rows.length });
}
