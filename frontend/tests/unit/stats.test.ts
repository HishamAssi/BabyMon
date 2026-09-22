import { describe, it, expect } from "vitest";
import { getRangeForPeriod, bucketEvents } from "../../src/data/stats.js";
import type { CareEvent } from "../../src/data/db.js";

function event(overrides: Partial<CareEvent>): CareEvent {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    babyId: "baby-1",
    type: "feed",
    startTime: new Date().toISOString(),
    endTime: null,
    loggedByCaregiverId: "caregiver-1",
    lastModifiedByCaregiverId: "caregiver-1",
    deletedAt: null,
    updatedAt: new Date().toISOString(),
    pendingOp: null,
    ...overrides
  };
}

describe("getRangeForPeriod", () => {
  it("day: returns local midnight to next midnight", () => {
    const now = new Date(2026, 2, 15, 14, 30); // Mar 15 2026, 2:30pm (a Sunday)
    const { start, end } = getRangeForPeriod("day", now);
    expect(start).toEqual(new Date(2026, 2, 15, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 2, 16, 0, 0, 0, 0));
  });

  it("week: returns Monday-Sunday when `now` is a Sunday", () => {
    const sunday = new Date(2026, 2, 15, 10, 0); // Mar 15 2026 is a Sunday
    const { start, end } = getRangeForPeriod("week", sunday);
    expect(start).toEqual(new Date(2026, 2, 9, 0, 0, 0, 0)); // Mon Mar 9
    expect(end).toEqual(new Date(2026, 2, 16, 0, 0, 0, 0)); // Mon Mar 16
  });

  it("week: returns Monday-Sunday when `now` is a Wednesday", () => {
    const wednesday = new Date(2026, 2, 11, 10, 0); // Mar 11 2026 is a Wednesday
    const { start, end } = getRangeForPeriod("week", wednesday);
    expect(start).toEqual(new Date(2026, 2, 9, 0, 0, 0, 0)); // Mon Mar 9
    expect(end).toEqual(new Date(2026, 2, 16, 0, 0, 0, 0)); // Mon Mar 16
  });

  it("month: returns the first-of-month to first-of-next-month", () => {
    const now = new Date(2026, 2, 20);
    const { start, end } = getRangeForPeriod("month", now);
    expect(start).toEqual(new Date(2026, 2, 1));
    expect(end).toEqual(new Date(2026, 3, 1));
  });
});

describe("bucketEvents", () => {
  const start = new Date(2026, 2, 9); // Mon Mar 9
  const end = new Date(2026, 2, 11); // Wed Mar 11 (exclusive) — a 2-day range: Mon, Tue

  it("counts breastfeed and formula-with-amount feeds separately", () => {
    const events = [
      event({ type: "feed", feedType: "breastfeed", startTime: new Date(2026, 2, 9, 8).toISOString() }),
      event({
        type: "feed",
        feedType: "formula",
        amountOz: 4.5,
        startTime: new Date(2026, 2, 9, 12).toISOString()
      })
    ];
    const [monday] = bucketEvents(events, start, end);
    expect(monday.feedCount).toBe(2);
    expect(monday.breastfeedCount).toBe(1);
    expect(monday.formulaCount).toBe(1);
    expect(monday.ozFed).toBe(4.5);
  });

  it("counts each diaper classification", () => {
    const events = [
      event({ type: "diaper", diaperContents: "pee", startTime: new Date(2026, 2, 9, 8).toISOString() }),
      event({ type: "diaper", diaperContents: "poop", startTime: new Date(2026, 2, 9, 9).toISOString() }),
      event({ type: "diaper", diaperContents: "both", startTime: new Date(2026, 2, 9, 10).toISOString() })
    ];
    const [monday] = bucketEvents(events, start, end);
    expect(monday.diaperCount).toBe(3);
    expect(monday.peeCount).toBe(1);
    expect(monday.poopCount).toBe(1);
    expect(monday.bothCount).toBe(1);
  });

  it("excludes in-progress sleep (no endTime) from totals", () => {
    const events = [event({ type: "sleep", endTime: null, startTime: new Date(2026, 2, 9, 20).toISOString() })];
    const [monday] = bucketEvents(events, start, end);
    expect(monday.sleepSessions).toBe(0);
    expect(monday.sleepMs).toBe(0);
  });

  it("attributes a sleep session crossing midnight wholly to its start day", () => {
    const startTime = new Date(2026, 2, 9, 23, 0); // Mon 11pm
    const endTime = new Date(2026, 2, 10, 2, 0); // Tue 2am — 3 hours later
    const events = [event({ type: "sleep", startTime: startTime.toISOString(), endTime: endTime.toISOString() })];
    const [monday, tuesday] = bucketEvents(events, start, end);
    expect(monday.sleepSessions).toBe(1);
    expect(monday.sleepMs).toBe(3 * 60 * 60 * 1000);
    expect(tuesday.sleepSessions).toBe(0);
    expect(tuesday.sleepMs).toBe(0);
  });

  it("counts pumping sessions and sums their amounts", () => {
    const events = [
      event({ type: "pumping", amountOz: 3, startTime: new Date(2026, 2, 9, 8).toISOString() }),
      event({ type: "pumping", amountOz: 2.5, startTime: new Date(2026, 2, 9, 14).toISOString() })
    ];
    const [monday] = bucketEvents(events, start, end);
    expect(monday.pumpingSessions).toBe(2);
    expect(monday.ozPumped).toBe(5.5);
  });

  it("produces one bucket per day in range, even with no events", () => {
    const buckets = bucketEvents([], start, end);
    expect(buckets.map((b) => b.dateKey)).toEqual(["2026-03-09", "2026-03-10"]);
  });

  it("ignores events outside the range", () => {
    const events = [event({ type: "feed", feedType: "breastfeed", startTime: new Date(2026, 2, 20, 8).toISOString() })];
    const buckets = bucketEvents(events, start, end);
    expect(buckets.every((b) => b.feedCount === 0)).toBe(true);
  });
});
