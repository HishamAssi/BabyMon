import { db, type CareEvent, type CareEventType } from "./db.js";
import { getCaregiverId } from "./apiClient.js";

function nowIso() {
  return new Date().toISOString();
}

/** FR-001 — creates locally first (works offline); syncClient pushes it out. */
export async function createLocalEvent(
  babyId: string,
  type: CareEventType,
  opts: { startTime?: string; endTime?: string | null; notes?: string } = {}
): Promise<CareEvent> {
  const caregiverId = getCaregiverId();
  if (!caregiverId) throw new Error("not_joined");

  const event: CareEvent = {
    id: crypto.randomUUID(),
    babyId,
    type,
    startTime: opts.startTime ?? nowIso(),
    endTime: opts.endTime ?? (type === "sleep" ? null : nowIso()),
    loggedByCaregiverId: caregiverId,
    lastModifiedByCaregiverId: caregiverId,
    notes: opts.notes,
    deletedAt: null,
    updatedAt: nowIso(),
    pendingOp: "create"
  };
  await db.careEvents.put(event);
  return event;
}

/** FR-006 — e.g. closing an in-progress sleep session. */
export async function updateLocalEvent(
  id: string,
  patch: Partial<Pick<CareEvent, "endTime" | "notes" | "startTime">>
) {
  const caregiverId = getCaregiverId();
  if (!caregiverId) throw new Error("not_joined");

  const existing = await db.careEvents.get(id);
  if (!existing) throw new Error("event_not_found_locally");

  // If the create itself hasn't synced yet, stay in "create" mode so the
  // flush sends one POST with the latest fields rather than a PATCH the
  // server hasn't seen the base record for.
  const nextOp: CareEvent["pendingOp"] = existing.pendingOp === "create" ? "create" : "update";

  await db.careEvents.update(id, {
    ...patch,
    lastModifiedByCaregiverId: caregiverId,
    updatedAt: nowIso(),
    pendingOp: nextOp
  });
}

export async function deleteLocalEvent(id: string) {
  const caregiverId = getCaregiverId();
  if (!caregiverId) throw new Error("not_joined");
  const existing = await db.careEvents.get(id);
  if (existing?.pendingOp === "create") {
    // Never made it to the server — just drop it locally.
    await db.careEvents.delete(id);
    return;
  }
  await db.careEvents.update(id, {
    deletedAt: nowIso(),
    lastModifiedByCaregiverId: caregiverId,
    updatedAt: nowIso(),
    pendingOp: "delete"
  });
}

export async function listEvents(babyId: string): Promise<CareEvent[]> {
  const rows = await db.careEvents.where({ babyId }).toArray();
  return rows.filter((e) => !e.deletedAt).sort((a, b) => b.startTime.localeCompare(a.startTime));
}

export async function getInProgressSleep(babyId: string): Promise<CareEvent | undefined> {
  const rows = await db.careEvents.where({ babyId, type: "sleep" }).toArray();
  return rows.find((e) => !e.deletedAt && !e.endTime);
}

export async function getPendingEvents(): Promise<CareEvent[]> {
  return db.careEvents.filter((e) => e.pendingOp !== null).toArray();
}

export async function markSynced(id: string) {
  await db.careEvents.update(id, { pendingOp: null });
}

/** Applied to server-pushed/catch-up records (syncClient.ts) — last-write-wins by updatedAt. */
export async function upsertFromServer(record: Omit<CareEvent, "pendingOp">) {
  const existing = await db.careEvents.get(record.id);
  if (existing?.pendingOp && existing.updatedAt > record.updatedAt) {
    return; // a newer local edit hasn't been pushed yet — don't clobber it
  }
  await db.careEvents.put({ ...record, pendingOp: null });
}
