import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { Dot } from "@/components/CoinArt";
import { formatCompactUsd, formatPct, formatUsd } from "@/lib/format";
import type { LiveCoin } from "@/lib/market";

export type SortKey = "price" | "change" | "volume" | "mcap";
export type SortSpec = { key: SortKey; dir: "asc" | "desc" };

const COLUMNS: { key: SortKey | null; label: string }[] = [
  { key: null, label: "Name" },
  { key: "price", label: "Price" },
  { key: "change", label: "24h %" },
  { key: "volume", label: "Volume (24h)" },
  { key: "mcap", label: "Market cap" },
];

/**
 * Binance-style market table: one compact row per instrument, with sortable
 * headers (click a column to sort), a star column for favorites, and live
 * price flashes. Rows open the detail page.
 */
export function MarketTable({
  coins,
  tickIndex,
  sort,
  onSort,
  favorites,
  onToggleFavorite,
}: {
  coins: LiveCoin[];
  tickIndex: number;
  sort: SortSpec;
  onSort: (key: SortKey) => void;
  favorites: Set<string>;
  onToggleFavorite: (ticker: string) => void;
}) {
  const navigate = useNavigate();

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="w-9 px-2 py-3" aria-label="Favorite" />
              {COLUMNS.map((col) => {
                const active = col.key !== null && sort.key === col.key;
                return (
                  <th
                    key={col.label}
                    scope="col"
                    className={`px-4 py-3 font-medium ${col.key === null ? "text-left" : "text-right"}`}
                  >
                    {col.key === null ? (
                      col.label
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSort(col.key!)}
                        aria-label={`Sort by ${col.label}`}
                        className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors hover:text-foreground ${
                          active ? "text-foreground" : ""
                        }`}
                      >
                        {col.label}
                        {active ? (
                          sort.dir === "asc" ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 opacity-30" />
                        )}
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {coins.map((coin) => {
              const up = coin.change24hPct >= 0;
              const fav = favorites.has(coin.ticker);
              return (
                <tr
                  key={coin.ticker}
                  tabIndex={0}
                  onClick={() => navigate({ to: "/coin/$ticker", params: { ticker: coin.ticker } })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      navigate({ to: "/coin/$ticker", params: { ticker: coin.ticker } });
                    }
                  }}
                  className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <td className="px-2 py-3">
                    <button
                      type="button"
                      aria-label={
                        fav
                          ? `Remove ${coin.ticker} from favorites`
                          : `Add ${coin.ticker} to favorites`
                      }
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(coin.ticker);
                      }}
                      className={`grid h-6 w-6 place-items-center rounded-full transition-colors ${
                        fav ? "text-brand-pink" : "text-muted-foreground/40 hover:text-brand-pink"
                      }`}
                    >
                      <Star className="h-4 w-4" fill={fav ? "currentColor" : "none"} />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Dot hue={coin.hue} image={coin.image} className="h-8 w-8" />
                      <div className="min-w-0">
                        <Link
                          to="/coin/$ticker"
                          params={{ ticker: coin.ticker }}
                          onClick={(e) => e.stopPropagation()}
                          className="block truncate font-semibold hover:text-brand-pink"
                        >
                          {coin.ticker}
                        </Link>
                        <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                          {coin.name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    <span
                      key={tickIndex}
                      className={`-mx-1 rounded px-1 ${
                        coin.lastDeltaPct > 0.02
                          ? "flash-up"
                          : coin.lastDeltaPct < -0.02
                            ? "flash-down"
                            : ""
                      }`}
                    >
                      {formatUsd(coin.priceUsd)}
                    </span>
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-medium tabular-nums ${
                      up ? "text-success" : "text-danger"
                    }`}
                  >
                    {formatPct(coin.change24hPct)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {formatCompactUsd(coin.vol24hUsd)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatCompactUsd(coin.mcapUsd)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
