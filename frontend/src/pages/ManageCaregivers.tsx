import { useEffect, useState } from "react";
import { api, getActiveBabyId, getCaregiverId } from "../data/apiClient.js";
import type { CaregiverSummary } from "../data/caregivers.js";

/** T031 — FR-004. Lists active caregivers; lets you revoke access. */
export default function ManageCaregivers() {
  const babyId = getActiveBabyId();
  const myId = getCaregiverId();
  const [caregivers, setCaregivers] = useState<CaregiverSummary[]>([]);

  async function refresh() {
    if (!babyId) return;
    const { caregivers } = await api.get<{ caregivers: CaregiverSummary[] }>(`/babies/${babyId}/caregivers`);
    setCaregivers(caregivers.filter((c) => c.status === "active"));
  }

  useEffect(() => {
    refresh();
  }, [babyId]);

  async function revoke(caregiverId: string) {
    if (!babyId) return;
    if (!confirm("Remove this caregiver's access? Their past entries stay in the history.")) return;
    await api.delete(`/babies/${babyId}/caregivers/${caregiverId}`);
    await refresh();
  }

  if (!babyId) return <p>Join a baby profile first.</p>;

  return (
    <div>
      <h1>Caregivers</h1>
      <ul>
        {caregivers.map((c) => (
          <li key={c.caregiverId} style={{ padding: "6px 0" }}>
            {c.displayName} {c.caregiverId === myId ? "(you)" : ""}
            {c.caregiverId !== myId && (
              <button style={{ marginLeft: 8 }} onClick={() => revoke(c.caregiverId)}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
