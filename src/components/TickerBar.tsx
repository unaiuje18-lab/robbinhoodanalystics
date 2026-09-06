import { useMarket } from "@/hooks/useLiveMarket";
import { formatCompactUsd, formatUsd } from "@/lib/format";
import { Dot } from "@/components/CoinArt";

function tradeAmount(amountUsd: number): string {
  return amountUsd >= 1000 ? formatCompactUsd(amountUsd) : formatUsd(amountUsd);
}

/** Live trade feed, duplicated for a seamless CSS marquee. */
export function TickerBar() {
  const market = useMarket();
  const coinByTicker = new Map(market.coins.map((c) => [c.ticker, c] as const));
  const items = [...market.trades, ...market.trades].slice(0, 32);

  return (
    <div className="overflow-hidden border-b border-border bg-card/80 py-2">
      <div className="flex w-max animate-marquee gap-2 px-2">
        {items.map((t, i) => {
          const coin = coinByTicker.get(t.ticker);
          return (
            <div
              key={i}
              className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5"
            >
              <Dot hue={coin?.hue ?? 260} image={coin?.image ?? null} />
              <div className="leading-tight">
                <div className="text-[11px] font-bold">{t.ticker}</div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span>{t.addr}</span>
                  <span
                    className={
                      t.action === "Sell"
                        ? "rounded bg-danger/10 px-1 font-semibold text-danger"
                        : "rounded bg-success/10 px-1 font-semibold text-success"
                    }
                  >
                    {t.action} {tradeAmount(t.amountUsd)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
