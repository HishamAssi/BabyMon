import { useCallback, useEffect, useState } from "react";
import { Milk, Baby, Moon, GlassWater, CircleStop } from "lucide-react";
import {
  createLocalEvent,
  updateLocalEvent,
  getInProgressSleep,
  listEvents
} from "../data/careEvents.js";
import { flushPendingQueue, onSyncUpdate } from "../data/syncClient.js";
import { getActiveBabyId } from "../data/apiClient.js";
import { loadCaregivers } from "../data/caregivers.js";
import type { CareEvent, DiaperContents } from "../data/db.js";
import EventList from "../components/EventList.js";
import SleepStatus from "../components/SleepStatus.js";
import { Button } from "../components/ui/button.js";
import { Card, CardContent } from "../components/ui/card.js";
import { Input } from "../components/ui/input.js";
import { Label } from "../components/ui/label.js";

/** Which optional-amount panel (if any) is currently open (research.md §1). */
type AmountPanel = "formula" | "pumping" | null;

/** T008, T015, T018 — one required tap per routine event; amount/note stay optional (FR-013, SC-001-004). */
export default function LogEvent() {
  const babyId = getActiveBabyId();
  const [recent, setRecent] = useState<CareEvent[]>([]);
  const [sleeping, setSleeping] = useState<CareEvent | undefined>();
  const [openPanel, setOpenPanel] = useState<AmountPanel>(null);
  const [amount, setAmount] = useState("");

  const refresh = useCallback(async () => {
    if (!babyId) return;
    setRecent((await listEvents(babyId)).slice(0, 10));
    setSleeping(await getInProgressSleep(babyId));
  }, [babyId]);

  useEffect(() => {
    if (!babyId) return;
    loadCaregivers(babyId).then(refresh);
    return onSyncUpdate(refresh);
  }, [babyId, refresh]);

  if (!babyId) return <p className="text-muted-foreground">Join a baby profile first (see Invite page).</p>;

  async function logAndRefresh(
    type: "feed" | "diaper" | "pumping",
    opts: { feedType?: CareEvent["feedType"]; amountOz?: CareEvent["amountOz"]; diaperContents?: DiaperContents } = {}
  ) {
    await createLocalEvent(babyId!, type, opts);
    await refresh();
    flushPendingQueue(babyId!).catch(() => undefined);
  }

  function openAmountPanel(panel: AmountPanel) {
    setAmount("");
    setOpenPanel(panel);
  }

  async function confirmAmountPanel() {
    const parsed = amount.trim() ? Number(amount) : undefined;
    if (openPanel === "formula") {
      await logAndRefresh("feed", { feedType: "formula", amountOz: parsed ?? null });
    } else if (openPanel === "pumping") {
      await logAndRefresh("pumping", { amountOz: parsed ?? null });
    }
    setOpenPanel(null);
    setAmount("");
  }

  async function toggleSleep() {
    if (sleeping) {
      await updateLocalEvent(sleeping.id, { endTime: new Date().toISOString() });
    } else {
      await createLocalEvent(babyId!, "sleep", { endTime: null });
    }
    await refresh();
    flushPendingQueue(babyId!).catch(() => undefined);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Log an event</h1>
      <SleepStatus inProgress={sleeping} />

      <div role="group" aria-label="Log a feed" className="mb-2 flex flex-wrap gap-2">
        <Button aria-label="Log a breastfeed now" onClick={() => logAndRefresh("feed", { feedType: "breastfeed" })}>
          <Milk /> Breastfeed
        </Button>
        <Button
          variant="secondary"
          aria-label="Log a formula feed, with an optional amount"
          onClick={() => openAmountPanel("formula")}
        >
          <Milk /> Formula
        </Button>
      </div>

      <div role="group" aria-label="Log a diaper change" className="mb-2 flex flex-wrap gap-2">
        <Button variant="secondary" aria-label="Log a wet diaper" onClick={() => logAndRefresh("diaper", { diaperContents: "pee" })}>
          <Baby /> Pee
        </Button>
        <Button variant="secondary" aria-label="Log a dirty diaper" onClick={() => logAndRefresh("diaper", { diaperContents: "poop" })}>
          <Baby /> Poop
        </Button>
        <Button
          variant="secondary"
          aria-label="Log a diaper that was both wet and dirty"
          onClick={() => logAndRefresh("diaper", { diaperContents: "both" })}
        >
          <Baby /> Both
        </Button>
      </div>

      <div role="group" aria-label="Log a pumping session" className="mb-4 flex flex-wrap gap-2">
        <Button variant="secondary" aria-label="Log a pumping session, with an optional amount" onClick={() => openAmountPanel("pumping")}>
          <GlassWater /> Pumping
        </Button>
        <Button
          variant="outline"
          aria-label={sleeping ? "End the current sleep session" : "Start a sleep session"}
          onClick={toggleSleep}
        >
          {sleeping ? <CircleStop /> : <Moon />}
          {sleeping ? "End sleep" : "Start sleep"}
        </Button>
      </div>

      {openPanel && (
        <Card className="mb-4">
          <CardContent
            role="group"
            aria-label={`Amount ${openPanel === "formula" ? "fed" : "pumped"}, optional`}
            className="flex flex-wrap items-end gap-3 pt-4"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amountOz">{openPanel === "formula" ? "Ounces fed (optional)" : "Ounces pumped (optional)"}</Label>
              <Input
                id="amountOz"
                type="number"
                inputMode="decimal"
                step="0.1"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-24"
                autoFocus
              />
            </div>
            <Button aria-label="Confirm and log this event" onClick={confirmAmountPanel}>
              Log
            </Button>
            <Button variant="ghost" aria-label="Cancel" onClick={() => setOpenPanel(null)}>
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-2 text-lg font-semibold">Recent</h2>
      <EventList events={recent} />
    </div>
  );
}
