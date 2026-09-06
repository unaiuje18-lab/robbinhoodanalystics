import { BarChart3, Flame, TrendingDown, TrendingUp } from "lucide-react";
import type { MarketTab } from "@/lib/market";

const TABS: { label: string; value: MarketTab; icon: typeof Flame }[] = [
  { label: "Trending", value: "trending", icon: Flame },
  { label: "Top", value: "top", icon: BarChart3 },
  { label: "Gainers", value: "gainers", icon: TrendingUp },
  { label: "Losers", value: "losers", icon: TrendingDown },
];

export function FilterBar({
  tab,
  onTabChange,
  recentBuys,
  onRecentBuysChange,
}: {
  tab: MarketTab;
  onTabChange: (tab: MarketTab) => void;
  recentBuys: boolean;
  onRecentBuysChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {TABS.map((t) => (
        <button
          key={t.value}
          aria-pressed={t.value === tab}
          onClick={() => onTabChange(t.value)}
          className={
            t.value === tab
              ? "flex items-center gap-1.5 rounded-full bg-brand-pink px-4 py-2 text-sm font-semibold text-primary-foreground"
              : "flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
          }
        >
          <t.icon className="h-4 w-4" />
          {t.label}
        </button>
      ))}
      <label className="ml-2 flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
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
