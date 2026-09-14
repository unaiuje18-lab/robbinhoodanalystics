import { Link } from "@tanstack/react-router";
import { Eye, History } from "lucide-react";
import { useMemo, useState } from "react";
import { Dot } from "@/components/CoinArt";
import { Sparkline } from "@/components/insights/Sparkline";
import { InsightCard } from "@/components/insights/InsightCard";
import { formatPct, formatUsd } from "@/lib/format";
import { topByVolume } from "@/lib/market";
import { useMarketSnapshot } from "@/hooks/useLiveMarket";

const ICON_BUTTON =
  "grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground";

/** The header's eye/clock pair: eye toggles sparklines, clock is decorative. */
function HeaderActions({
  showSparks,
  onToggleSparks,
}: {
  showSparks: boolean;
  onToggleSparks: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-pressed={showSparks}
        aria-label={showSparks ? "Hide sparklines" : "Show sparklines"}
        onClick={onToggleSparks}
        className={ICON_BUTTON}
      >
        <Eye className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-disabled="true"
        aria-label="Recently viewed (coming soon)"
        title="Coming soon"
        className={`${ICON_BUTTON} cursor-default opacity-50`}
      >
        <History className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * "Most Visited" stand-in, ranked by what we can actually measure: 24h
 * volume. Reads from the ranking snapshot (same 30s cadence as the grid)
 * so the list doesn't shuffle on every tape tick.
 */
export function MostActiveCard() {
  const { market } = useMarketSnapshot();
  const [showSparks, setShowSparks] = useState(true);
  const rows = useMemo(
    () =>
      topByVolume(
        market.coins.filter((c) => c.kind === "meme"),
        5,
      ),
    [market],
  );

  return (
    <InsightCard
      title="Most Active"
      action={
        <HeaderActions showSparks={showSparks} onToggleSparks={() => setShowSparks((s) => !s)} />
      }
    >
      <ol className="flex flex-col">
        {rows.map((coin, i) => {
          const up = coin.change24hPct >= 0;
          return (
            <li key={coin.ticker}>
              <Link
                to="/coin/$ticker"
                params={{ ticker: coin.ticker }}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50"
              >
                <span className="w-4 shrink-0 text-right text-xs font-bold tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <Dot hue={coin.hue} image={coin.image} className="h-8 w-8" />
                <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{coin.ticker}</span>
                <span className="text-[15px] font-semibold tabular-nums">
                  {formatUsd(coin.priceUsd)}
                </span>
                <span className="flex w-24 shrink-0 flex-col items-end gap-0.5">
                  {showSparks ? <Sparkline values={coin.history} up={up} /> : null}
                  <span
                    className={`text-xs font-semibold tabular-nums ${up ? "text-success" : "text-danger"}`}
                  >
                    {up ? "▲" : "▼"} {formatPct(coin.change24hPct)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </InsightCard>
  );
}
