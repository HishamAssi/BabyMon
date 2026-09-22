import Dexie, { type Table } from "dexie";

export type CareEventType = "feed" | "diaper" | "sleep" | "pumping";

export interface CareEvent {
  id: string; // client-generated UUID — the sync idempotency key
  babyId: string;
  type: CareEventType;
  startTime: string; // ISO
  endTime: string | null;
  loggedByCaregiverId: string;
  lastModifiedByCaregiverId: string;
  notes?: string;
  deletedAt: string | null;
  updatedAt: string;
  /**
   * Offline write-queue state: null once acknowledged by the server.
   * "create"/"update" distinguish POST vs PATCH on flush so an edit to a
   * not-yet-synced record still sends the latest fields as a single create.
   */
  pendingOp: "create" | "update" | "delete" | null;
}

export interface GrowthMeasurement {
  id: string;
  babyId: string;
  date: string;
  weight?: number;
  length?: number;
  headCircumference?: number;
  loggedByCaregiverId: string;
  pendingSync: 0 | 1;
}

export interface Milestone {
  id: string;
  babyId: string;
  date: string;
  description: string;
  photoRef?: string;
  loggedByCaregiverId: string;
  pendingSync: 0 | 1;
}

export interface Reminder {
  id: string;
  babyId: string;
  eventType: CareEventType | "medicine";
  intervalMinutes: number;
  active: 0 | 1;
  pendingSync: 0 | 1;
}

/** Generic key/value store: device token, active babyId, sync cursor, caregiver identity. */
export interface MetaEntry {
  key: string;
  value: string;
}

class BabyMonDb extends Dexie {
  careEvents!: Table<CareEvent, string>;
  growthMeasurements!: Table<GrowthMeasurement, string>;
  milestones!: Table<Milestone, string>;
  reminders!: Table<Reminder, string>;
  meta!: Table<MetaEntry, string>;

  constructor() {
    super("babymon");
    this.version(1).stores({
      careEvents: "id, babyId, type, startTime, pendingOp",
      growthMeasurements: "id, babyId, date, pendingSync",
      milestones: "id, babyId, date, pendingSync",
      reminders: "id, babyId, eventType, pendingSync",
      meta: "key"
    });
  }
}

export const db = new BabyMonDb();
