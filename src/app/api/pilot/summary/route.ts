import type { NextRequest } from "next/server";
import { summarize } from "@/lib/pilot/engine";
import { PROVINCES } from "@/lib/pilot/reference";
import { dayContext } from "@/lib/server/context";
import { clockMeta, ok } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** GET /api/pilot/summary?t=HH:MM — today's pilot-wide and per-province counts. */
export async function GET(req: NextRequest) {
  const { clock, states, store } = await dayContext(req.nextUrl.searchParams.get("t"));
  const provinces = PROVINCES.map((p) => ({ id: p.id, name: p.name, cluster: p.cluster, sppg: p.sppg, ...summarize(states.filter((s) => s.province.id === p.id)) }));
  return ok({ total: summarize(states), provinces }, clockMeta(clock, store));
}
