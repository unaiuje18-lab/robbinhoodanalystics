import { Link } from "@tanstack/react-router";
import { Dot } from "@/components/CoinArt";
import { useMarket, useMarketSnapshot } from "@/hooks/useLiveMarket";
import { formatPct, formatUsd } from "@/lib/format";
import type { LiveCoin } from "@/lib/market";

/** Top memes by 24h volume, from the slow snapshot — so the chip set and its
 * order hold steady while the marquee loops instead of reshuffling per tick. */
const CHIP_COUNT = 16;

function TickerChip({
  coin,
  copy,
  tickIndex,
}: {
  coin: LiveCoin;
  copy: string;
  tickIndex: number;
}) {
  return (
    <Link
      key={`${copy}:${coin.ticker}`}
      to="/coin/$ticker"
      params={{ ticker: coin.ticker }}
      title={`Open ${coin.ticker}`}
      className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 transition-colors hover:border-brand-pink hover:bg-muted/60"
    >
      <Dot hue={coin.hue} image={coin.image} />
      <span className="text-[11px] font-bold">{coin.ticker}</span>
      {/* Price flashes on a meaningful tick — keying the span remounts it so
          the animation replays (same trick as the market table). */}
      <span
        key={tickIndex}
        className={`rounded px-1 text-[11px] font-semibold tabular-nums ${
          coin.lastDeltaPct > 0.02 ? "flash-up" : coin.lastDeltaPct < -0.02 ? "flash-down" : ""
        }`}
      >
        {formatUsd(coin.priceUsd)}
      </span>
      <span
        className={`text-[10px] font-semibold ${
          coin.change24hPct >= 0 ? "text-success" : "text-danger"
        }`}
      >
        {formatPct(coin.change24hPct)}
      </span>
    </Link>
  );
}

/** Binance-style coin ticker, duplicated ×2 for a seamless CSS marquee. */
export function TickerBar() {
  const { market } = useMarketSnapshot();
  const live = useMarket();

  const liveByTicker = new Map(live.coins.map((c) => [c.ticker, c] as const));
  const chips = market.coins
    .filter((c) => c.kind === "meme")
    .sort((a, b) => b.vol24hUsd - a.vol24hUsd)
    .slice(0, CHIP_COUNT)
    .flatMap((c) => {
      const l = liveByTicker.get(c.ticker);
      return l ? [l] : [];
    });

  // Exactly two identical halves — the keyframes translate -50%.
  return (
    <div className="overflow-hidden border-b border-border bg-card/80 py-2">
      {/* The marquee pauses while hovered so the chips are easy to click. */}
      <div className="flex w-max animate-marquee gap-2 px-2 hover:[animation-play-state:paused]">
        {chips.map((c) => (
          <TickerChip key={`a:${c.ticker}`} coin={c} copy="a" tickIndex={live.tickIndex} />
        ))}
        {chips.map((c) => (
          <TickerChip key={`b:${c.ticker}`} coin={c} copy="b" tickIndex={live.tickIndex} />
        ))}
      </div>
    </div>
  );
}
