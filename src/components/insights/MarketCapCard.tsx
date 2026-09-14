import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_TICK,
  ChartState,
  InsightCard,
  TOOLTIP_STYLE,
  formatKlineTime,
} from "@/components/insights/InsightCard";
import { RangeToggle } from "@/components/insights/RangeToggle";
import { formatCompactUsd, formatPct } from "@/lib/format";
import type { ChartRange } from "@/lib/klines";
import { useMarketCapIndex } from "@/hooks/useMarketCharts";

/** A small "▲ 3.9%" chip used next to the headline stats. */
function ChangeChip({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-semibold tabular-nums ${up ? "text-success" : "text-danger"}`}>
      {up ? "▲" : "▼"} {formatPct(pct)}
    </span>
  );
}

/**
 * Supply-weighted market-cap index over the Binance-listed memes, with their
 * summed quote volume underneath — the panel's own "meme majors" aggregate.
 */
export function MarketCapCard() {
  const [range, setRange] = useState<ChartRange>("24h");
  const { series, mcapUsd, volUsd, mcapChangePct, volChangePct, isLoading, isError, refetch } =
    useMarketCapIndex(range);

  const chartReady = !isLoading && !isError && series.length > 0;

  return (
    <InsightCard title="Market Cap" action={<RangeToggle value={range} onChange={setRange} />}>
      <div className="mb-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-xl font-black tabular-nums">
          {mcapUsd === null ? "—" : formatCompactUsd(mcapUsd)}
        </span>
        <ChangeChip pct={mcapChangePct} />
        <span className="text-base font-bold tabular-nums text-muted-foreground">
          {volUsd === null ? "—" : formatCompactUsd(volUsd)}
        </span>
        <ChangeChip pct={volChangePct} />
      </div>
      <div className="mb-2 flex gap-4 text-xs font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" /> Market Cap
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/50" /> Volume
        </span>
      </div>
      <ChartState isLoading={isLoading} isError={isError && !chartReady} onRetry={refetch} />
      {chartReady ? (
        <ResponsiveContainer width="100%" height={170}>
          <ComposedChart
            data={series}
            margin={{ top: 6, right: 2, bottom: 0, left: 2 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id="mcap-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--success)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--success)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
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
              yAxisId="mcap"
              orientation="right"
              width={48}
              tickFormatter={(v: number) => formatCompactUsd(v)}
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
            />
            <YAxis yAxisId="vol" hide domain={[0, (max: number) => max * 3]} />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              labelFormatter={(t) => formatKlineTime(Number(t), range)}
              formatter={(value, name) =>
                name === "mcap"
                  ? [formatCompactUsd(Number(value)), "Market Cap"]
                  : [formatCompactUsd(Number(value)), "Volume"]
              }
            />
            <Area
              yAxisId="mcap"
              type="monotone"
              dataKey="mcap"
              stroke="var(--success)"
              strokeWidth={1.8}
              fill="url(#mcap-fill)"
              activeDot={{ r: 3 }}
            />
            <Line
              yAxisId="vol"
              type="monotone"
              dataKey="vol"
              stroke="var(--muted-foreground)"
              strokeWidth={1}
              dot={false}
              opacity={0.6}
            />
          </ComposedChart>
        </ResponsiveContainer>
      ) : !isLoading && !isError ? (
        <p className="flex h-[170px] items-center justify-center text-xs text-muted-foreground">
          No data for this range yet.
        </p>
      ) : null}
    </InsightCard>
  );
}
