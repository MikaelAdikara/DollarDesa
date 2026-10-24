import type { NextRequest } from "next/server";
import { z } from "zod";
import { detailOf } from "@/lib/pilot/engine";
import { dayContext } from "@/lib/server/context";
import { clockMeta, ok, zodFail } from "@/lib/server/http";
import { batchDetailJson } from "@/lib/server/serialize";

export const dynamic = "force-dynamic";

const Q = z.object({ province: z.enum(["DIY", "PAPUA", "SUMBAR"]).optional(), t: z.string().optional() });

/** GET /api/alerts?province=DIY — early warnings: batches projected to pass IP 1.0 before they are eaten. */
export async function GET(req: NextRequest) {
  const q = Q.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!q.success) return zodFail(q.error);
  const { clock, states, store } = await dayContext(q.data.t, { province: q.data.province });
  const alerts = states
    .filter((s) => s.alert === "early")
    .map((s) => batchDetailJson(detailOf(s, clock.now)))
    .sort((a, b) => (a.minutesUntilLimit ?? 9e9) - (b.minutesUntilLimit ?? 9e9));
  return ok(alerts, { ...clockMeta(clock, store), count: alerts.length });
}
