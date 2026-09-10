import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { MarketTable, type SortKey, type SortSpec } from "@/components/MarketTable";
import { MarketTabs, type KindFilter, type MarketCategory } from "@/components/MarketTabs";
import { SiteHeader } from "@/components/SiteHeader";
import { StatsSection } from "@/components/StatsSection";
import { TickerBar } from "@/components/TickerBar";
import { useBlackrug } from "@/hooks/useBlackrug";
import { useFavorites } from "@/hooks/useFavorites";
import { useMarket, useMarketSnapshot } from "@/hooks/useLiveMarket";
import { TOP_LIST_SIZE, VOTE_WINDOW_MS } from "@/lib/blackrug";
import { ensureSpecsFn } from "@/lib/blackrugServer";
import { filterCoins, topByVolume, type LiveCoin } from "@/lib/market";

const CATEGORY_VALUES: MarketCategory[] = [
  "board",
  "topvoted",
  "topvolume",
  "favorites",
  "memes",
  "stocks",
];
const KIND_VALUES: KindFilter[] = ["all", "meme", "stock"];

export const Route = createFileRoute("/")({
  // Tab and market filter live in the URL (?tab=…&kind=…) so the selection
  // survives moving between sections instead of resetting every visit.
  validateSearch: (
    search: Record<string, unknown>,
  ): { tab?: string | undefined; kind?: string | undefined } => ({
    tab: typeof search["tab"] === "string" ? search["tab"] : undefined,
    kind: typeof search["kind"] === "string" ? search["kind"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "BlackRug — Track. Vote. Earn." },
      {
        name: "description",
        content:
          "Live meme-coin markets: The Board, Top Voted and Top Volume. Every trade moves the market in real time.",
      },
      { property: "og:title", content: "BlackRug — Track. Vote. Earn." },
      {
        property: "og:description",
        content: "The Board, Top Voted and Top Volume — live meme-coin analytics.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

/** Sort keys that read straight off a coin. "votes" comes from shared state. */
const SORT_FIELD: Record<Exclude<SortKey, "votes">, (coin: LiveCoin) => number> = {
  price: (c) => c.priceUsd,
  change: (c) => c.change24hPct,
  volume: (c) => c.vol24hUsd,
  mcap: (c) => c.mcapUsd,
};

function Index() {
  const live = useMarket();
  const { market: ranking, refresh } = useMarketSnapshot();
  const { state: blackrug } = useBlackrug(); // Vote buttons live on the spec pages.
  const { favorites, toggle: toggleFavorite } = useFavorites();
  const queryClient = useQueryClient();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const category: MarketCategory = CATEGORY_VALUES.includes(search.tab as MarketCategory)
    ? (search.tab as MarketCategory)
    : "memes";
  // Curated tabs span both markets: "all" mixes memes and stocks in one list;
  // "meme"/"stock" show only that kind.
  const kindFilter: KindFilter = KIND_VALUES.includes(search.kind as KindFilter)
    ? (search.kind as KindFilter)
    : "all";
  // null sort = the section's natural order (curator order on The Board, vote
  // order on Top Voted, volume on Top Volume, market cap elsewhere).
  const [sort, setSort] = useState<SortSpec | null>(null);
  const [query, setQuery] = useState("");
  const [recentBuys, setRecentBuys] = useState(false);
  // Browse shows the top 10; each "Show more" pages in +25, and the third
  // click reveals the rest. Searching lifts the cap so matches can't hide.
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(0);

  const updateSearch = (patch: { tab?: MarketCategory; kind?: KindFilter }) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }) });

  const specs = blackrug?.specs ?? {};
  const voteCounts = blackrug?.voteCounts ?? {};
  const hidden = new Set(
    Object.entries(specs)
      .filter(([, spec]) => spec.hidden)
      .map(([ticker]) => ticker),
  );
  const now = Date.now();
  const newSpecs = new Set(
    Object.entries(specs)
      .filter(([, spec]) => now - spec.createdAt < VOTE_WINDOW_MS)
      .map(([ticker]) => ticker),
  );

  // Top Volume drives technical-spec creation: the top 20 by 24h volume in
  // the selected market mix, sent to the server whenever it changes
  // (idempotent — existing specs stay).
  const topVolumeTickers = topByVolume(
    ranking.coins.filter(
      (c) => !hidden.has(c.ticker) && (kindFilter === "all" || c.kind === kindFilter),
    ),
    TOP_LIST_SIZE,
  ).map((c) => c.ticker);
  const topVolumeKey = topVolumeTickers.join(",");
  const sentSpecsRef = useRef<string | null>(null);
  useEffect(() => {
    if (!topVolumeKey || sentSpecsRef.current === topVolumeKey) return;
    sentSpecsRef.current = topVolumeKey;
    ensureSpecsFn({ data: { tickers: topVolumeTickers } }).then((result) => {
      if (result.created.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["blackrug"] });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tickers derive from the key
  }, [topVolumeKey, queryClient]);

  // Kind lookup for lists that arrive as bare tickers (votes, board).
  const kindByTicker = new Map(ranking.coins.map((c) => [c.ticker, c.kind] as const));
  const kindOk = (ticker: string) =>
    kindFilter === "all" || kindByTicker.get(ticker) === kindFilter;

  // Top Voted: most 24h votes first, seniority breaks ties.
  const topVotedTickers = Object.entries(voteCounts)
    .filter(([ticker]) => specs[ticker] && !hidden.has(ticker) && kindOk(ticker))
    .sort(
      (a, b) =>
        b[1] - a[1] ||
        (specs[a[0]]?.createdAt ?? 0) - (specs[b[0]]?.createdAt ?? 0) ||
        a[0].localeCompare(b[0]),
    )
    .slice(0, TOP_LIST_SIZE)
    .map(([ticker]) => ticker);

  const curated: string[] | null =
    category === "board"
      ? (blackrug?.board ?? []).filter((ticker) => !hidden.has(ticker) && kindOk(ticker))
      : category === "topvoted"
        ? topVotedTickers
        : category === "topvolume"
          ? topVolumeTickers
          : null;

  const pool = curated
    ? curated
        .map((ticker) => ranking.coins.find((c) => c.ticker === ticker))
        .filter((c): c is LiveCoin => c !== undefined)
    : ranking.coins.filter((c) =>
        category === "favorites"
          ? favorites.has(c.ticker)
          : c.kind === (category === "stocks" ? "stock" : "meme"),
      );

  // Every section sorts through the same path: null sort keeps the natural
  // list order (curator / votes / volume), anything else sorts by the column.
  const isCurated = curated !== null;
  const filtered = filterCoins(pool, ranking.trades, {
    query,
    recentBuys: isCurated ? false : recentBuys,
  });
  const sortValue = (coin: LiveCoin, key: SortKey): number =>
    key === "votes" ? (voteCounts[coin.ticker] ?? 0) : SORT_FIELD[key](coin);
  const ordered =
    sort === null
      ? filtered
      : [...filtered].sort((a, b) =>
          sort.dir === "desc"
            ? sortValue(b, sort.key) - sortValue(a, sort.key)
            : sortValue(a, sort.key) - sortValue(b, sort.key),
        );
  const liveByTicker = new Map(live.coins.map((c) => [c.ticker, c] as const));
  const visible = ordered.flatMap((c) => {
    const liveCoin = liveByTicker.get(c.ticker);
    return liveCoin ? [liveCoin] : [];
  });
  const shown =
    query || isCurated ? visible : visible.slice(0, page >= 3 ? undefined : 10 + page * PAGE_SIZE);
  const showingAll = page >= 3 || 10 + page * PAGE_SIZE >= visible.length;
  const ranks = new Map(curated?.map((ticker, i) => [ticker, i + 1] as const) ?? []);

  const handleSort = (key: SortKey) =>
    setSort((prev) =>
      prev && prev.key === key
        ? { key, dir: prev.dir === "desc" ? "asc" : "desc" }
        : { key, dir: "desc" },
    );

  const emptyHint =
    category === "favorites"
      ? "Nothing starred yet — tap the star on any row to pin it here."
      : category === "board"
        ? "The Board is still being curated — the 10 picks will appear here."
        : category === "topvoted"
          ? "No votes in the last 24 hours. Open any coin with a technical specification and cast the first vote."
          : "No coins match your filters. Clear the search or uncheck Recent buys.";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TickerBar />
      <SiteHeader query={query} onQueryChange={setQuery} />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <h1 className="sr-only">BlackRug — meme coin analytics, The Board and community votes</h1>
        <StatsSection />
        <MarketTabs
          category={category}
          onCategoryChange={(c) => {
            updateSearch({ tab: c });
            setPage(0);
            refresh();
          }}
          favoritesCount={favorites.size}
          quotesUpdatedAt={live.quotesUpdatedAt}
          recentBuys={recentBuys}
          onRecentBuysChange={(v) => {
            setRecentBuys(v);
            setPage(0);
            refresh();
          }}
          kindFilter={kindFilter}
          onKindFilterChange={(k) => updateSearch({ kind: k })}
        />
        {sort !== null ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSort(null)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" /> Default order
            </button>
          </div>
        ) : null}
        {visible.length > 0 ? (
          <>
            <MarketTable
              coins={shown}
              sort={sort ?? { key: "mcap", dir: "desc" }}
              onSort={handleSort}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              votes={isCurated ? voteCounts : undefined}
              newSpecs={newSpecs}
              ranks={isCurated ? ranks : undefined}
            />
            {!query && !isCurated && visible.length > 10 && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setPage((p) => (showingAll ? 0 : p + 1))}
                  className="rounded-full border border-border bg-card px-6 py-2 text-sm font-semibold transition-colors hover:border-brand-pink hover:bg-muted/60"
                >
                  {showingAll ? "Show less" : "Show more"}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">{emptyHint}</p>
        )}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted-foreground">
          <Link to="/admin" className="transition-colors hover:text-foreground">
            Admin
          </Link>
          <span>Terms</span>
          <span>Privacy</span>
          <span>Docs</span>
          <span>Metrics</span>
          <span className="ml-auto">BlackRug — meme coin analytics</span>
        </div>
      </footer>
    </div>
  );
}
