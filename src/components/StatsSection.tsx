import { CoinAvatar, Dot } from "@/components/CoinArt";
import { useMarket } from "@/hooks/useLiveMarket";
import { formatCompactUsd, formatPct, formatUsd } from "@/lib/format";
import { topByEarnings, topByVolume, total24hVolume, totalCreatorEarnings } from "@/lib/market";

function LatestTradeChip({ index }: { index: number }) {
  const market = useMarket();
  const trade = market.trades[index];
  if (!trade) return null;
  const coin = market.coins.find((c) => c.ticker === trade.ticker);
  const buy = trade.action === "Buy";
  return (
    <div className="absolute right-4 top-1/2 hidden -translate-y-1/2 items-center gap-2 rounded-full bg-card px-3 py-1.5 shadow-card sm:flex">
      <Dot hue={coin?.hue ?? 260} image={coin?.image ?? null} />
      <div className="text-[11px] leading-tight">
        <div className="font-semibold">{trade.ticker}</div>
        <div className={buy ? "text-success" : "text-danger"}>
          {trade.action === "Buy" ? "BIG BUY" : "BIG SELL"} {formatUsd(trade.amountUsd)}
        </div>
      </div>
    </div>
  );
}

export function StatsSection() {
  const market = useMarket();
  const earnings = totalCreatorEarnings(market.coins);
  const volume = total24hVolume(market.coins);
  const topEarn = topByEarnings(market.coins, 4);
  const topVol = topByVolume(market.coins, 3);

  return (
    <section className="grid gap-3 lg:grid-cols-3">
      <div className="flex flex-col gap-3">
        <div
          className="relative overflow-hidden rounded-2xl border border-border p-5 shadow-card"
          style={{
            background: "linear-gradient(110deg, oklch(0.92 0.07 300), oklch(0.93 0.05 260))",
          }}
        >
          <p className="text-sm font-medium text-ink/70">Total creator earnings</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
            {formatUsd(earnings)}
          </p>
          <LatestTradeChip index={0} />
        </div>
        <div
          className="relative overflow-hidden rounded-2xl border border-border p-5 shadow-card"
          style={{
            background: "linear-gradient(110deg, oklch(0.93 0.05 220), oklch(0.95 0.04 180))",
          }}
        >
          <p className="text-sm font-medium text-ink/70">24hr volume</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
            {formatCompactUsd(volume)}
          </p>
          <LatestTradeChip index={1} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-sm font-semibold">Top earning coins</h2>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {topEarn.map((c) => (
            <div key={c.ticker} className="text-center">
              <CoinAvatar
                ticker={c.ticker}
                hue={c.hue}
                hue2={c.hue2}
                image={c.image}
                className="mx-auto aspect-square w-full rounded-xl"
              />
              <p className="mt-2 truncate text-xs font-semibold">{c.ticker}</p>
              <p className="text-xs text-muted-foreground">{formatCompactUsd(c.earningsUsd)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
        <h2 className="text-sm font-semibold">Top volume</h2>
        <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-4 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>Coin</span>
          <span className="text-right">Mcap</span>
          <span className="text-right">24h vol</span>
        </div>
        <div className="mt-2 space-y-3">
          {topVol.map((c) => (
            <div
              key={c.ticker}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <Dot hue={c.hue} image={c.image} />
                <span className="truncate font-semibold">{c.ticker}</span>
              </div>
              <span className="text-right">
                {formatCompactUsd(c.mcapUsd)}{" "}
                <span
                  className={c.change24hPct >= 0 ? "text-xs text-success" : "text-xs text-danger"}
                >
                  {formatPct(c.change24hPct)}
                </span>
              </span>
              <span className="text-right font-medium">{formatCompactUsd(c.vol24hUsd)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
