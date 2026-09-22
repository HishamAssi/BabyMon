import type { CareEvent } from "../data/db.js";
import { caregiverName } from "../data/caregivers.js";

const TYPE_LABEL: Record<CareEvent["type"], string> = {
  feed: "Feeding",
  diaper: "Diaper change",
  sleep: "Sleep",
  pumping: "Pumping"
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" });
}

/** FR-005/FR-007 — merged, attributed rendering of care events. */
export default function EventList({ events }: { events: CareEvent[] }) {
  if (events.length === 0) {
    return <p>No events logged yet.</p>;
  }
  return (
    <ul aria-label="Care event timeline" style={{ listStyle: "none", padding: 0 }}>
      {events.map((e) => (
        <li key={e.id} aria-label={`${TYPE_LABEL[e.type]} logged by ${caregiverName(e.loggedByCaregiverId)}`} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
          <strong>{TYPE_LABEL[e.type]}</strong>
          {e.type === "sleep" && !e.endTime ? " (in progress)" : ""}
          <div style={{ fontSize: "0.85em", opacity: 0.75 }}>
            {formatTime(e.startTime)}
            {e.endTime ? ` – ${formatTime(e.endTime)}` : ""} · logged by {caregiverName(e.loggedByCaregiverId)}
            {e.lastModifiedByCaregiverId !== e.loggedByCaregiverId
              ? ` · edited by ${caregiverName(e.lastModifiedByCaregiverId)}`
              : ""}
          </div>
          {e.notes ? <div style={{ fontSize: "0.9em" }}>{e.notes}</div> : null}
        </li>
      ))}
    </ul>
  );
}
