import type { ReactNode } from "react";
import type { ChartRange } from "@/lib/klines";

/** Shared card shell for the insights row — title left, control right. */
export function InsightCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/** CMC-style brand watermark pinned to the chart's bottom-right corner. */
export function Watermark() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute bottom-1 right-12 flex select-none items-center gap-1 text-xs font-black text-muted-foreground/25"
    >
      <span className="inline-grid size-4 place-items-center rounded-full border-2 border-current text-[8px] leading-none">
        M
      </span>
      BlackRug
    </span>
  );
}

/** X-axis tick values: just the edges, CMC style (`withMid` adds a centre). */
export function edgeTickValues(times: number[], withMid = false): number[] {
  const first = times[0];
  const last = times[times.length - 1];
  if (first === undefined || last === undefined) return [];
  if (!withMid || times.length < 3) return [first, last];
  const mid = times[Math.floor(times.length / 2)];
  return mid === undefined ? [first, last] : [first, mid, last];
}

/**
 * Formatter for the edge ticks: on 24h the first label reads as a date
 * ("14 Sep") and the last as a clock time ("12:00 PM"); longer ranges are
 * dates throughout.
 */
export function edgeTimeFormatter(ticks: number[], range: ChartRange): (t: number) => string {
  const date = (t: number) =>
    new Date(t).toLocaleDateString("en-US", { day: "numeric", month: "short" });
  const last = ticks[ticks.length - 1];
  if (range !== "24h" || last === undefined) return date;
  const time = (t: number) =>
    new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return (t) => (t === last ? time(t) : date(t));
}

/**
 * Three evenly spaced, nicely rounded ticks across a % domain. Rounding
 * precision scales with the span so narrow domains don't collapse into
 * duplicate ticks (recharts keys ticks by value).
 */
export function nicePctTicks(min: number, max: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (max === min) return [Math.round(max * 10) / 10];
  const quantum = (max - min) / 20;
  const pow = Math.pow(10, Math.floor(Math.log10(quantum)));
  const round = (v: number) => Math.round(v / pow) * pow;
  return [...new Set([min, (min + max) / 2, max].map(round))];
}

/** recharts chrome styled from theme tokens so dark mode follows for free. */
export const TOOLTIP_STYLE = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  fontSize: "12px",
  color: "var(--card-foreground)",
  boxShadow: "var(--shadow-card)",
} as const;

export const AXIS_TICK = { fontSize: 11, fill: "var(--muted-foreground)" } as const;

/** Line palette for the gainers chart — blue / green / pink like the mock. */
export const LINE_COLORS = ["var(--brand-blue)", "var(--success)", "var(--brand-pink)"];

/** Fixed-height loading pulse / failure state for a chart panel. */
export function ChartState({
  isLoading,
  isError,
  onRetry,
  height = 190,
}: {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  height?: number;
}) {
  if (isLoading) {
    return <div className="animate-pulse rounded-lg bg-muted/60" style={{ height }} />;
  }
  if (isError) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 rounded-lg bg-muted/40 text-center"
        style={{ height }}
      >
        <p className="text-xs text-muted-foreground">Chart unavailable right now.</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-full border border-border px-3 py-1 text-xs font-semibold transition-colors hover:border-brand-pink hover:text-brand-pink"
        >
          Retry
        </button>
      </div>
    );
  }
  return null;
}
