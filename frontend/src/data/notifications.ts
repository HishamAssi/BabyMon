import { api } from "./apiClient.js";

export interface ReminderWithDueAt {
  id: string;
  babyId: string;
  eventType: string;
  intervalMinutes: number;
  active: boolean;
  dueAt: string;
}

const notified = new Set<string>(); // reminder ids we've already alerted for this due cycle

export async function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

/**
 * T045 — polls due-status and delivers an in-app banner plus, when the
 * browser has granted permission, a native Notification (works while the
 * app/tab is open or backgrounded; a full Web Push pipeline for a fully
 * closed app is out of scope for this pass — see plan.md Technical Context).
 */
export function startReminderPolling(babyId: string, onDue: (r: ReminderWithDueAt) => void) {
  const tick = async () => {
    const { reminders } = await api.get<{ reminders: ReminderWithDueAt[] }>(`/babies/${babyId}/reminders`);
    const now = Date.now();
    for (const r of reminders) {
      const dueAtMs = new Date(r.dueAt).getTime();
      const cycleKey = `${r.id}:${dueAtMs}`;
      if (dueAtMs <= now && !notified.has(cycleKey)) {
        notified.add(cycleKey);
        onDue(r);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("BabyMon reminder", { body: `${r.eventType} is due` });
        }
      }
    }
  };
  tick();
  return setInterval(tick, 60_000);
}
