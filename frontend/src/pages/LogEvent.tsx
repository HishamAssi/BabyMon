import { useCallback, useEffect, useState } from "react";
import {
  createLocalEvent,
  updateLocalEvent,
  getInProgressSleep,
  listEvents
} from "../data/careEvents.js";
import { flushPendingQueue, onSyncUpdate } from "../data/syncClient.js";
import { getActiveBabyId } from "../data/apiClient.js";
import { loadCaregivers } from "../data/caregivers.js";
import type { CareEvent } from "../data/db.js";
import EventList from "../components/EventList.js";
import SleepStatus from "../components/SleepStatus.js";

/** T022 — one tap per routine event (SC-001: log in under 10s). */
export default function LogEvent() {
  const babyId = getActiveBabyId();
  const [recent, setRecent] = useState<CareEvent[]>([]);
  const [sleeping, setSleeping] = useState<CareEvent | undefined>();

  const refresh = useCallback(async () => {
    if (!babyId) return;
    setRecent((await listEvents(babyId)).slice(0, 10));
    setSleeping(await getInProgressSleep(babyId));
  }, [babyId]);

  useEffect(() => {
    if (!babyId) return;
    loadCaregivers(babyId).then(refresh);
    return onSyncUpdate(refresh);
  }, [babyId, refresh]);

  if (!babyId) return <p>Join a baby profile first (see Invite page).</p>;

  async function logInstant(type: "feed" | "diaper" | "pumping") {
    await createLocalEvent(babyId!, type);
    await refresh();
    flushPendingQueue(babyId!).catch(() => undefined);
  }

  async function toggleSleep() {
    if (sleeping) {
      await updateLocalEvent(sleeping.id, { endTime: new Date().toISOString() });
    } else {
      await createLocalEvent(babyId!, "sleep", { endTime: null });
    }
    await refresh();
    flushPendingQueue(babyId!).catch(() => undefined);
  }

  return (
    <div>
      <h1>Log an event</h1>
      <SleepStatus inProgress={sleeping} />
      <div role="group" aria-label="Log a care event" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button aria-label="Log a feeding now" onClick={() => logInstant("feed")}>🍼 Feed</button>
        <button aria-label="Log a diaper change now" onClick={() => logInstant("diaper")}>🧷 Diaper</button>
        <button aria-label="Log a pumping session now" onClick={() => logInstant("pumping")}>🥛 Pumping</button>
        <button aria-label={sleeping ? "End the current sleep session" : "Start a sleep session"} onClick={toggleSleep}>
          {sleeping ? "⏹ End sleep" : "😴 Start sleep"}
        </button>
      </div>
      <h2>Recent</h2>
      <EventList events={recent} />
    </div>
  );
}
