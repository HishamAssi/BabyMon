import { useCallback, useEffect, useState } from "react";
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

  if (!babyId) return <p>Join a baby profile first (see Invite page).</p>;

  async function logAndRefresh(
    type: "feed" | "diaper" | "pumping",
    opts: {
      feedType?: CareEvent["feedType"];
      amountOz?: CareEvent["amountOz"];
      diaperContents?: DiaperContents;
    } = {}
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
      <h1>Log an event</h1>
      <SleepStatus inProgress={sleeping} />

      <div
        role="group"
        aria-label="Log a feed"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}
      >
        <button
          aria-label="Log a breastfeed now"
          onClick={() => logAndRefresh("feed", { feedType: "breastfeed" })}
        >
          🍼 Breastfeed
        </button>
        <button
          aria-label="Log a formula feed, with an optional amount"
          onClick={() => openAmountPanel("formula")}
        >
          🍼 Formula
        </button>
      </div>

      <div
        role="group"
        aria-label="Log a diaper change"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}
      >
        <button
          aria-label="Log a wet diaper"
          onClick={() => logAndRefresh("diaper", { diaperContents: "pee" })}
        >
          🧷 Pee
        </button>
        <button
          aria-label="Log a dirty diaper"
          onClick={() => logAndRefresh("diaper", { diaperContents: "poop" })}
        >
          🧷 Poop
        </button>
        <button
          aria-label="Log a diaper that was both wet and dirty"
          onClick={() => logAndRefresh("diaper", { diaperContents: "both" })}
        >
          🧷 Both
        </button>
      </div>

      <div
        role="group"
        aria-label="Log a pumping session"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}
      >
        <button
          aria-label="Log a pumping session, with an optional amount"
          onClick={() => openAmountPanel("pumping")}
        >
          🥛 Pumping
        </button>
        <button
          aria-label={sleeping ? "End the current sleep session" : "Start a sleep session"}
          onClick={toggleSleep}
        >
          {sleeping ? "⏹ End sleep" : "😴 Start sleep"}
        </button>
      </div>

      {openPanel && (
        <div
          role="group"
          aria-label={`Amount ${openPanel === "formula" ? "fed" : "pumped"}, optional`}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 16,
            padding: 12,
            background: "#f4f4f4",
            borderRadius: 8
          }}
        >
          <label htmlFor="amountOz">
            {openPanel === "formula" ? "Ounces fed (optional)" : "Ounces pumped (optional)"}
          </label>
          <input
            id="amountOz"
            type="number"
            inputMode="decimal"
            step="0.1"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ width: "5em" }}
            autoFocus
          />
          <button aria-label="Confirm and log this event" onClick={confirmAmountPanel}>
            Log
          </button>
          <button aria-label="Cancel" onClick={() => setOpenPanel(null)}>
            Cancel
          </button>
        </div>
      )}

      <h2>Recent</h2>
      <EventList events={recent} />
    </div>
  );
}
