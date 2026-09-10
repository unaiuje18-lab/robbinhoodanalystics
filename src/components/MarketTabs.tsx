import { Crown, Flame, Star, ThumbsUp } from "lucide-react";
import { useEffect, useState } from "react";

export type MarketCategory = "board" | "topvoted" | "topvolume" | "favorites" | "memes" | "stocks";

/** Sub-filter for the curated tabs — both markets together, or one only. */
export type KindFilter = "all" | "meme" | "stock";

const KIND_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "meme", label: "Meme coins" },
  { value: "stock", label: "Stocks" },
];

const CATEGORIES: { value: MarketCategory; label: string; icon?: typeof Star }[] = [
  { value: "board", label: "The Board", icon: Crown },
  { value: "topvoted", label: "Top Voted", icon: ThumbsUp },
  { value: "topvolume", label: "Top Volume", icon: Flame },
  { value: "favorites", label: "Favorites", icon: Star },
  { value: "memes", label: "Meme coins" },
  { value: "stocks", label: "Stocks" },
];

/**
 * Binance-style category tabs: bold active label with a pink underline.
 * Sorting lives in the table headers, not here. The first three tabs are
 * BlackRug's curated lists — The Board (curator picks), Top Voted (24h votes)
 * and Top Volume (24h volume, which auto-creates technical specifications).
 */
/** "Live · updated Xs ago" — re-renders once a second. */
function LiveBadge({ updatedAt }: { updatedAt: number | null }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (!updatedAt) return null;
  const age = Math.max(0, Math.round((Date.now() - updatedAt) / 1000));
  return (
    <span className="flex items-center gap-1.5 pb-2.5 text-xs text-muted-foreground">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      Live · updated {age}s ago
    </span>
  );
}

export function MarketTabs({
  category,
  onCategoryChange,
  favoritesCount,
  recentBuys,
  onRecentBuysChange,
  quotesUpdatedAt,
  kindFilter,
  onKindFilterChange,
}: {
  category: MarketCategory;
  onCategoryChange: (category: MarketCategory) => void;
  favoritesCount: number;
  recentBuys: boolean;
  onRecentBuysChange: (v: boolean) => void;
  quotesUpdatedAt: number | null;
  kindFilter: KindFilter;
  onKindFilterChange: (kind: KindFilter) => void;
}) {
  const curated = category === "board" || category === "topvoted" || category === "topvolume";
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 border-b border-border">
      <div className="flex items-center gap-6">
        {CATEGORIES.map((c) => {
          const active = c.value === category;
          return (
            <button
              key={c.value}
              type="button"
              aria-pressed={active}
              onClick={() => onCategoryChange(c.value)}
              className={`relative flex items-center gap-1.5 pb-2.5 pt-1 text-sm transition-colors ${
                active ? "font-bold text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {c.icon ? <c.icon className="h-4 w-4" /> : null}
              {c.label}
              {c.value === "favorites" && favoritesCount > 0 ? (
                <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold">
                  {favoritesCount}
                </span>
              ) : null}
              {active ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-pink" />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-4">
        <LiveBadge updatedAt={quotesUpdatedAt} />
        {curated ? (
          <div
            role="group"
            aria-label="Filter by market"
            className="flex rounded-full border border-border bg-card p-0.5 text-xs font-semibold"
          >
            {KIND_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={kindFilter === option.value}
                onClick={() => onKindFilterChange(option.value)}
                className={`rounded-full px-3 py-1 transition-colors ${
                  kindFilter === option.value
                    ? "bg-brand-pink text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={recentBuys}
              onChange={(e) => onRecentBuysChange(e.target.checked)}
              className="h-4 w-4 rounded border-border"
            />
            Recent buys
          </label>
        )}
      </div>
    </div>
  );
}
