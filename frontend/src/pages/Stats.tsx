import { useCallback, useEffect, useState } from "react";
import { getStats, type StatsPeriod, type StatsResult } from "../data/stats.js";
import { onSyncUpdate } from "../data/syncClient.js";
import { getActiveBabyId } from "../data/apiClient.js";
import { SummaryStatCards, DailyCountsChart, SleepHoursChart } from "../components/StatsCharts.js";

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" }
];

function formatRange(result: StatsResult): string {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (result.period === "day") return result.rangeStart.toLocaleDateString(undefined, opts);
  const end = new Date(result.rangeEnd.getTime() - 1);
  return `${result.rangeStart.toLocaleDateString(undefined, opts)} – ${end.toLocaleDateString(undefined, opts)}`;
}

/** Aggregated feed/diaper/sleep (+ pumping) stats over Day/Week/Month, backed by the local Dexie store. */
export default function Stats() {
  const babyId = getActiveBabyId();
  const [period, setPeriod] = useState<StatsPeriod>("day");
  const [result, setResult] = useState<StatsResult | null>(null);

  const refresh = useCallback(async () => {
    if (!babyId) return;
    setResult(await getStats(babyId, period));
  }, [babyId, period]);

  useEffect(() => {
    refresh();
    return onSyncUpdate(refresh);
  }, [refresh]);

  if (!babyId) return <p>Join a baby profile first (see Invite page).</p>;
  if (!result) return <p>Loading…</p>;

  return (
    <div>
      <h1>Stats</h1>
      <div role="group" aria-label="Time period" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        {PERIODS.map((p) => (
          <button
            key={p.value}
            aria-pressed={period === p.value}
            onClick={() => setPeriod(p.value)}
            style={period === p.value ? { fontWeight: "bold", background: "#e0e0e0" } : undefined}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p style={{ opacity: 0.7, marginTop: 0 }}>{formatRange(result)}</p>

      <SummaryStatCards totals={result.totals} averagesPerDay={result.averagesPerDay} />

      {result.period !== "day" && (
        <>
          <DailyCountsChart buckets={result.buckets} />
          <SleepHoursChart buckets={result.buckets} />
        </>
      )}
    </div>
  );
}
