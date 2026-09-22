import { Moon } from "lucide-react";
import type { CareEvent } from "../data/db.js";
import { caregiverName } from "../data/caregivers.js";

/** FR-007 (Acceptance Scenario 3, US1) — visible to every linked caregiver. */
export default function SleepStatus({ inProgress }: { inProgress: CareEvent | undefined }) {
  if (!inProgress) return null;
  const since = new Date(inProgress.startTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <div className="mb-3 flex items-center gap-2 rounded-lg border border-sleep/30 bg-sleep/10 px-3 py-3 text-sm">
      <Moon className="size-5 shrink-0 text-sleep" />
      <span>
        Sleeping since <strong>{since}</strong> — started by {caregiverName(inProgress.loggedByCaregiverId)}
      </span>
    </div>
  );
}
