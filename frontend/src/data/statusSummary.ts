import { db } from "./db.js";
import type { CareEventType } from "./db.js";

export interface StatusSummary {
  type: CareEventType;
  lastAt: string | null; // ISO timestamp of the most recent completed event, or null if none yet
}

const TRACKED: CareEventType[] = ["feed", "diaper", "sleep"];

/** FR-008, SC-005 — "time since last X" without scrolling the full timeline. */
export async function getStatusSummary(babyId: string): Promise<StatusSummary[]> {
  const rows = await db.careEvents.where({ babyId }).toArray();
  const active = rows.filter((e) => !e.deletedAt);

  return TRACKED.map((type) => {
    const matching = active.filter((e) => e.type === type && (type !== "sleep" || e.endTime));
    const latest = matching.reduce<string | null>((acc, e) => {
      const at = e.endTime ?? e.startTime;
      return !acc || at > acc ? at : acc;
    }, null);
    return { type, lastAt: latest };
  });
}

export function formatElapsed(iso: string | null): string {
  if (!iso) return "No entries yet";
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m ago`;
}
