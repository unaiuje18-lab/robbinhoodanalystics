import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Dot } from "@/components/CoinArt";
import { Sparkline } from "@/components/insights/Sparkline";
import { InsightCard } from "@/components/insights/InsightCard";
import { formatPct, formatUsd } from "@/lib/format";
import { topByVolume } from "@/lib/market";
import { useMarketSnapshot } from "@/hooks/useLiveMarket";

/**
 * "Most Visited" stand-in, ranked by what we can actually measure: 24h
 * volume. Reads from the ranking snapshot (same 30s cadence as the grid)
 * so the list doesn't shuffle on every tape tick.
 */
export function MostActiveCard() {
  const { market } = useMarketSnapshot();
  const rows = useMemo(
    () =>
      topByVolume(
        market.coins.filter((c) => c.kind === "meme"),
        5,
      ),
    [market],
  );

  return (
    <InsightCard title="Most Active">
      <ol className="flex flex-col">
        {rows.map((coin, i) => {
          const up = coin.change24hPct >= 0;
          return (
            <li key={coin.ticker}>
              <Link
                to="/coin/$ticker"
                params={{ ticker: coin.ticker }}
                className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
              >
                <span className="w-4 shrink-0 text-right text-xs font-bold tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <Dot hue={coin.hue} image={coin.image} className="h-8 w-8" />
                <span className="min-w-0 flex-1 truncate text-sm font-bold">{coin.ticker}</span>
                <span className="text-sm font-semibold tabular-nums">
                  {formatUsd(coin.priceUsd)}
                </span>
                <span className="flex w-24 shrink-0 flex-col items-end gap-0.5">
                  <span
                    className={`text-xs font-semibold tabular-nums ${up ? "text-success" : "text-danger"}`}
                  >
                    {up ? "▲" : "▼"} {formatPct(coin.change24hPct)}
                  </span>
                  <Sparkline values={coin.history} up={up} />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </InsightCard>
  );
}
