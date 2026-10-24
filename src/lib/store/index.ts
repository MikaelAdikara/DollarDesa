import { memoryStore } from "./memory";
import { postgresStore } from "./postgres";
import type { EventStore } from "./types";

export type { DetakEvent, ReadingEvent, ActionEvent, Role, EventStore } from "./types";

let store: EventStore | null = null;

export function getStore(): EventStore {
  if (!store) {
    const url = process.env.DATABASE_URL;
    store = url ? postgresStore(url) : memoryStore();
  }
  return store;
}
