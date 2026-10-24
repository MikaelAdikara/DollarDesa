import type { NextRequest } from "next/server";
import { pChart } from "@/lib/pilot/engine";
import { kitchenById } from "@/lib/pilot/sim";
import { dayContext } from "@/lib/server/context";
import { clockMeta, fail, ok } from "@/lib/server/http";
import { batchJson } from "@/lib/server/serialize";

export const dynamic = "force-dynamic";

/** GET /api/kitchens/3404-017 — one kitchen, today's batches and its 20-day p-chart. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const k = kitchenById(id);
  if (!k) return fail(404, "NOT_FOUND", `SPPG ${id} tidak ditemukan`);
  const { clock, states, store } = await dayContext(req.nextUrl.searchParams.get("t"), { kitchen: id });
  return ok(
    {
      kitchen: { id: k.id, name: k.name, province: k.provinceId, regency: k.regencyId, district: k.district, beneficiaries: k.beneficiaries, slhs: k.slhs, schools: k.schools.length },
      batches: states.map(batchJson),
      pChart: pChart(id, clock.serviceDate, states),
    },
    clockMeta(clock, store),
  );
}
