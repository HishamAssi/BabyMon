import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, storeDeviceIdentity, isJoined } from "../data/apiClient.js";
import { listEvents } from "../data/careEvents.js";
import { loadCaregivers } from "../data/caregivers.js";
import { connectSync, pollCatchUp } from "../data/syncClient.js";
import EventList from "../components/EventList.js";
import type { CareEvent } from "../data/db.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { Alert, AlertDescription } from "../components/ui/alert.js";

/** T030/T032 — FR-020, FR-022. Redeem an invite; on success, show existing history (not empty). */
export default function JoinInvite() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<CareEvent[] | null>(null);

  useEffect(() => {
    if (isJoined()) navigate("/", { replace: true });
  }, [navigate]);

  async function redeem() {
    if (!code || !displayName.trim()) return;
    setError(null);
    try {
      const { deviceToken, caregiverId, babyId } = await api.post<{
        deviceToken: string;
        caregiverId: string;
        babyId: string;
      }>(`/invites/${code}/redeem`, { displayName });
      storeDeviceIdentity(deviceToken, caregiverId, babyId);

      await loadCaregivers(babyId, true);
      await pollCatchUp(babyId); // pulls existing server history into the local store
      connectSync(babyId);
      setHistory(await listEvents(babyId));
    } catch {
      setError("This invite link is invalid or has expired.");
    }
  }

  if (history) {
    return (
      <div>
        <h1 className="mb-2 text-2xl font-semibold">You&rsquo;re in!</h1>
        <p className="mb-4 text-muted-foreground">Here&rsquo;s what&rsquo;s already been logged for this baby:</p>
        <EventList events={history} />
        {/* Full reload (not client-side nav): App decides Onboarding vs MainApp from
            isJoined() at mount time, and that needs to be re-evaluated now. */}
        <Button className="mt-4" onClick={() => (window.location.href = "/")}>
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Join this baby&rsquo;s log</h1>
      <div className="mb-4 flex flex-col gap-1.5">
        <Label htmlFor="displayName">Your name</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Husband"
        />
      </div>
      <Button aria-label="Join this baby's shared log" onClick={redeem} disabled={!displayName.trim()}>
        Join
      </Button>
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription role="alert">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
