import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { CoinAvatar, Dot } from "@/components/CoinArt";
import { useMarket, useMarketSnapshot } from "@/hooks/useLiveMarket";
import { formatCompactUsd, formatPct, formatUsd } from "@/lib/format";
import { topByEarnings, topByVolume, totalMcap } from "@/lib/market";

export function StatsSection() {
  const live = useMarket();
  const { market } = useMarketSnapshot();
  // Hero numbers stay live; the top lists re-rank on the slow snapshot so
  // rows don't shuffle every tick. Both lists are meme-economy only — real
  // stock volumes would dwarf the meme tape.
  const memes = market.coins.filter((c) => c.kind === "meme");
  const memeMcap = totalMcap(live.coins.filter((c) => c.kind === "meme"));
  const stockMcap = totalMcap(live.coins.filter((c) => c.kind === "stock"));
  const topEarn = topByEarnings(memes, 4);
  const topVol = topByVolume(memes, 3);

  const panelClass =
    "relative overflow-hidden rounded-2xl border border-border p-5 shadow-card transition-transform";

  return (
    <section className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          to="/market/$kind"
          params={{ kind: "memes" }}
          className={`${panelClass} group hero-panel-mcap-meme hover:-translate-y-0.5`}
        >
          <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-ink/40 transition-colors group-hover:text-brand-pink" />
          <p className="text-sm font-medium text-ink/70">Total meme market cap</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
            {formatCompactUsd(memeMcap)}
          </p>
        </Link>
        <Link
          to="/market/$kind"
          params={{ kind: "stocks" }}
          className={`${panelClass} group hero-panel-mcap-stocks hover:-translate-y-0.5`}
        >
          <ArrowUpRight className="absolute right-3 top-3 h-4 w-4 text-ink/40 transition-colors group-hover:text-brand-pink" />
          <p className="text-sm font-medium text-ink/70">Total stock market cap</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink">
            {formatCompactUsd(stockMcap)}
          </p>
        </Link>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-semibold">Top earning coins</h2>
          <div className="mt-4 grid grid-cols-4 gap-3">
            {topEarn.map((c) => (
              <Link
                key={c.ticker}
                to="/coin/$ticker"
                params={{ ticker: c.ticker }}
                className="rounded-xl text-center transition-transform hover:-translate-y-0.5"
              >
                <CoinAvatar
                  ticker={c.ticker}
                  hue={c.hue}
                  hue2={c.hue2}
                  image={c.image}
                  className="mx-auto aspect-square w-full rounded-xl"
                />
                <p className="mt-2 truncate text-xs font-semibold hover:text-brand-pink">
                  {c.ticker}
                </p>
                <p className="text-xs text-muted-foreground">{formatCompactUsd(c.earningsUsd)}</p>
              </Link>
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
          <div className="mt-2 space-y-1">
            {topVol.map((c) => (
              <Link
                key={c.ticker}
                to="/coin/$ticker"
                params={{ ticker: c.ticker }}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 rounded-lg px-1 py-1.5 text-sm transition-colors hover:bg-muted/60"
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
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
