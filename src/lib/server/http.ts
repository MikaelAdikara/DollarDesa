import "server-only";
import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import type { SimClock } from "../pilot/clock";

export function ok<T>(data: T, meta: Record<string, unknown> = {}, init?: ResponseInit) {
  return NextResponse.json({ data, meta: { generatedAt: new Date().toISOString(), ...meta } }, init);
}

export function fail(status: number, code: string, message: string, details?: unknown) {
  return NextResponse.json({ error: { code, message, details } }, { status });
}

export function zodFail(e: ZodError) {
  return fail(400, "VALIDATION_ERROR", "Input tidak valid", e.issues.map((i) => ({ field: i.path.join("."), message: i.message })));
}

export function clockMeta(clock: SimClock, store: string) {
  return { clock: { now: new Date(clock.now).toISOString(), mode: clock.mode, serviceDate: clock.serviceDate, label: clock.label }, store };
}
