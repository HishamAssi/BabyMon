import { useEffect, useState } from "react";
import { Milk, Baby, Moon, type LucideIcon } from "lucide-react";
import { getStatusSummary, formatElapsed, type StatusSummary } from "../data/statusSummary.js";
import { getInProgressSleep } from "../data/careEvents.js";
import { onSyncUpdate } from "../data/syncClient.js";
import { getActiveBabyId } from "../data/apiClient.js";
import { loadCaregivers } from "../data/caregivers.js";
import SleepStatus from "../components/SleepStatus.js";
import type { CareEvent } from "../data/db.js";

const LABEL: Partial<Record<StatusSummary["type"], { text: string; icon: LucideIcon }>> = {
  feed: { text: "Last feed", icon: Milk },
  diaper: { text: "Last diaper", icon: Baby },
  sleep: { text: "Last sleep ended", icon: Moon }
};

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

  if (!babyId) return <p className="text-muted-foreground">Join a baby profile first (see Invite page).</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Baby status</h1>
      <SleepStatus inProgress={sleeping} />
      <ul className="divide-y divide-border">
        {summary.map((s) => {
          const entry = LABEL[s.type];
          if (!entry) return null;
          const Icon = entry.icon;
          return (
            <li key={s.type} className="flex items-center gap-3 py-3">
              <Icon className="size-5 text-muted-foreground" />
              <span className="flex-1 text-sm">{entry.text}</span>
              <strong className="text-sm font-semibold">{formatElapsed(s.lastAt)}</strong>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
