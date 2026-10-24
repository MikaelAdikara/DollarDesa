import type { DetakEvent, EventStore } from "./types";

type G = typeof globalThis & { __detakEvents?: DetakEvent[] };

/** Per-instance store used when DATABASE_URL is not set (demo deployments). */
export function memoryStore(): EventStore {
  const g = globalThis as G;
  g.__detakEvents ??= [];
  const events = g.__detakEvents;
  return {
    name: "memory",
    async listByDate(serviceDate) {
      return events.filter((e) => e.serviceDate === serviceDate);
    },
    async listByBatch(batchId) {
      return events.filter((e) => e.batchId === batchId);
    },
    async append(e) {
      const full = { ...e, id: crypto.randomUUID(), createdAt: Date.now() } as DetakEvent;
      events.push(full);
      if (events.length > 5000) events.splice(0, events.length - 5000);
      return full;
    },
  };
}
