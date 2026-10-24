import type { NextRequest } from "next/server";
import { detailOf, evaluateBatch } from "@/lib/pilot/engine";
import { resolveClock } from "@/lib/pilot/clock";
import { batchById } from "@/lib/pilot/sim";
import { clockMeta, fail, ok } from "@/lib/server/http";
import { batchDetailJson } from "@/lib/server/serialize";
import { getStore } from "@/lib/store";
import { batchEvents } from "@/lib/server/context";

export const dynamic = "force-dynamic";

/** GET /api/batches/20261023-3404-017-3 — the status a teacher/parent sees for one batch. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = batchById(id);
  if (!b) return fail(404, "NOT_FOUND", `Batch ${id} tidak ditemukan`);
  const clock = resolveClock(req.nextUrl.searchParams.get("t"));
  const now = b.serviceDate === clock.serviceDate ? clock.now : Date.parse(`${b.serviceDate}T23:59:00+07:00`);
  const store = getStore();
  const events = await batchEvents(id);
  const detail = detailOf(evaluateBatch(b, now, events), now);
  return ok(batchDetailJson(detail), clockMeta(clock, store.name));
}
