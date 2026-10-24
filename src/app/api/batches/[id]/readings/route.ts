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
  checkpoint: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  foodC: z.number().min(0).max(100),
  ambientC: z.number().min(5).max(50),
  t: z.string().optional(),
});

const ALLOWED: Record<number, string[]> = { 1: ["sppg"], 2: ["sppg"], 3: ["sekolah", "sppg"], 4: ["sekolah"] };

/**
 * POST /api/batches/{id}/readings — record one checkpoint reading.
 * The timestamp is set by the server (in production: the CCTV/sensor gateway clock), never by the client.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = batchById(id);
  if (!b) return fail(404, "NOT_FOUND", `Batch ${id} tidak ditemukan`);
  const json = await req.json().catch(() => null);
  const body = Body.safeParse(json);
  if (!body.success) return zodFail(body.error);
  const persona = await currentPersona();
  if (!ALLOWED[body.data.checkpoint].includes(persona.role)) {
    return fail(403, "FORBIDDEN", `Titik cek ${body.data.checkpoint} dicatat oleh ${ALLOWED[body.data.checkpoint].join(" / ")}, bukan ${persona.role}`);
  }
  const clock = resolveClock(body.data.t);
  if (b.serviceDate !== clock.serviceDate) return fail(409, "NOT_TODAY", "Hanya batch pada hari layanan berjalan yang bisa dicatat");
  if (clock.now < b.cookedAt) return fail(409, "NOT_COOKED", "Batch ini belum matang");
  const store = getStore();
  const saved = await store.append({ kind: "reading", serviceDate: b.serviceDate, batchId: id, checkpoint: body.data.checkpoint, foodC: body.data.foodC, ambientC: body.data.ambientC, at: clock.now, actor: persona.actor, role: persona.role });
  const events = [...(await batchEvents(id)).filter((e) => e.id !== saved.id), saved];
  const detail = detailOf(evaluateBatch(b, clock.now, events), clock.now);
  return rememberEvent(ok(batchDetailJson(detail), clockMeta(clock, store.name), { status: 201 }), saved);
}
