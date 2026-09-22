import { useCallback, useEffect, useRef, useState } from "react";
import { api, getActiveBabyId, getDeviceToken } from "../data/apiClient.js";
import { caregiverName, loadCaregivers } from "../data/caregivers.js";

interface Milestone {
  id: string;
  date: string;
  description: string;
  photoRef?: string | null;
  loggedByCaregiverId: string;
}

/** T040 — FR-011: milestones list + add, with an optional photo. */
export default function Milestones() {
  const babyId = getActiveBabyId();
  const [items, setItems] = useState<Milestone[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (!babyId) return;
    const { milestones } = await api.get<{ milestones: Milestone[] }>(`/babies/${babyId}/milestones`);
    setItems([...milestones].sort((a, b) => b.date.localeCompare(a.date)));
  }, [babyId]);

  useEffect(() => {
    if (babyId) loadCaregivers(babyId).then(refresh);
  }, [babyId, refresh]);

  async function submit() {
    if (!babyId || !description.trim()) return;
    const created = await api.post<Milestone>(`/babies/${babyId}/milestones`, { date, description });

    const file = fileRef.current?.files?.[0];
    if (file) {
      const form = new FormData();
      form.append("file", file);
      await fetch(`/api/babies/${babyId}/milestones/${created.id}/photo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getDeviceToken()}` },
        body: form
      });
    }

    setDescription("");
    if (fileRef.current) fileRef.current.value = "";
    refresh();
  }

  if (!babyId) return <p>Join a baby profile first.</p>;

  return (
    <div>
      <h1>Milestones</h1>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          placeholder="e.g. First smile"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <input type="file" accept="image/*" ref={fileRef} />
        <button onClick={submit} disabled={!description.trim()}>
          Add
        </button>
      </div>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {items.map((m) => (
          <li key={m.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
            <strong>{m.date}</strong>: {m.description}{" "}
            <span style={{ opacity: 0.7 }}>· {caregiverName(m.loggedByCaregiverId)}</span>
            {m.photoRef && (
              <div>
                <img src={m.photoRef} alt={m.description} style={{ maxWidth: 200, marginTop: 4 }} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
