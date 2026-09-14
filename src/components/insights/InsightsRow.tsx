import { MostActiveCard } from "@/components/insights/MostActiveCard";
import { MarketCapCard } from "@/components/insights/MarketCapCard";
import { TopGainersCard } from "@/components/insights/TopGainersCard";

/**
 * The CoinMarketCap-style insights row under the stats band. Always crypto —
 * the chart panels run on Binance klines, which only exist for memes.
 */
export function InsightsRow() {
  return (
    <section aria-label="Market insights" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <MostActiveCard />
      <TopGainersCard />
      <MarketCapCard />
    </section>
  );
}
