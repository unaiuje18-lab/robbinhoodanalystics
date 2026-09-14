import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_TICK,
  ChartState,
  InsightCard,
  LINE_COLORS,
  TOOLTIP_STYLE,
  formatKlineTime,
} from "@/components/insights/InsightCard";
import { RangeToggle } from "@/components/insights/RangeToggle";
import { formatPct } from "@/lib/format";
import type { ChartRange } from "@/lib/klines";
import { useGainersChart } from "@/hooks/useMarketCharts";

/** Multi-line cumulative-% chart for the 3 strongest Binance-listed memes. */
export function TopGainersCard() {
  const [range, setRange] = useState<ChartRange>("24h");
  const { entries, isLoading, isError, refetch } = useGainersChart(range);

  // One row per timestamp with a column per coin: { t, DOGE: 4.2, ... }.
  const rows = useMemo(() => {
    type Row = { t: number } & Record<string, number>;
    const byT = new Map<number, Row>();
    for (const e of entries) {
      for (const p of e.points) {
        const row = byT.get(p.t) ?? { t: p.t };
        row[e.coin.ticker] = p.pct;
        byT.set(p.t, row);
      }
    }
    return [...byT.values()].sort((a, b) => a.t - b.t);
  }, [entries]);

  const chartReady = !isLoading && !isError && rows.length > 0;

  return (
    <InsightCard title="Top Gainers" action={<RangeToggle value={range} onChange={setRange} />}>
      {entries.length > 0 ? (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
          {entries.map((e, i) => (
            <span key={e.coin.ticker} className="flex items-center gap-1.5 text-xs font-bold">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: LINE_COLORS[i % LINE_COLORS.length] }}
              />
              {e.coin.ticker}
              <span className={e.lastPct >= 0 ? "text-success" : "text-danger"}>
                {e.lastPct >= 0 ? "▲" : "▼"} {formatPct(e.lastPct)}
              </span>
            </span>
          ))}
        </div>
      ) : null}
      <ChartState isLoading={isLoading} isError={isError && !chartReady} onRetry={refetch} />
      {chartReady ? (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart
            data={rows}
            margin={{ top: 6, right: 2, bottom: 0, left: 2 }}
            accessibilityLayer
          >
            <XAxis
              dataKey="t"
              type="number"
              domain={["dataMin", "dataMax"]}
              tickFormatter={(t: number) => formatKlineTime(t, range)}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              minTickGap={56}
            />
            <YAxis
              orientation="right"
              width={44}
              tickFormatter={(v: number) => `${Math.round(v)}%`}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={(t) => formatKlineTime(Number(t), range)}
              formatter={(value, name) => [`${Number(value).toFixed(2)}%`, String(name)]}
            />
            {entries.map((e, i) => (
              <Line
                key={e.coin.ticker}
                type="linear"
                dataKey={e.coin.ticker}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={1.8}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : !isLoading && !isError ? (
        <p className="flex h-[180px] items-center justify-center text-xs text-muted-foreground">
          No data for this range yet.
        </p>
      ) : null}
    </InsightCard>
  );
}
