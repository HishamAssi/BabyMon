import { useCallback, useEffect, useState } from "react";
import { api, getActiveBabyId } from "../data/apiClient.js";
import { caregiverName, loadCaregivers } from "../data/caregivers.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";

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

  const refresh = useCallback(async () => {
    if (!babyId) return;
    const { measurements } = await api.get<{ measurements: GrowthMeasurement[] }>(`/babies/${babyId}/growth`);
    setMeasurements([...measurements].sort((a, b) => b.date.localeCompare(a.date)));
  }, [babyId]);

  useEffect(() => {
    if (babyId) loadCaregivers(babyId).then(refresh);
  }, [babyId, refresh]);

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

  if (!babyId) return <p className="text-muted-foreground">Join a baby profile first.</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Growth</h1>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="growth-date">Date</Label>
          <Input id="growth-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="growth-weight">Weight (kg)</Label>
          <Input id="growth-weight" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="w-28" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="growth-length">Length (cm)</Label>
          <Input id="growth-length" value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} className="w-28" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="growth-head">Head (cm)</Label>
          <Input id="growth-head" value={headCm} onChange={(e) => setHeadCm(e.target.value)} className="w-28" />
        </div>
        <Button onClick={submit}>Add measurement</Button>
      </div>
      <ul className="divide-y divide-border">
        {measurements.map((m) => (
          <li key={m.id} className="py-2 text-sm">
            <span className="font-medium">{m.date}</span>
            {": "}
            {m.weight ? `${(m.weight / 1000).toFixed(2)}kg ` : ""}
            {m.length ? `${(m.length / 10).toFixed(1)}cm long ` : ""}
            {m.headCircumference ? `${(m.headCircumference / 10).toFixed(1)}cm head ` : ""}
            <span className="text-muted-foreground">· {caregiverName(m.loggedByCaregiverId)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
