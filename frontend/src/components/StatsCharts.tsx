import type { CSSProperties } from "react";
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

function formatHours(ms: number): string {
  const totalMinutes = Math.round(ms / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
}

function formatOz(oz: number): string {
  return `${oz.toFixed(1)}oz`;
}

const cardStyle: CSSProperties = {
  flex: "1 1 160px",
  padding: 12,
  background: "#f4f4f4",
  borderRadius: 8
};

/** Day view (single data point — no chart needed) and the header block above Week/Month charts. */
export function SummaryStatCards({
  totals,
  averagesPerDay
}: {
  totals: Omit<DayBucket, "dateKey">;
  averagesPerDay?: Omit<DayBucket, "dateKey">;
}) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
      <div style={cardStyle}>
        <strong>🍼 Feeds</strong>
        <div>{totals.feedCount} total</div>
        <div style={{ fontSize: "0.85em", opacity: 0.75 }}>
          {totals.breastfeedCount} breastfeed · {totals.formulaCount} formula
          {totals.ozFed > 0 ? ` · ${formatOz(totals.ozFed)} fed` : ""}
        </div>
        {averagesPerDay && (
          <div style={{ fontSize: "0.85em", opacity: 0.6 }}>{averagesPerDay.feedCount.toFixed(1)}/day avg</div>
        )}
      </div>

      <div style={cardStyle}>
        <strong>🧷 Diapers</strong>
        <div>{totals.diaperCount} total</div>
        <div style={{ fontSize: "0.85em", opacity: 0.75 }}>
          {totals.peeCount} pee · {totals.poopCount} poop · {totals.bothCount} both
        </div>
        {averagesPerDay && (
          <div style={{ fontSize: "0.85em", opacity: 0.6 }}>{averagesPerDay.diaperCount.toFixed(1)}/day avg</div>
        )}
      </div>

      <div style={cardStyle}>
        <strong>😴 Sleep</strong>
        <div>{formatHours(totals.sleepMs)} total</div>
        <div style={{ fontSize: "0.85em", opacity: 0.75 }}>
          {totals.sleepSessions} session{totals.sleepSessions === 1 ? "" : "s"}
          {totals.sleepSessions > 0 ? ` · ${formatHours(totals.sleepMs / totals.sleepSessions)} avg` : ""}
        </div>
      </div>

      {(totals.pumpingSessions > 0 || (averagesPerDay?.pumpingSessions ?? 0) > 0) && (
        <div style={cardStyle}>
          <strong>🥛 Pumping</strong>
          <div>{formatOz(totals.ozPumped)} total</div>
          <div style={{ fontSize: "0.85em", opacity: 0.75 }}>
            {totals.pumpingSessions} session{totals.pumpingSessions === 1 ? "" : "s"}
          </div>
        </div>
      )}
    </div>
  );
}

function xAxisTickInterval(count: number): number | "preserveStartEnd" {
  return count <= 10 ? 0 : Math.ceil(count / 10);
}

/** Grouped daily feed/diaper counts — Week/Month views. */
export function DailyCountsChart({ buckets }: { buckets: DayBucket[] }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3>Feeds &amp; diapers per day</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={buckets}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="dateKey" interval={xAxisTickInterval(buckets.length)} fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip />
          <Legend />
          <Bar dataKey="feedCount" name="Feeds" fill="#4A90E2" />
          <Bar dataKey="diaperCount" name="Diapers" fill="#E2A64A" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Daily sleep hours — separate chart since it's a different unit/scale from counts. */
export function SleepHoursChart({ buckets }: { buckets: DayBucket[] }) {
  const data = buckets.map((b) => ({ dateKey: b.dateKey, sleepHours: Math.round((b.sleepMs / 3600000) * 10) / 10 }));
  return (
    <div style={{ marginBottom: 16 }}>
      <h3>Sleep hours per day</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="dateKey" interval={xAxisTickInterval(data.length)} fontSize={12} />
          <YAxis allowDecimals={false} fontSize={12} unit="h" />
          <Tooltip />
          <Bar dataKey="sleepHours" name="Sleep (hours)" fill="#7E57C2" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
