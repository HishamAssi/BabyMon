import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { careEvents, type CareEventType } from "../db/schema.js";

/**
 * FR-017 (User Story 5, Acceptance Scenario 2) — due-time is always derived
 * from the latest matching, non-deleted CareEvent, so it self-corrects
 * whenever a newer matching event is logged. "medicine" has no CareEvent
 * counterpart (data-model.md), so it recurs on a fixed cadence from when the
 * reminder was created instead.
 */
export async function computeDueAt(
  babyId: string,
  eventType: CareEventType | "medicine",
  intervalMinutes: number,
  createdAt: Date
): Promise<Date> {
  if (eventType === "medicine") {
    const elapsedIntervals = Math.floor((Date.now() - createdAt.getTime()) / (intervalMinutes * 60_000));
    return new Date(createdAt.getTime() + (elapsedIntervals + 1) * intervalMinutes * 60_000);
  }

  const latest = await db.query.careEvents.findFirst({
    where: and(eq(careEvents.babyId, babyId), eq(careEvents.type, eventType), isNull(careEvents.deletedAt)),
    orderBy: desc(careEvents.startTime)
  });

  const baseline = latest ? (latest.endTime ?? latest.startTime) : createdAt;
  return new Date(baseline.getTime() + intervalMinutes * 60_000);
}
