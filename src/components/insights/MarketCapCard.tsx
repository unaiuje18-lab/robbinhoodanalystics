import { ChartCandlestick, ChartLine } from "lucide-react";
import { useId, useMemo, useState } from "react";
import {
  Area,
  Bar,
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
  Watermark,
  edgeTickValues,
  edgeTimeFormatter,
} from "@/components/insights/InsightCard";
import { ChartModal, ExpandButton } from "@/components/insights/ChartModal";
import { RangeToggle } from "@/components/insights/RangeToggle";
import { formatCompactUsd, formatPct } from "@/lib/format";
import type { ChartRange } from "@/lib/klines";
import { useMarketCapIndex } from "@/hooks/useMarketCharts";

/** A small "▲ 3.9%" pill used next to the headline stats. */
function ChangeChip({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const up = pct >= 0;
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
        up ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
      }`}
    >
      {up ? "▲" : "▼"} {formatPct(pct)}
    </span>
  );
}

const TYPE_BUTTON =
  "grid h-7 w-7 place-items-center rounded-full transition-colors text-muted-foreground";

/** The line/candlestick icon pair that switches area ↔ line rendering. */
function ChartTypeToggle({
  value,
  onChange,
}: {
  value: "area" | "line";
  onChange: (v: "area" | "line") => void;
}) {
  return (
    <div
      role="group"
      aria-label="Chart type"
      className="flex shrink-0 items-center gap-0.5 rounded-full bg-muted p-0.5"
    >
      <button
        type="button"
        aria-pressed={value === "area"}
        aria-label="Area chart"
        onClick={() => onChange("area")}
        className={`${TYPE_BUTTON} ${
          value === "area"
            ? "border border-border bg-card text-foreground shadow-sm"
            : "hover:text-foreground"
        }`}
      >
        <ChartLine className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-pressed={value === "line"}
        aria-label="Line chart"
        onClick={() => onChange("line")}
        className={`${TYPE_BUTTON} ${
          value === "line"
            ? "border border-border bg-card text-foreground shadow-sm"
            : "hover:text-foreground"
        }`}
      >
        <ChartCandlestick className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Supply-weighted market-cap index over the Binance-listed memes, with their
 * summed quote volume underneath — the panel's own "meme majors" aggregate.
 */
export function MarketCapCard() {
  const [range, setRange] = useState<ChartRange>("24h");
  const [chartType, setChartType] = useState<"area" | "line">("area");
  const [expanded, setExpanded] = useState(false);
  // The card and its expanded modal both mount a chart — gradient ids must
  // be unique per instance or the second copy resolves to the first's defs.
  const gradId = useId();
  const { series, mcapUsd, volUsd, mcapChangePct, volChangePct, isLoading, isError, refetch } =
    useMarketCapIndex(range);

  // Tight axis domain + the baseline fraction where the range opens — the
  // dual-color gradient turns green above it and red below, CMC-style.
  const { domain, baselineFrac, yTicks, xTicks } = useMemo(() => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const p of series) {
      if (p.mcap < min) min = p.mcap;
      if (p.mcap > max) max = p.mcap;
    }
    const baseline = series[0]?.mcap;
    const pad = max > min ? (max - min) * 0.02 : Math.abs(max) * 0.001 || 1;
    const frac =
      max > min && baseline !== undefined
        ? Math.min(1, Math.max(0, (max - baseline) / (max - min)))
        : 0.5;
    const times = series.map((p) => p.t);
    return {
      domain: [min - pad, max + pad] as [number, number],
      baselineFrac: frac,
      yTicks: [min - pad, baseline ?? min, max + pad],
      xTicks: edgeTickValues(times, true),
    };
  }, [series]);

  const chartReady = !isLoading && !isError && series.length > 0;
  const controls = (
    <div className="flex items-center gap-2">
      <ChartTypeToggle value={chartType} onChange={setChartType} />
      <RangeToggle value={range} onChange={setRange} />
    </div>
  );

  const stats = (
    <>
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-2xl font-black tabular-nums">
          {mcapUsd === null ? "—" : formatCompactUsd(mcapUsd)}
        </span>
        <ChangeChip pct={mcapChangePct} />
        <span className="text-lg font-bold tabular-nums text-muted-foreground">
          {volUsd === null ? "—" : formatCompactUsd(volUsd)}
        </span>
        <ChangeChip pct={volChangePct} />
      </div>
      <div className="mb-2 flex gap-4 text-xs font-semibold text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-success" /> Market Cap
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Volume
        </span>
      </div>
    </>
  );

  // Same chart at either size — the card's 180px view and the expanded modal.
  const renderChart = (height: number) => (
    <>
      <ChartState
        isLoading={isLoading}
        isError={isError && !chartReady}
        onRetry={refetch}
        height={height}
      />
      {chartReady ? (
        <div className="relative">
          <ResponsiveContainer width="100%" height={height}>
            <ComposedChart
              data={series}
              margin={{ top: 6, right: 2, bottom: 0, left: 2 }}
              accessibilityLayer
            >
              <defs>
                {/* Hard stop at the range open: green above, red below. */}
                <linearGradient id={`${gradId}-fill`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0} stopColor="var(--success)" stopOpacity={0.3} />
                  <stop offset={baselineFrac} stopColor="var(--success)" stopOpacity={0.3} />
                  <stop offset={baselineFrac} stopColor="var(--danger)" stopOpacity={0.3} />
                  <stop offset={1} stopColor="var(--danger)" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id={`${gradId}-stroke`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset={0} stopColor="var(--success)" stopOpacity={0.95} />
                  <stop offset={baselineFrac} stopColor="var(--success)" stopOpacity={0.95} />
                  <stop offset={baselineFrac} stopColor="var(--danger)" stopOpacity={0.95} />
                  <stop offset={1} stopColor="var(--danger)" stopOpacity={0.95} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                ticks={xTicks}
                tickFormatter={edgeTimeFormatter(xTicks, range)}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="mcap"
                orientation="right"
                width={48}
                domain={domain}
                ticks={yTicks}
                tickFormatter={(v: number) => formatCompactUsd(v)}
                tick={AXIS_TICK}
                axisLine={false}
                tickLine={false}
              />
              <YAxis yAxisId="vol" hide domain={[0, (dataMax: number) => dataMax * 4]} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={(t) => edgeTimeFormatter([t], range)(Number(t))}
                formatter={(value, name) =>
                  name === "mcap"
                    ? [formatCompactUsd(Number(value)), "Market Cap"]
                    : [formatCompactUsd(Number(value)), "Volume"]
                }
              />
              {chartType === "area" ? (
                <Area
                  yAxisId="mcap"
                  type="linear"
                  dataKey="mcap"
                  stroke={`url(#${gradId}-stroke)`}
                  strokeWidth={1.5}
                  fill={`url(#${gradId}-fill)`}
                  activeDot={{ r: 3 }}
                />
              ) : (
                <Line
                  yAxisId="mcap"
                  type="linear"
                  dataKey="mcap"
                  stroke={`url(#${gradId}-stroke)`}
                  strokeWidth={1.8}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              )}
              <Bar
                yAxisId="vol"
                dataKey="vol"
                fill="var(--muted-foreground)"
                opacity={0.25}
                radius={[1, 1, 0, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <Watermark />
        </div>
      ) : !isLoading && !isError ? (
        <p
          className="flex items-center justify-center text-xs text-muted-foreground"
          style={{ height }}
        >
          No data for this range yet.
        </p>
      ) : null}
    </>
  );

  return (
    <>
      <InsightCard
        title="Market Cap"
        action={
          <div className="flex items-center gap-2">
            {controls}
            <ExpandButton onClick={() => setExpanded(true)} />
          </div>
        }
      >
        {stats}
        {renderChart(180)}
      </InsightCard>
      {expanded ? (
        <ChartModal title="Market Cap" controls={controls} onClose={() => setExpanded(false)}>
          {stats}
          {renderChart(460)}
        </ChartModal>
      ) : null}
    </>
  );
}
