import { Link, useNavigate } from "@tanstack/react-router";
import { Dot } from "@/components/CoinArt";
import { formatCompactUsd, formatPct, formatUsd } from "@/lib/format";
import type { LiveCoin } from "@/lib/market";

/**
 * Binance-style market table: one compact row per instrument — small logo,
 * ticker + name, live price, 24h change, volume and market cap. Rows open the
 * detail page; prices flash green/red on every market tick.
 */
export function MarketTable({ coins, tickIndex }: { coins: LiveCoin[]; tickIndex: number }) {
  const navigate = useNavigate();

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
              <th scope="col" className="px-4 py-3 text-left font-medium">
                Name
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Price
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                24h %
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Volume (24h)
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Market cap
              </th>
            </tr>
          </thead>
          <tbody>
            {coins.map((coin) => {
              const up = coin.change24hPct >= 0;
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
