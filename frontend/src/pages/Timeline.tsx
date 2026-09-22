import { useEffect, useState } from "react";
import { listEvents } from "../data/careEvents.js";
import { onSyncUpdate } from "../data/syncClient.js";
import { getActiveBabyId } from "../data/apiClient.js";
import { loadCaregivers } from "../data/caregivers.js";
import EventList from "../components/EventList.js";
import type { CareEvent } from "../data/db.js";

/** T035 — FR-007: merged chronological timeline across every caregiver. */
export default function Timeline() {
  const babyId = getActiveBabyId();
  const [events, setEvents] = useState<CareEvent[]>([]);

  useEffect(() => {
    if (!babyId) return;
    const refresh = () => listEvents(babyId).then(setEvents);
    loadCaregivers(babyId).then(refresh);
    return onSyncUpdate(refresh);
  }, [babyId]);

  if (!babyId) return <p className="text-muted-foreground">Join a baby profile first (see Invite page).</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Timeline</h1>
      <EventList events={events} />
    </div>
  );
}
