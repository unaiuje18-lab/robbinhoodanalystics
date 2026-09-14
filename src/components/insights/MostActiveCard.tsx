import { Link } from "@tanstack/react-router";
import { Eye, History } from "lucide-react";
import { useMemo, useState } from "react";
import { Dot } from "@/components/CoinArt";
import { Sparkline } from "@/components/insights/Sparkline";
import { InsightCard } from "@/components/insights/InsightCard";
import { ICON_BUTTON } from "@/components/insights/ChartModal";
import { formatUsd } from "@/lib/format";
import { topByVolume, type LiveCoin } from "@/lib/market";
import { useMarketSnapshot } from "@/hooks/useLiveMarket";
import { useBlackrug } from "@/hooks/useBlackrug";

/** The two lists the eye/clock pair switches between. */
type PanelMode = "active" | "recent";

/** "2h ago" style age text for the recently-added list. */
function formatAge(createdAt: number, now: number): string {
  const minutes = Math.floor(Math.max(0, now - createdAt) / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Eye/clock header pair — the active view's icon lights up, CMC-style. */
function HeaderActions({
  mode,
  onModeChange,
}: {
  mode: PanelMode;
  onModeChange: (m: PanelMode) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-pressed={mode === "active"}
        aria-label="Most active coins"
        onClick={() => onModeChange("active")}
        className={`${ICON_BUTTON} ${mode === "active" ? "bg-muted text-foreground" : ""}`}
      >
        <Eye className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-pressed={mode === "recent"}
        aria-label="Recently added coins"
        onClick={() => onModeChange("recent")}
        className={`${ICON_BUTTON} ${mode === "recent" ? "bg-muted text-foreground" : ""}`}
      >
        <History className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * The left panel: eye = most active by 24h volume, clock = the coins whose
 * BlackRug specs were added most recently. Both read the ranking snapshot
 * (30s cadence) so rows don't shuffle on every tape tick.
 */
export function MostActiveCard() {
  const { market } = useMarketSnapshot();
  const { state: blackrug } = useBlackrug();
  const [mode, setMode] = useState<PanelMode>("active");

  const rows = useMemo(
    () =>
      topByVolume(
        market.coins.filter((c) => c.kind === "meme"),
        5,
      ),
    [market],
  );

  // Recently added = newest specs in the registry (the top-volume coins get
  // one created automatically as they break into the top 20).
  const recent = useMemo(() => {
    const byTicker = new Map<string, LiveCoin>(market.coins.map((c) => [c.ticker, c] as const));
    return Object.entries(blackrug?.specs ?? {})
      .filter(([ticker, spec]) => !spec.hidden && byTicker.has(ticker))
      .sort((a, b) => b[1].createdAt - a[1].createdAt)
      .slice(0, 5)
      .flatMap(([ticker, spec]) => {
        const coin = byTicker.get(ticker);
        return coin ? [{ coin, createdAt: spec.createdAt }] : [];
      });
  }, [blackrug, market]);

  return (
    <InsightCard
      title={mode === "active" ? "Most Active" : "Recently Added"}
      action={<HeaderActions mode={mode} onModeChange={setMode} />}
    >
      {mode === "active" ? (
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
                  <span className="min-w-0 flex-1 truncate text-[15px] font-bold">
                    {coin.ticker}
                  </span>
                  <span className="text-[15px] font-semibold tabular-nums">
                    {formatUsd(coin.priceUsd)}
                  </span>
                  <span className="flex w-24 shrink-0 flex-col items-end gap-0.5">
                    <Sparkline values={coin.history} up={up} />
                    <span
                      className={`text-xs font-semibold tabular-nums ${up ? "text-success" : "text-danger"}`}
                    >
                      {up ? "▲" : "▼"} {coin.change24hPct.toFixed(1)}%
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      ) : recent.length > 0 ? (
        <ol className="flex flex-col">
          {recent.map(({ coin, createdAt }, i) => (
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
                <span className="w-24 shrink-0 text-right text-xs font-semibold text-muted-foreground">
                  {formatAge(createdAt, Date.now())}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="px-2 py-10 text-center text-xs text-muted-foreground">
          Nothing added yet — specs appear as coins break into the top 20 by volume.
        </p>
      )}
    </InsightCard>
  );
}
