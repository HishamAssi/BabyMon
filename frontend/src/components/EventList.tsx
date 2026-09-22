import { Milk, Baby, Moon, GlassWater, type LucideIcon } from "lucide-react";
import type { CareEvent } from "../data/db.js";
import { caregiverName } from "../data/caregivers.js";
import { Badge, type BadgeProps } from "./ui/badge.js";
import EditEventDialog from "./EditEventDialog.js";

const TYPE_LABEL: Record<CareEvent["type"], string> = {
  feed: "Feeding",
  diaper: "Diaper change",
  sleep: "Sleep",
  pumping: "Pumping"
};

const TYPE_ICON: Record<CareEvent["type"], LucideIcon> = {
  feed: Milk,
  diaper: Baby,
  sleep: Moon,
  pumping: GlassWater
};

const TYPE_BADGE_VARIANT: Record<CareEvent["type"], BadgeProps["variant"]> = {
  feed: "feed",
  diaper: "diaper",
  sleep: "sleep",
  pumping: "pumping"
};

const DIAPER_LABEL: Record<NonNullable<CareEvent["diaperContents"]>, string> = {
  pee: "Pee",
  poop: "Poop",
  both: "Both"
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric"
  });
}

/** 002-care-event-details — feed method/amount, diaper classification, pumping amount. */
function eventDetail(e: CareEvent): string {
  if (e.type === "feed" && e.feedType) {
    const method = e.feedType === "breastfeed" ? "Breastfeed" : "Formula";
    return e.amountOz != null ? `${method}, ${e.amountOz}oz` : method;
  }
  if (e.type === "diaper" && e.diaperContents) {
    return DIAPER_LABEL[e.diaperContents];
  }
  if (e.type === "pumping" && e.amountOz != null) {
    return `${e.amountOz}oz`;
  }
  return "";
}

/** FR-005/FR-007 — merged, attributed rendering of care events. Each row opens EditEventDialog (005-edit-backfill-entries). */
export default function EventList({ events }: { events: CareEvent[] }) {
  if (events.length === 0) {
    return <p className="text-muted-foreground">No events logged yet.</p>;
  }
  return (
    <ul aria-label="Care event timeline" className="divide-y divide-border">
      {events.map((e) => {
        const detail = eventDetail(e);
        const Icon = TYPE_ICON[e.type];
        return (
          <li key={e.id}>
            <EditEventDialog event={e}>
              <button
                type="button"
                aria-label={`Edit ${TYPE_LABEL[e.type]} logged by ${caregiverName(e.loggedByCaregiverId)}`}
                className="-mx-2 flex w-full items-start gap-3 rounded-md px-2 py-3 text-left transition-colors hover:bg-accent/50"
              >
                <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{TYPE_LABEL[e.type]}</span>
                    {detail ? <Badge variant={TYPE_BADGE_VARIANT[e.type]}>{detail}</Badge> : null}
                    {e.type === "sleep" && !e.endTime ? <Badge variant="secondary">in progress</Badge> : null}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatTime(e.startTime)}
                    {e.endTime ? ` – ${formatTime(e.endTime)}` : ""} · logged by {caregiverName(e.loggedByCaregiverId)}
                    {e.lastModifiedByCaregiverId !== e.loggedByCaregiverId
                      ? ` · edited by ${caregiverName(e.lastModifiedByCaregiverId)}`
                      : ""}
                  </div>
                  {e.notes ? <div className="text-sm">{e.notes}</div> : null}
                </div>
              </button>
            </EditEventDialog>
          </li>
        );
      })}
    </ul>
  );
}
