import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../data/apiClient.js";

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
      <h1>Welcome to BabyMon</h1>
      <p>Let's set up your baby's shared profile.</p>
      <label>
        Baby's name
        <input value={babyName} onChange={(e) => setBabyName(e.target.value)} />
      </label>
      <label>
        Birthdate
        <input type="date" value={babyBirthdate} onChange={(e) => setBabyBirthdate(e.target.value)} />
      </label>
      <button onClick={submit} disabled={!babyName.trim() || !babyBirthdate}>
        Create profile
      </button>
      {error && <p style={{ color: "crimson" }}>{error}</p>}
    </div>
  );
}
