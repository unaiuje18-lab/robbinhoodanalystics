function trimNumber(n: number): string {
  const s = Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
}

/** "$91.2K", "$2.71M", "$14B" — compact display for caps, volumes, earnings. */
export function formatCompactUsd(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `$${trimNumber(v / 1e9)}B`;
  if (abs >= 1e6) return `$${trimNumber(v / 1e6)}M`;
  if (abs >= 1e3) return `$${trimNumber(v / 1e3)}K`;
  return `$${trimNumber(v)}`;
}

/** "$197.32", "$0.000091" — exact-ish display for prices and trade amounts. */
export function formatUsd(v: number): string {
  if (v === 0) return "$0";
  if (v >= 1) return `$${v.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${v.toPrecision(2).replace(/0+$/, "").replace(/\.$/, "")}`;
}

/** "+7.3%", "-3.6%" */
export function formatPct(v: number): string {
  return `${v >= 0 ? "+" : "-"}${Math.abs(v).toFixed(1)}%`;
}
