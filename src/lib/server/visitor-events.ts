import "server-only";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { DetakEvent } from "../store";

/**
 * On serverless hosting without a database, every request can land on a different
 * instance, so in-memory events are not shared. Each visitor's own actions are
 * therefore also kept in a cookie and merged on read: what you record or hold
 * stays visible to you across refreshes. With DATABASE_URL set, events are shared.
 */
const NAME = "detak_ev";
const MAX = 24;

type Compact = [string, string, string, string, number, ...unknown[]];

function pack(e: DetakEvent): Compact {
  return e.kind === "reading"
    ? [e.id, e.kind, e.serviceDate, e.batchId, e.at, e.checkpoint, e.foodC, e.ambientC, e.role, e.actor, e.createdAt]
    : [e.id, e.kind, e.serviceDate, e.batchId, e.at, e.reason, e.role, e.actor, e.createdAt];
}

function unpack(c: Compact): DetakEvent | null {
  const [id, kind, serviceDate, batchId, at] = c;
  if (kind === "reading") {
    const [, , , , , checkpoint, foodC, ambientC, role, actor, createdAt] = c as unknown as [string, string, string, string, number, 1 | 2 | 3 | 4, number, number, DetakEvent["role"], string, number];
    return { id, kind, serviceDate, batchId, at, checkpoint, foodC, ambientC, role, actor, createdAt };
  }
  if (kind === "hold" || kind === "release" || kind === "inspect") {
    const [, , , , , reason, role, actor, createdAt] = c as unknown as [string, string, string, string, number, string, DetakEvent["role"], string, number];
    return { id, kind, serviceDate, batchId, at, reason, role, actor, createdAt };
  }
  return null;
}

export async function readVisitorEvents(): Promise<DetakEvent[]> {
  const raw = (await cookies()).get(NAME)?.value;
  if (!raw) return [];
  try {
    const arr = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Compact[];
    return arr.map(unpack).filter((e): e is DetakEvent => e !== null);
  } catch {
    return [];
  }
}

export function mergeEvents(a: DetakEvent[], b: DetakEvent[]): DetakEvent[] {
  const seen = new Set<string>();
  const out: DetakEvent[] = [];
  for (const e of [...a, ...b]) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    out.push(e);
  }
  return out.sort((x, y) => x.createdAt - y.createdAt);
}

export async function rememberEvent(res: NextResponse, e: DetakEvent) {
  const mine = (await readVisitorEvents()).filter((x) => x.serviceDate === e.serviceDate && x.id !== e.id);
  const next = [...mine, e].slice(-MAX).map(pack);
  res.cookies.set(NAME, Buffer.from(JSON.stringify(next)).toString("base64url"), { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 });
  return res;
}
