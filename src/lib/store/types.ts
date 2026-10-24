import type { Checkpoint } from "../pilot/sim";

export type Role = "sppg" | "sekolah" | "dinas" | "bgn";

export interface ReadingEvent {
  id: string;
  kind: "reading";
  serviceDate: string;
  batchId: string;
  checkpoint: Checkpoint;
  foodC: number;
  ambientC: number;
  at: number;
  actor: string;
  role: Role;
  createdAt: number;
}

export interface ActionEvent {
  id: string;
  kind: "hold" | "release" | "inspect";
  serviceDate: string;
  batchId: string;
  reason: string;
  /** Service-clock time of the action (equals real time in live mode). */
  at: number;
  actor: string;
  role: Role;
  createdAt: number;
}

export type DetakEvent = ReadingEvent | ActionEvent;

export interface EventStore {
  readonly name: "memory" | "postgres";
  listByDate(serviceDate: string): Promise<DetakEvent[]>;
  listByBatch(batchId: string): Promise<DetakEvent[]>;
  append(e: Omit<ReadingEvent, "id" | "createdAt"> | Omit<ActionEvent, "id" | "createdAt">): Promise<DetakEvent>;
}
