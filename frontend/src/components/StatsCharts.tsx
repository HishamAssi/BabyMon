import { Milk, Baby, Moon, GlassWater } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import type { DayBucket } from "../data/stats.js";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card.js";

function formatHours(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function formatOz(oz: number): string {
  return `${oz.toFixed(1)}oz`;
}

/** Day view (single data point — no chart needed) and the header block above Week/Month charts. */
export function SummaryStatCards({
  totals,
  averagesPerDay
}: {
  totals: Omit<DayBucket, "dateKey">;
  averagesPerDay?: Omit<DayBucket, "dateKey">;
}) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-feed">
            <Milk className="size-4" /> Feeds
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg font-semibold">{totals.feedCount} total</div>
          <div className="text-sm text-muted-foreground">
            {totals.breastfeedCount} breastfeed · {totals.formulaCount} formula
            {totals.ozFed > 0 ? ` · ${formatOz(totals.ozFed)} fed` : ""}
          </div>
          {averagesPerDay && (
            <div className="text-xs text-muted-foreground/80">{averagesPerDay.feedCount.toFixed(1)}/day avg</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-diaper">
            <Baby className="size-4" /> Diapers
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg font-semibold">{totals.diaperCount} total</div>
          <div className="text-sm text-muted-foreground">
            {totals.peeCount} pee · {totals.poopCount} poop · {totals.bothCount} both
          </div>
          {averagesPerDay && (
            <div className="text-xs text-muted-foreground/80">{averagesPerDay.diaperCount.toFixed(1)}/day avg</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sleep">
            <Moon className="size-4" /> Sleep
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg font-semibold">{formatHours(totals.sleepMs)} total</div>
          <div className="text-sm text-muted-foreground">
            {totals.sleepSessions} session{totals.sleepSessions === 1 ? "" : "s"}
            {totals.sleepSessions > 0 ? ` · ${formatHours(totals.sleepMs / totals.sleepSessions)} avg` : ""}
          </div>
        </CardContent>
      </Card>

      {(totals.pumpingSessions > 0 || (averagesPerDay?.pumpingSessions ?? 0) > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-pumping">
              <GlassWater className="size-4" /> Pumping
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-semibold">{formatOz(totals.ozPumped)} total</div>
            <div className="text-sm text-muted-foreground">
              {totals.pumpingSessions} session{totals.pumpingSessions === 1 ? "" : "s"}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function xAxisTickInterval(count: number): number | "preserveStartEnd" {
  return count <= 10 ? 0 : Math.ceil(count / 10);
}

/** "2026-09-21" -> "Sep 21" — the ISO dateKey is far too wide to show at mobile chart widths. */
function formatTick(dateKey: string): string {
  const [, month, day] = dateKey.split("-").map(Number);
  return new Date(2000, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Grouped daily feed/diaper counts — Week/Month views. */
export function DailyCountsChart({ buckets }: { buckets: DayBucket[] }) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Feeds &amp; diapers per day</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={buckets}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="dateKey"
              tickFormatter={formatTick}
              interval={xAxisTickInterval(buckets.length)}
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis allowDecimals={false} fontSize={12} stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
            <Legend />
            <Bar dataKey="feedCount" name="Feeds" fill="hsl(var(--feed))" />
            <Bar dataKey="diaperCount" name="Diapers" fill="hsl(var(--diaper))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/** Daily sleep hours — separate chart since it's a different unit/scale from counts. */
export function SleepHoursChart({ buckets }: { buckets: DayBucket[] }) {
  const data = buckets.map((b) => ({ dateKey: b.dateKey, sleepHours: Math.round((b.sleepMs / 3600000) * 10) / 10 }));
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>Sleep hours per day</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="dateKey"
              tickFormatter={formatTick}
              interval={xAxisTickInterval(data.length)}
              fontSize={12}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis allowDecimals={false} fontSize={12} unit="h" stroke="hsl(var(--muted-foreground))" />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
            <Bar dataKey="sleepHours" name="Sleep (hours)" fill="hsl(var(--sleep))" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
