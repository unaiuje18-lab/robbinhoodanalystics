import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CoinCard } from "@/components/CoinCard";
import { FilterBar } from "@/components/FilterBar";
import { SiteHeader } from "@/components/SiteHeader";
import { StatsSection } from "@/components/StatsSection";
import { TickerBar } from "@/components/TickerBar";
import { useMarket, useMarketSnapshot } from "@/hooks/useLiveMarket";
import {
  filterCoins,
  sortCoins,
  type LiveCoin,
  type MarketKind,
  type MarketTab,
} from "@/lib/market";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flaunch — Launch. Trade. Earn." },
      {
        name: "description",
        content:
          "Live meme-coin markets: trending coins, top earners and 24h volume. Every trade moves the market in real time.",
      },
      { property: "og:title", content: "Flaunch — Launch. Trade. Earn." },
      {
        property: "og:description",
        content: "Trending coins, creator earnings and live trades in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const live = useMarket();
  const { market: ranking, refresh } = useMarketSnapshot();
  const [kind, setKind] = useState<MarketKind>("memes");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<MarketTab>("trending");
  const [recentBuys, setRecentBuys] = useState(false);

  // Order and filter membership come from the slow snapshot so cards hold
  // their place while you scroll; prices and tick flashes stay live.
  const pool = ranking.coins.filter((c) =>
    kind === "stocks" ? c.kind === "stock" : c.kind === "meme",
  );
  const liveByTicker = new Map(live.coins.map((c) => [c.ticker, c] as const));
  const visible = sortCoins(filterCoins(pool, ranking.trades, { query, recentBuys }), tab).flatMap(
    (c) => {
      const liveCoin = liveByTicker.get(c.ticker);
      return liveCoin ? [liveCoin] : [];
    },
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TickerBar />
      <SiteHeader query={query} onQueryChange={setQuery} />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <h1 className="sr-only">Flaunch — launch, trade and earn from meme coins</h1>
        <StatsSection />
        <FilterBar
          kind={kind}
          onKindChange={(k) => {
            setKind(k);
            refresh();
          }}
          tab={tab}
          onTabChange={setTab}
          recentBuys={recentBuys}
          onRecentBuysChange={(v) => {
            setRecentBuys(v);
            refresh();
          }}
        />
        {visible.length > 0 ? (
          <section className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {visible.map((coin) => (
              <CoinCard key={coin.ticker} coin={coin} tickIndex={live.tickIndex} />
            ))}
          </section>
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">
            No coins match your filters. Clear the search or uncheck Recent buys.
          </p>
        )}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted-foreground">
          <span>Dev mode</span>
          <span>Terms</span>
          <span>Privacy</span>
          <span>Docs</span>
          <span>Metrics</span>
          <span className="ml-auto">Part of the FLAY ecosystem | A Flayer Labs product</span>
        </div>
      </footer>
    </div>
  );
}
