import { useCallback, useEffect, useState } from "react";
import { api, getActiveBabyId } from "../data/apiClient.js";
import {
  requestNotificationPermission,
  startReminderPolling,
  type ReminderWithDueAt
} from "../data/notifications.js";

const TYPES: ReminderWithDueAt["eventType"][] = ["feed", "diaper", "sleep", "pumping", "medicine"];

/** T044 — FR-017: set a recurring reminder interval per activity type. */
export default function Reminders() {
  const babyId = getActiveBabyId();
  const [reminders, setReminders] = useState<ReminderWithDueAt[]>([]);
  const [eventType, setEventType] = useState<ReminderWithDueAt["eventType"]>("feed");
  const [hours, setHours] = useState("3");
  const [banner, setBanner] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!babyId) return;
    const { reminders } = await api.get<{ reminders: ReminderWithDueAt[] }>(`/babies/${babyId}/reminders`);
    setReminders(reminders);
  }, [babyId]);

  useEffect(() => {
    if (!babyId) return;
    requestNotificationPermission();
    refresh();
    const interval = startReminderPolling(babyId, (r) => {
      setBanner(`${r.eventType} is due!`);
      refresh();
    });
    return () => clearInterval(interval);
  }, [babyId, refresh]);

  async function submit() {
    if (!babyId || !hours) return;
    await api.post(`/babies/${babyId}/reminders`, {
      eventType,
      intervalMinutes: Math.round(Number(hours) * 60)
    });
    refresh();
  }

  async function toggle(r: ReminderWithDueAt) {
    if (!babyId) return;
    await api.patch(`/babies/${babyId}/reminders/${r.id}`, { active: !r.active });
    refresh();
  }

  if (!babyId) return <p>Join a baby profile first.</p>;

  return (
    <div>
      <h1>Reminders</h1>
      {banner && (
        <div style={{ padding: 12, background: "#fff3cd", borderRadius: 8, marginBottom: 12 }}>
          🔔 {banner} <button onClick={() => setBanner(null)}>Dismiss</button>
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <select value={eventType} onChange={(e) => setEventType(e.target.value as typeof eventType)}>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Every N hours" />
        <button onClick={submit}>Add reminder</button>
      </div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {reminders.map((r) => (
          <li key={r.id} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
            {r.eventType} every {(r.intervalMinutes / 60).toFixed(1)}h — due {new Date(r.dueAt).toLocaleTimeString()}
            <button style={{ marginLeft: 8 }} onClick={() => toggle(r)}>
              {r.active ? "Pause" : "Resume"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
