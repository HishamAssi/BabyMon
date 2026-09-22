import { useEffect, useState } from "react";
import { api, getActiveBabyId } from "../data/apiClient.js";
import { caregiverName, loadCaregivers } from "../data/caregivers.js";

interface GrowthMeasurement {
  id: string;
  date: string;
  weight?: number; // grams
  length?: number; // mm
  headCircumference?: number; // mm
  loggedByCaregiverId: string;
}

/** T039 — FR-010: growth history over time. */
export default function Growth() {
  const babyId = getActiveBabyId();
  const [measurements, setMeasurements] = useState<GrowthMeasurement[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weightKg, setWeightKg] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [headCm, setHeadCm] = useState("");

  async function refresh() {
    if (!babyId) return;
    const { measurements } = await api.get<{ measurements: GrowthMeasurement[] }>(`/babies/${babyId}/growth`);
    setMeasurements([...measurements].sort((a, b) => b.date.localeCompare(a.date)));
  }

  useEffect(() => {
    if (babyId) loadCaregivers(babyId).then(refresh);
  }, [babyId]);

  async function submit() {
    if (!babyId || !date) return;
    await api.post(`/babies/${babyId}/growth`, {
      date,
      weight: weightKg ? Math.round(Number(weightKg) * 1000) : undefined,
      length: lengthCm ? Math.round(Number(lengthCm) * 10) : undefined,
      headCircumference: headCm ? Math.round(Number(headCm) * 10) : undefined
    });
    setWeightKg("");
    setLengthCm("");
    setHeadCm("");
    refresh();
  }

  if (!babyId) return <p>Join a baby profile first.</p>;

  return (
    <div>
      <h1>Growth</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input placeholder="Weight (kg)" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
        <input placeholder="Length (cm)" value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} />
        <input placeholder="Head (cm)" value={headCm} onChange={(e) => setHeadCm(e.target.value)} />
        <button onClick={submit}>Add measurement</button>
      </div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {measurements.map((m) => (
          <li key={m.id} style={{ padding: "6px 0", borderBottom: "1px solid #eee" }}>
            {m.date}: {m.weight ? `${(m.weight / 1000).toFixed(2)}kg ` : ""}
            {m.length ? `${(m.length / 10).toFixed(1)}cm long ` : ""}
            {m.headCircumference ? `${(m.headCircumference / 10).toFixed(1)}cm head ` : ""}
            <span style={{ opacity: 0.7 }}>· {caregiverName(m.loggedByCaregiverId)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
