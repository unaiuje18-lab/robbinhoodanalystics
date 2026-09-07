import { Star } from "lucide-react";

export type MarketCategory = "favorites" | "memes" | "stocks";

const CATEGORIES: { value: MarketCategory; label: string; icon?: typeof Star }[] = [
  { value: "favorites", label: "Favorites", icon: Star },
  { value: "memes", label: "Meme coins" },
  { value: "stocks", label: "Stocks" },
];

/**
 * Binance-style category tabs: bold active label with a pink underline.
 * Sorting lives in the table headers, not here.
 */
export function MarketTabs({
  category,
  onCategoryChange,
  favoritesCount,
  recentBuys,
  onRecentBuysChange,
}: {
  category: MarketCategory;
  onCategoryChange: (category: MarketCategory) => void;
  favoritesCount: number;
  recentBuys: boolean;
  onRecentBuysChange: (v: boolean) => void;
}) {
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
      <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={recentBuys}
          onChange={(e) => onRecentBuysChange(e.target.checked)}
          className="h-4 w-4 rounded border-border"
        />
        Recent buys
      </label>
    </div>
  );
}
