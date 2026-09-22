import { api, getDeviceToken } from "./apiClient.js";
import { getPendingEvents, markSynced, upsertFromServer } from "./careEvents.js";
import type { CareEvent } from "./db.js";

type SyncMessage = {
  entity: "care_event" | "growth_measurement" | "milestone" | "reminder" | "caregiver_access";
  op: "create" | "update" | "delete";
  record: Record<string, unknown>;
  cursor?: string;
};

type Listener = () => void;
const listeners = new Set<Listener>();
/** Components call this to re-render after any local write (own or synced-in). */
export function onSyncUpdate(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((fn) => fn());
}

function cursorKey(babyId: string) {
  return `babymon.cursor.${babyId}`;
}
function getCursor(babyId: string): string {
  return localStorage.getItem(cursorKey(babyId)) ?? "0";
}
function setCursor(babyId: string, cursor: string) {
  localStorage.setItem(cursorKey(babyId), cursor);
}

function toIso(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return typeof v === "number" ? new Date(v).toISOString() : new Date(String(v)).toISOString();
}

async function applyCareEventRecord(record: Record<string, unknown>) {
  const event: Omit<CareEvent, "pendingOp"> = {
    id: String(record.id),
    babyId: String(record.babyId),
    type: record.type as CareEvent["type"],
    startTime: toIso(record.startTime)!,
    endTime: toIso(record.endTime),
    loggedByCaregiverId: String(record.loggedByCaregiverId),
    lastModifiedByCaregiverId: String(record.lastModifiedByCaregiverId),
    notes: record.notes as string | undefined,
    deletedAt: toIso(record.deletedAt),
    updatedAt: toIso(record.updatedAt)!
  };
  await upsertFromServer(event);
}

/** FR-012, FR-018 — pushes every locally-queued write; safe to call repeatedly. */
export async function flushPendingQueue(babyId: string) {
  const pending = await getPendingEvents();
  for (const event of pending) {
    try {
      if (event.pendingOp === "create") {
        await api.post(`/babies/${babyId}/events`, {
          id: event.id,
          type: event.type,
          startTime: event.startTime,
          endTime: event.endTime ?? undefined,
          notes: event.notes
        });
      } else if (event.pendingOp === "update") {
        await api.patch(`/babies/${babyId}/events/${event.id}`, {
          startTime: event.startTime,
          endTime: event.endTime ?? undefined,
          notes: event.notes
        });
      } else if (event.pendingOp === "delete") {
        await api.delete(`/babies/${babyId}/events/${event.id}`).catch(() => undefined); // ok if already gone
      }
      await markSynced(event.id);
    } catch {
      // Leave pendingOp set — next flush (reconnect/poll tick) retries it.
      break;
    }
  }
  notify();
}

async function pollCatchUp(babyId: string) {
  const since = getCursor(babyId);
  const { events, cursor } = await api.get<{ events: Record<string, unknown>[]; cursor: string }>(
    `/babies/${babyId}/events?since=${since}`
  );
  for (const record of events) await applyCareEventRecord(record);
  setCursor(babyId, cursor);
  notify();
}

let socket: WebSocket | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let reconnectDelay = 1000;

function wsUrl(babyId: string): string {
  const token = getDeviceToken();
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/sync?token=${encodeURIComponent(token ?? "")}&since=${getCursor(babyId)}`;
}

function startPollingFallback(babyId: string) {
  if (pollTimer) return;
  pollTimer = setInterval(() => pollCatchUp(babyId).catch(() => undefined), 5000);
}
function stopPollingFallback() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}

/** Connects the real-time channel for a baby; falls back to polling if WS is unavailable (research.md §3). */
export function connectSync(babyId: string) {
  if (!getDeviceToken()) return;

  try {
    socket = new WebSocket(wsUrl(babyId));
  } catch {
    startPollingFallback(babyId);
    return;
  }

  socket.addEventListener("open", () => {
    reconnectDelay = 1000;
    stopPollingFallback();
    flushPendingQueue(babyId).catch(() => undefined);
  });

  socket.addEventListener("message", (ev) => {
    const message = JSON.parse(ev.data) as SyncMessage;
    if (message.entity === "care_event") {
      applyCareEventRecord(message.record).then(notify);
    }
    if (message.cursor) setCursor(babyId, String(message.cursor));
  });

  socket.addEventListener("close", () => {
    startPollingFallback(babyId);
    setTimeout(() => connectSync(babyId), reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 30000);
  });

  socket.addEventListener("error", () => socket?.close());
}

export function disconnectSync() {
  socket?.close();
  socket = null;
  stopPollingFallback();
}

window.addEventListener("online", () => {
  const token = getDeviceToken();
  if (token) flushPendingQueue(localStorage.getItem("babymon.activeBabyId") ?? "").catch(() => undefined);
});
