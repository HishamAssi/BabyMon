import { db } from "./db.js";
import type { CareEvent } from "./db.js";

export type StatsPeriod = "day" | "week" | "month";

export interface DayBucket {
  dateKey: string; // "YYYY-MM-DD", local calendar day
  feedCount: number;
  breastfeedCount: number;
  formulaCount: number;
  ozFed: number;
  diaperCount: number;
  peeCount: number;
  poopCount: number;
  bothCount: number;
  sleepMs: number;
  sleepSessions: number;
  pumpingSessions: number;
  ozPumped: number;
}

export interface StatsResult {
  period: StatsPeriod;
  rangeStart: Date;
  rangeEnd: Date;
  buckets: DayBucket[];
  totals: Omit<DayBucket, "dateKey">;
  /** Only present for "week"/"month" — totals divided by elapsed days so far in the range. */
  averagesPerDay?: Omit<DayBucket, "dateKey">;
}

function emptyBucket(dateKey: string): DayBucket {
  return {
    dateKey,
    feedCount: 0,
    breastfeedCount: 0,
    formulaCount: 0,
    ozFed: 0,
    diaperCount: 0,
    peeCount: 0,
    poopCount: 0,
    bothCount: 0,
    sleepMs: 0,
    sleepSessions: 0,
    pumpingSessions: 0,
    ozPumped: 0
  };
}

function localMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dateKeyOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Pure — local-calendar-time period boundaries (day midnight / Monday-Sunday week / calendar month). */
export function getRangeForPeriod(period: StatsPeriod, now: Date = new Date()): { start: Date; end: Date } {
  if (period === "day") {
    const start = localMidnight(now);
    return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
  }
  if (period === "week") {
    const dow = now.getDay(); // 0=Sun..6=Sat
    const diffFromMonday = (dow + 6) % 7; // days since Monday
    const start = new Date(localMidnight(now).getTime() - diffFromMonday * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { start, end };
  }
  // month
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

/**
 * Pure — one DayBucket per local calendar day in [start, end). Assumes `events`
 * is already filtered to non-deleted rows (getStats does that before calling this).
 *
 * Sleep is bucketed entirely by its start day, even if it ends after midnight —
 * simplest rule, avoids splitting one session's duration across two buckets
 * (see plan notes). In-progress sleep (no endTime) is excluded from totals,
 * matching statusSummary.ts's existing behavior.
 */
export function bucketEvents(events: CareEvent[], start: Date, end: Date): DayBucket[] {
  const buckets = new Map<string, DayBucket>();
  for (let d = new Date(start); d < end; d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
    const key = dateKeyOf(d);
    buckets.set(key, emptyBucket(key));
  }

  for (const e of events) {
    const startTime = new Date(e.startTime);
    if (startTime < start || startTime >= end) continue;
    const bucket = buckets.get(dateKeyOf(startTime));
    if (!bucket) continue; // shouldn't happen given the pre-seeded range above

    if (e.type === "feed") {
      bucket.feedCount++;
      if (e.feedType === "breastfeed") bucket.breastfeedCount++;
      if (e.feedType === "formula") bucket.formulaCount++;
      if (e.amountOz != null) bucket.ozFed += e.amountOz;
    } else if (e.type === "diaper") {
      bucket.diaperCount++;
      if (e.diaperContents === "pee") bucket.peeCount++;
      if (e.diaperContents === "poop") bucket.poopCount++;
      if (e.diaperContents === "both") bucket.bothCount++;
    } else if (e.type === "sleep") {
      if (e.endTime) {
        bucket.sleepMs += new Date(e.endTime).getTime() - startTime.getTime();
        bucket.sleepSessions++;
      }
    } else if (e.type === "pumping") {
      bucket.pumpingSessions++;
      if (e.amountOz != null) bucket.ozPumped += e.amountOz;
    }
  }

  return [...buckets.values()].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
}

function sumBuckets(buckets: DayBucket[]): Omit<DayBucket, "dateKey"> {
  const totals = emptyBucket("");
  for (const b of buckets) {
    totals.feedCount += b.feedCount;
    totals.breastfeedCount += b.breastfeedCount;
    totals.formulaCount += b.formulaCount;
    totals.ozFed += b.ozFed;
    totals.diaperCount += b.diaperCount;
    totals.peeCount += b.peeCount;
    totals.poopCount += b.poopCount;
    totals.bothCount += b.bothCount;
    totals.sleepMs += b.sleepMs;
    totals.sleepSessions += b.sleepSessions;
    totals.pumpingSessions += b.pumpingSessions;
    totals.ozPumped += b.ozPumped;
  }
  return totals; // dateKey is "" and simply ignored by callers (return type omits it)
}

function divideBucket(totals: Omit<DayBucket, "dateKey">, divisor: number): Omit<DayBucket, "dateKey"> {
  const out = { ...totals };
  for (const key of Object.keys(out) as (keyof typeof out)[]) {
    out[key] = divisor > 0 ? out[key] / divisor : 0;
  }
  return out;
}

/** The only Dexie-touching function — everything else here is pure and unit-tested directly. */
export async function getStats(babyId: string, period: StatsPeriod, now: Date = new Date()): Promise<StatsResult> {
  const rows = await db.careEvents.where({ babyId }).toArray();
  const active = rows.filter((e) => !e.deletedAt);

  const { start, end } = getRangeForPeriod(period, now);
  const buckets = bucketEvents(active, start, end);
  const totals = sumBuckets(buckets);

  if (period === "day") {
    return { period, rangeStart: start, rangeEnd: end, buckets, totals };
  }

  const elapsedMs = Math.min(now.getTime(), end.getTime()) - start.getTime();
  const elapsedDays = Math.max(1, Math.min(buckets.length, Math.ceil(elapsedMs / (24 * 60 * 60 * 1000))));
  const averagesPerDay = divideBucket(totals, elapsedDays);

  return { period, rangeStart: start, rangeEnd: end, buckets, totals, averagesPerDay };
}
