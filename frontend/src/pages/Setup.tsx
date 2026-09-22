import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../data/apiClient.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";
import { Alert, AlertDescription } from "../components/ui/alert.js";

/**
 * First-run bootstrap UI (backs T010's backend). Creates the household +
 * first baby, then hands the creator straight to /join/:code so they redeem
 * their own invite the same way any other caregiver would (FR-020).
 */
export default function Setup() {
  const navigate = useNavigate();
  const [babyName, setBabyName] = useState("");
  const [babyBirthdate, setBabyBirthdate] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!babyName.trim() || !babyBirthdate) return;
    setError(null);
    try {
      const { invite } = await api.post<{ invite: { code: string } }>("/setup", {
        babyName,
        babyBirthdate
      });
      navigate(`/join/${invite.code}`, { replace: true });
    } catch {
      setError("Setup couldn't be completed — this instance may already be set up.");
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">Welcome to BabyMon</h1>
      <p className="mb-4 text-muted-foreground">Let&rsquo;s set up your baby&rsquo;s shared profile.</p>
      <div className="mb-4 flex flex-col gap-1.5">
        <Label htmlFor="setup-name">Baby&rsquo;s name</Label>
        <Input id="setup-name" value={babyName} onChange={(e) => setBabyName(e.target.value)} />
      </div>
      <div className="mb-4 flex flex-col gap-1.5">
        <Label htmlFor="setup-birthdate">Birthdate</Label>
        <Input id="setup-birthdate" type="date" value={babyBirthdate} onChange={(e) => setBabyBirthdate(e.target.value)} />
      </div>
      <Button onClick={submit} disabled={!babyName.trim() || !babyBirthdate}>
        Create profile
      </Button>
      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
