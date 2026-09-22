import { useCallback, useEffect, useState } from "react";
import { api, getActiveBabyId, getCaregiverId } from "../data/apiClient.js";
import type { CaregiverSummary } from "../data/caregivers.js";
import { Button } from "../components/ui/button.js";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel
} from "../components/ui/alert-dialog.js";

/** T031 — FR-004. Lists active caregivers; lets you revoke access. */
export default function ManageCaregivers() {
  const babyId = getActiveBabyId();
  const myId = getCaregiverId();
  const [caregivers, setCaregivers] = useState<CaregiverSummary[]>([]);

  const refresh = useCallback(async () => {
    if (!babyId) return;
    const { caregivers } = await api.get<{ caregivers: CaregiverSummary[] }>(`/babies/${babyId}/caregivers`);
    setCaregivers(caregivers.filter((c) => c.status === "active"));
  }, [babyId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function revoke(caregiverId: string) {
    if (!babyId) return;
    await api.delete(`/babies/${babyId}/caregivers/${caregiverId}`);
    await refresh();
  }

  if (!babyId) return <p className="text-muted-foreground">Join a baby profile first.</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Caregivers</h1>
      <ul className="divide-y divide-border">
        {caregivers.map((c) => (
          <li key={c.caregiverId} className="flex items-center justify-between py-2 text-sm">
            <span>
              {c.displayName} {c.caregiverId === myId ? <span className="text-muted-foreground">(you)</span> : null}
            </span>
            {c.caregiverId !== myId && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    Remove
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove {c.displayName}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      They&rsquo;ll lose access to this baby&rsquo;s log. Their past entries stay in the history.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => revoke(c.caregiverId)}>Remove</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
