import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MarketTable, type SortKey, type SortSpec } from "@/components/MarketTable";
import { MarketTabs, type MarketCategory } from "@/components/MarketTabs";
import { SiteHeader } from "@/components/SiteHeader";
import { StatsSection } from "@/components/StatsSection";
import { TickerBar } from "@/components/TickerBar";
import { useFavorites } from "@/hooks/useFavorites";
import { useMarket, useMarketSnapshot } from "@/hooks/useLiveMarket";
import { filterCoins, type LiveCoin } from "@/lib/market";

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

const SORT_FIELD: Record<SortKey, (coin: LiveCoin) => number> = {
  price: (c) => c.priceUsd,
  change: (c) => c.change24hPct,
  volume: (c) => c.vol24hUsd,
  mcap: (c) => c.mcapUsd,
};

function Index() {
  const live = useMarket();
  const { market: ranking, refresh } = useMarketSnapshot();
  const { favorites, toggle: toggleFavorite } = useFavorites();
  const [category, setCategory] = useState<MarketCategory>("memes");
  const [sort, setSort] = useState<SortSpec>({ key: "mcap", dir: "desc" });
  const [query, setQuery] = useState("");
  const [recentBuys, setRecentBuys] = useState(false);

  const pool = ranking.coins.filter((c) =>
    category === "favorites"
      ? favorites.has(c.ticker)
      : c.kind === (category === "stocks" ? "stock" : "meme"),
  );

  // Order comes from the slow snapshot (stable while scrolling); values stay live.
  const ranker = SORT_FIELD[sort.key];
  const ordered = [...filterCoins(pool, ranking.trades, { query, recentBuys })].sort((a, b) =>
    sort.dir === "desc" ? ranker(b) - ranker(a) : ranker(a) - ranker(b),
  );
  const liveByTicker = new Map(live.coins.map((c) => [c.ticker, c] as const));
  const visible = ordered.flatMap((c) => {
    const liveCoin = liveByTicker.get(c.ticker);
    return liveCoin ? [liveCoin] : [];
  });

  const handleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "desc" ? "asc" : "desc" } : { key, dir: "desc" },
    );

  const emptyHint =
    category === "favorites"
      ? "Nothing starred yet — tap the star on any row to pin it here."
      : "No coins match your filters. Clear the search or uncheck Recent buys.";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TickerBar />
      <SiteHeader query={query} onQueryChange={setQuery} />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <h1 className="sr-only">Flaunch — launch, trade and earn from meme coins</h1>
        <StatsSection />
        <MarketTabs
          category={category}
          onCategoryChange={(c) => {
            setCategory(c);
            refresh();
          }}
          favoritesCount={favorites.size}
          quotesUpdatedAt={live.quotesUpdatedAt}
          recentBuys={recentBuys}
          onRecentBuysChange={(v) => {
            setRecentBuys(v);
            refresh();
          }}
        />
        {visible.length > 0 ? (
          <MarketTable
            coins={visible}
            tickIndex={live.tickIndex}
            sort={sort}
            onSort={handleSort}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
          />
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">{emptyHint}</p>
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
