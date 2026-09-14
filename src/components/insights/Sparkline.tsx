/**
 * Tiny inline SVG line for the Most Active rows — hand-rolled like the rest
 * of the app's art so list rows don't pay for a chart library. Decorative
 * (the row's % change carries the same signal as text).
 */
export function Sparkline({
  values,
  up,
  className,
}: {
  values: number[];
  up: boolean;
  className?: string;
}) {
  if (values.length < 2) return null;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const span = max - min || 1;
  const step = 100 / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(2)},${(100 - ((v - min) / span) * 100).toFixed(2)}`)
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={className ?? "h-6 w-[72px] shrink-0"}
    >
      <polyline
        points={points}
        fill="none"
        stroke={up ? "var(--success)" : "var(--danger)"}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
