import postgres from "postgres";
import type { DetakEvent, EventStore } from "./types";

type Row = {
  id: string;
  kind: DetakEvent["kind"];
  service_date: string;
  batch_id: string;
  checkpoint: number | null;
  food_c: number | null;
  ambient_c: number | null;
  measured_at: Date | null;
  reason: string | null;
  actor: string;
  role: DetakEvent["role"];
  created_at: Date;
};

function toEvent(r: Row): DetakEvent {
  const base = { id: r.id, serviceDate: r.service_date, batchId: r.batch_id, actor: r.actor, role: r.role, createdAt: r.created_at.getTime() };
  if (r.kind === "reading") {
    return { ...base, kind: "reading", checkpoint: r.checkpoint as 1 | 2 | 3 | 4, foodC: Number(r.food_c), ambientC: Number(r.ambient_c), at: r.measured_at!.getTime() };
  }
  return { ...base, kind: r.kind, reason: r.reason ?? "", at: (r.measured_at ?? r.created_at).getTime() };
}

type G = typeof globalThis & { __detakSql?: postgres.Sql };

/** Event store backed by Postgres (Neon / Supabase / Vercel Postgres). Schema: db/schema.sql. */
export function postgresStore(url: string): EventStore {
  const g = globalThis as G;
  g.__detakSql ??= postgres(url, { max: 3, idle_timeout: 20, prepare: false, ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require" });
  const sql = g.__detakSql;
  const cols = sql`id, kind, to_char(service_date, 'YYYY-MM-DD') as service_date, batch_id, checkpoint, food_c, ambient_c, measured_at, reason, actor, role, created_at`;
  return {
    name: "postgres",
    async listByDate(serviceDate) {
      const rows = await sql<Row[]>`select ${cols} from detak_event where service_date = ${serviceDate} order by created_at`;
      return rows.map(toEvent);
    },
    async listByBatch(batchId) {
      const rows = await sql<Row[]>`select ${cols} from detak_event where batch_id = ${batchId} order by created_at`;
      return rows.map(toEvent);
    },
    async append(e) {
      const isReading = e.kind === "reading";
      const rows = await sql<Row[]>`
        insert into detak_event (kind, service_date, batch_id, checkpoint, food_c, ambient_c, measured_at, reason, actor, role)
        values (
          ${e.kind}, ${e.serviceDate}, ${e.batchId},
          ${isReading ? e.checkpoint : null}, ${isReading ? e.foodC : null}, ${isReading ? e.ambientC : null},
          ${new Date(e.at)}, ${isReading ? null : e.reason},
          ${e.actor}, ${e.role}
        )
        returning ${cols}`;
      return toEvent(rows[0]);
    },
  };
}
