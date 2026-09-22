import { useCallback, useEffect, useState } from "react";
import { getStats, type StatsPeriod, type StatsResult } from "../data/stats.js";
import { onSyncUpdate } from "../data/syncClient.js";
import { getActiveBabyId } from "../data/apiClient.js";
import { SummaryStatCards, DailyCountsChart, SleepHoursChart } from "../components/StatsCharts.js";
import { Tabs, TabsList, TabsTrigger } from "../components/ui/tabs.js";

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

  if (!babyId) return <p className="text-muted-foreground">Join a baby profile first (see Invite page).</p>;
  if (!result) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">Stats</h1>
      <Tabs value={period} onValueChange={(v) => setPeriod(v as StatsPeriod)} className="mb-2">
        <TabsList aria-label="Time period">
          {PERIODS.map((p) => (
            <TabsTrigger key={p.value} value={p.value}>
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <p className="mb-4 text-sm text-muted-foreground">{formatRange(result)}</p>

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
