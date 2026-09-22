import { useEffect, useState } from "react";
import { getStatusSummary, formatElapsed, type StatusSummary } from "../data/statusSummary.js";
import { getInProgressSleep } from "../data/careEvents.js";
import { onSyncUpdate } from "../data/syncClient.js";
import { getActiveBabyId } from "../data/apiClient.js";
import { loadCaregivers } from "../data/caregivers.js";
import SleepStatus from "../components/SleepStatus.js";
import type { CareEvent } from "../data/db.js";

const LABEL: Record<StatusSummary["type"], string> = { feed: "🍼 Last feed", diaper: "🧷 Last diaper", sleep: "😴 Last sleep ended" };

/** T034 — FR-008, SC-005: at-a-glance status without scrolling. */
export default function BabyStatus() {
  const babyId = getActiveBabyId();
  const [summary, setSummary] = useState<StatusSummary[]>([]);
  const [sleeping, setSleeping] = useState<CareEvent | undefined>();

  useEffect(() => {
    if (!babyId) return;
    const refresh = async () => {
      setSummary(await getStatusSummary(babyId));
      setSleeping(await getInProgressSleep(babyId));
    };
    loadCaregivers(babyId).then(refresh);
    return onSyncUpdate(refresh);
  }, [babyId]);

  if (!babyId) return <p>Join a baby profile first (see Invite page).</p>;

  return (
    <div>
      <h1>Baby status</h1>
      <SleepStatus inProgress={sleeping} />
      <ul style={{ listStyle: "none", padding: 0 }}>
        {summary.map((s) => (
          <li key={s.type} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
            {LABEL[s.type]}: <strong>{formatElapsed(s.lastAt)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
