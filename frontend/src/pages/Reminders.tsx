import { useCallback, useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { api, getActiveBabyId } from "../data/apiClient.js";
import {
  requestNotificationPermission,
  startReminderPolling,
  type ReminderWithDueAt
} from "../data/notifications.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Alert, AlertDescription } from "../components/ui/alert.js";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../components/ui/select.js";

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

  if (!babyId) return <p className="text-muted-foreground">Join a baby profile first.</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Reminders</h1>
      {banner && (
        <Alert variant="warning" className="mb-4">
          <BellRing />
          <AlertDescription className="flex items-center justify-between gap-3">
            {banner}
            <Button size="sm" variant="ghost" onClick={() => setBanner(null)}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Select value={eventType} onValueChange={(v) => setEventType(v as typeof eventType)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Every N hours" className="w-40" />
        <Button onClick={submit}>Add reminder</Button>
      </div>
      <ul className="divide-y divide-border">
        {reminders.map((r) => (
          <li key={r.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {r.eventType} every {(r.intervalMinutes / 60).toFixed(1)}h — due {new Date(r.dueAt).toLocaleTimeString()}
            </span>
            <Button size="sm" variant="outline" onClick={() => toggle(r)}>
              {r.active ? "Pause" : "Resume"}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
