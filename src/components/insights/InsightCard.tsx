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
    <div className="flex flex-col rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

/** Time-axis label style per range — "12:00 PM" / "14 Sep" / "Sep 2025". */
export function formatKlineTime(t: number, range: ChartRange): string {
  const d = new Date(t);
  if (range === "24h") {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  if (range === "30d") {
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
  }
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
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
  height = 180,
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
