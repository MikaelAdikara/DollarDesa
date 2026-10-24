import "server-only";
import { cookies } from "next/headers";
import { resolveClock, type SimClock } from "../pilot/clock";
import { evaluateDay, type BatchState } from "../pilot/engine";
import type { ProvinceId } from "../pilot/reference";
import { getStore, type DetakEvent, type Role } from "../store";
import { mergeEvents, readVisitorEvents } from "./visitor-events";

export async function dayContext(t: string | null | undefined, filter?: { province?: ProvinceId; regency?: string; kitchen?: string }) {
  const clock = resolveClock(t);
  const store = getStore();
  let events: DetakEvent[] = [];
  let storeError: string | null = null;
  try {
    events = await store.listByDate(clock.serviceDate);
  } catch (e) {
    storeError = e instanceof Error ? e.message : "store unavailable";
  }
  events = mergeEvents(events, (await readVisitorEvents()).filter((e) => e.serviceDate === clock.serviceDate));
  const states = evaluateDay(clock.serviceDate, clock.now, events, filter);
  return { clock, states, events, store: store.name, storeError };
}

export interface Persona {
  role: Role;
  actor: string;
}

export const PERSONAS: Record<Role, Persona & { title: string; place: string }> = {
  sppg: { role: "sppg", actor: "Ahli gizi SPPG", title: "Petugas SPPG", place: "Dapur" },
  sekolah: { role: "sekolah", actor: "Guru piket", title: "Guru & orang tua", place: "Sekolah" },
  dinas: { role: "dinas", actor: "Satgas MBG Dinkes", title: "Dinas / Satgas", place: "Control panel" },
  bgn: { role: "bgn", actor: "Tim Kendali BGN", title: "BGN pusat", place: "Dashboard pilot" },
};

export async function currentPersona(): Promise<Persona> {
  const c = await cookies();
  const role = (c.get("detak_role")?.value ?? "dinas") as Role;
  return PERSONAS[role] ?? PERSONAS.dinas;
}

export async function batchEvents(batchId: string): Promise<DetakEvent[]> {
  const fromStore = await getStore()
    .listByBatch(batchId)
    .catch(() => []);
  return mergeEvents(fromStore, (await readVisitorEvents()).filter((e) => e.batchId === batchId));
}

export type { SimClock, BatchState };
