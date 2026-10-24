import type { NextRequest } from "next/server";
import { z } from "zod";
import { detailOf, evaluateBatch } from "@/lib/pilot/engine";
import { resolveClock } from "@/lib/pilot/clock";
import { batchById } from "@/lib/pilot/sim";
import { batchEvents, currentPersona } from "@/lib/server/context";
import { rememberEvent } from "@/lib/server/visitor-events";
import { clockMeta, fail, ok, zodFail } from "@/lib/server/http";
import { batchDetailJson } from "@/lib/server/serialize";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

const Body = z.object({
  kind: z.enum(["hold", "release", "inspect"]),
  reason: z.string().trim().min(3).max(240),
  t: z.string().optional(),
});

const ALLOWED: Record<string, string[]> = { hold: ["dinas", "sekolah", "sppg"], release: ["dinas"], inspect: ["dinas"] };

/** POST /api/batches/{id}/actions — hold a batch, release it, or log an inspection visit. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = batchById(id);
  if (!b) return fail(404, "NOT_FOUND", `Batch ${id} tidak ditemukan`);
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return zodFail(body.error);
  const persona = await currentPersona();
  if (!ALLOWED[body.data.kind].includes(persona.role)) return fail(403, "FORBIDDEN", `Peran ${persona.role} tidak boleh melakukan ${body.data.kind}`);
  const clock = resolveClock(body.data.t);
  if (b.serviceDate !== clock.serviceDate) return fail(409, "NOT_TODAY", "Tindakan hanya untuk batch hari layanan berjalan");
  const store = getStore();
  const saved = await store.append({ kind: body.data.kind, serviceDate: b.serviceDate, batchId: id, reason: body.data.reason, at: clock.now, actor: persona.actor, role: persona.role });
  const events = [...(await batchEvents(id)).filter((e) => e.id !== saved.id), saved];
  return rememberEvent(ok(batchDetailJson(detailOf(evaluateBatch(b, clock.now, events), clock.now)), clockMeta(clock, store.name), { status: 201 }), saved);
}
