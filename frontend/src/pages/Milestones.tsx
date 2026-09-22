import { useCallback, useEffect, useRef, useState } from "react";
import { api, getActiveBabyId, getDeviceToken } from "../data/apiClient.js";
import { caregiverName, loadCaregivers } from "../data/caregivers.js";
import { Button } from "../components/ui/button.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";

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

  if (!babyId) return <p className="text-muted-foreground">Join a baby profile first.</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Milestones</h1>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="milestone-date">Date</Label>
          <Input id="milestone-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="milestone-description">Milestone</Label>
          <Input
            id="milestone-description"
            placeholder="e.g. First smile"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-48"
          />
        </div>
        <Input
          type="file"
          accept="image/*"
          ref={fileRef}
          className="h-auto w-56 py-1.5 file:mr-2 file:rounded-md file:border-0 file:bg-muted file:px-2 file:py-1"
        />
        <Button onClick={submit} disabled={!description.trim()}>
          Add
        </Button>
      </div>
      <ul className="divide-y divide-border">
        {items.map((m) => (
          <li key={m.id} className="py-3 text-sm">
            <strong>{m.date}</strong>: {m.description}{" "}
            <span className="text-muted-foreground">· {caregiverName(m.loggedByCaregiverId)}</span>
            {m.photoRef && (
              <div className="mt-1">
                <img src={m.photoRef} alt={m.description} className="max-w-[200px] rounded-md" />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
