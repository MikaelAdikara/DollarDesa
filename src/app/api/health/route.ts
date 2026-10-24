import { resolveClock } from "@/lib/pilot/clock";
import { kitchens } from "@/lib/pilot/sim";
import { clockMeta, ok } from "@/lib/server/http";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const clock = resolveClock(null);
  const store = getStore();
  let storeOk = true;
  try {
    await store.listByDate(clock.serviceDate);
  } catch {
    storeOk = false;
  }
  return ok({ status: storeOk ? "ok" : "degraded", kitchens: kitchens().length, storeOk }, clockMeta(clock, store.name), { status: storeOk ? 200 : 503 });
}
