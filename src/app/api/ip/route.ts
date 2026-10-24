import type { NextRequest } from "next/server";
import { z } from "zod";
import { integrateMeasured, minutesUntilLimit } from "@/lib/model/ip";
import { ok, zodFail } from "@/lib/server/http";

/**
 * POST /api/ip — stateless calculator. Any SIPGN module or device gateway can send
 * readings and get the Indeks Paparan back without storing anything.
 */
const Body = z.object({
  scenario: z.enum(["tertutup", "tersentuh"]).default("tersentuh"),
  readings: z
    .array(z.object({ at: z.string().datetime({ offset: true }), foodC: z.number().min(0).max(100), ambientC: z.number().min(5).max(50) }))
    .min(1)
    .max(20),
  until: z.string().datetime({ offset: true }),
  projectAmbientC: z.number().min(5).max(50).optional(),
});

export async function POST(req: NextRequest) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return zodFail(body.error);
  const rs = body.data.readings.map((r) => ({ at: Date.parse(r.at), foodC: r.foodC, ambientC: r.ambientC }));
  const until = Date.parse(body.data.until);
  const res = integrateMeasured(rs, until, body.data.scenario, { projectAmbientC: body.data.projectAmbientC });
  const left = minutesUntilLimit(rs, until, body.data.scenario, { projectAmbientC: body.data.projectAmbientC });
  return ok({ ipP95: Math.round(res.ipP95 * 1000) / 1000, ipMedian: Math.round(res.ipMedian * 1000) / 1000, status: res.status, minutesUntilLimit: Number.isFinite(left) ? Math.round(left) : null });
}
