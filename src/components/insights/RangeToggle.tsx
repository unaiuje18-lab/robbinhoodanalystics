import type { ChartRange } from "@/lib/klines";

const RANGES: { key: ChartRange; label: string }[] = [
  { key: "24h", label: "24h" },
  { key: "30d", label: "30d" },
  { key: "all", label: "All" },
];

/** The 24h / 30d / All segmented control the chart panels share. */
export function RangeToggle({
  value,
  onChange,
}: {
  value: ChartRange;
  onChange: (range: ChartRange) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Chart range"
      className="flex shrink-0 items-center rounded-full bg-muted p-0.5"
    >
      {RANGES.map((r) => (
        <button
          key={r.key}
          type="button"
          aria-pressed={value === r.key}
          onClick={() => onChange(r.key)}
          className={`rounded-full px-3 py-1 text-[13px] font-semibold transition-colors ${
            value === r.key
              ? "border border-border bg-card text-foreground shadow-sm"
              : "border border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
