import { useState, type ReactNode } from "react";
import { updateLocalEvent, deleteLocalEvent } from "../data/careEvents.js";
import { flushPendingQueue } from "../data/syncClient.js";
import type { CareEvent, FeedType, DiaperContents } from "../data/db.js";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog.js";
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
} from "./ui/alert-dialog.js";
import { Button } from "./ui/button.js";
import { Input } from "./ui/input.js";
import { Label } from "./ui/label.js";

const TYPE_LABEL: Record<CareEvent["type"], string> = {
  feed: "feeding",
  diaper: "diaper change",
  sleep: "sleep",
  pumping: "pumping session"
};

/** "2026-09-22T14:30:00.000Z" -> "2026-09-22T14:30" (local), the value <input type="datetime-local"> needs. */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string {
  return new Date(value).toISOString();
}

/** Wraps `children` (a row) in a Dialog that edits — or deletes — that Care Event (research: data/sync layer already fully supports this, see plan). */
export default function EditEventDialog({ event, children }: { event: CareEvent; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState(() => toDatetimeLocal(event.startTime));
  const [endTime, setEndTime] = useState(() => (event.endTime ? toDatetimeLocal(event.endTime) : ""));
  const [feedType, setFeedType] = useState<FeedType>(event.feedType ?? "breastfeed");
  const [amountOz, setAmountOz] = useState(event.amountOz != null ? String(event.amountOz) : "");
  const [diaperContents, setDiaperContents] = useState<DiaperContents>(event.diaperContents ?? "pee");
  const [notes, setNotes] = useState(event.notes ?? "");
  const [saving, setSaving] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      // Reset fields to the event's current values each time it's opened.
      setStartTime(toDatetimeLocal(event.startTime));
      setEndTime(event.endTime ? toDatetimeLocal(event.endTime) : "");
      setFeedType(event.feedType ?? "breastfeed");
      setAmountOz(event.amountOz != null ? String(event.amountOz) : "");
      setDiaperContents(event.diaperContents ?? "pee");
      setNotes(event.notes ?? "");
    }
    setOpen(next);
  }

  async function save() {
    setSaving(true);
    try {
      const newStart = fromDatetimeLocal(startTime);
      const patch: Parameters<typeof updateLocalEvent>[1] = {
        notes: notes.trim() || undefined,
        startTime: newStart,
        // Feed/diaper/pumping are logged as an instant, not a duration — keep endTime in lockstep with startTime.
        endTime: event.type === "sleep" ? (endTime ? fromDatetimeLocal(endTime) : null) : newStart
      };
      if (event.type === "feed") {
        patch.feedType = feedType;
        patch.amountOz = feedType === "formula" && amountOz.trim() ? Number(amountOz) : null;
      }
      if (event.type === "pumping") {
        patch.amountOz = amountOz.trim() ? Number(amountOz) : null;
      }
      if (event.type === "diaper") {
        patch.diaperContents = diaperContents;
      }
      await updateLocalEvent(event.id, patch);
      await flushPendingQueue(event.babyId);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    await deleteLocalEvent(event.id);
    await flushPendingQueue(event.babyId);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {TYPE_LABEL[event.type]}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {event.type === "feed" && (
            <div className="flex flex-col gap-1.5">
              <Label>Method</Label>
              <div role="group" aria-label="Feeding method" className="flex gap-2">
                <Button
                  type="button"
                  variant={feedType === "breastfeed" ? "default" : "secondary"}
                  onClick={() => setFeedType("breastfeed")}
                >
                  Breastfeed
                </Button>
                <Button
                  type="button"
                  variant={feedType === "formula" ? "default" : "secondary"}
                  onClick={() => setFeedType("formula")}
                >
                  Formula
                </Button>
              </div>
            </div>
          )}

          {event.type === "diaper" && (
            <div className="flex flex-col gap-1.5">
              <Label>Classification</Label>
              <div role="group" aria-label="Diaper classification" className="flex gap-2">
                {(["pee", "poop", "both"] as const).map((v) => (
                  <Button
                    key={v}
                    type="button"
                    variant={diaperContents === v ? "default" : "secondary"}
                    onClick={() => setDiaperContents(v)}
                    className="capitalize"
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {(event.type === "pumping" || (event.type === "feed" && feedType === "formula")) && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-amount">Ounces (optional)</Label>
              <Input
                id="edit-amount"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                value={amountOz}
                onChange={(e) => setAmountOz(e.target.value)}
                className="w-28"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-start">{event.type === "sleep" ? "Started" : "When it happened"}</Label>
            <Input id="edit-start" type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>

          {event.type === "sleep" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-end">Ended (leave blank if still sleeping)</Label>
              <Input id="edit-end" type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Input id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">
                Delete entry
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this {TYPE_LABEL[event.type]}?</AlertDialogTitle>
                <AlertDialogDescription>This removes it from the timeline and stats. This can&rsquo;t be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
