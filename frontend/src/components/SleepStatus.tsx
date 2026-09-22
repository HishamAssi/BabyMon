import type { CareEvent } from "../data/db.js";
import { caregiverName } from "../data/caregivers.js";

/** FR-007 (Acceptance Scenario 3, US1) — visible to every linked caregiver. */
export default function SleepStatus({ inProgress }: { inProgress: CareEvent | undefined }) {
  if (!inProgress) return null;
  const since = new Date(inProgress.startTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <div style={{ padding: 12, background: "#eef4ff", borderRadius: 8, marginBottom: 12 }}>
      😴 Sleeping since {since} — started by {caregiverName(inProgress.loggedByCaregiverId)}
    </div>
  );
}
