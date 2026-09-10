import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { TradingViewChart } from "@/components/TradingViewChart";
import { useMarket } from "@/hooks/useLiveMarket";
import { formatCompactUsd } from "@/lib/format";
import { totalMcap } from "@/lib/market";

/**
 * Market-total pages behind the two stat panels on the home grid. TradingView
 * publishes no meme-only cap and no total-stock-cap index, so each page charts
 * the closest real series and says so in `note`; the headline number is our
 * own live sum over the listed coins.
 */
const MARKETS = {
  memes: {
    kind: "meme" as const,
    title: "Total meme market cap",
    tvSymbol: "CRYPTOCAP:TOTAL",
    chartTitle: "Crypto total market cap",
    note: "Live sum across every meme coin listed on BlackRug. TradingView has no meme-only index, so the chart tracks the whole crypto market cap (CRYPTOCAP:TOTAL).",
  },
  stocks: {
    kind: "stock" as const,
    title: "Total stock market cap",
    tvSymbol: "FTSE:RUA",
    chartTitle: "Russell 3000 index",
    note: "Live sum across every stock listed on BlackRug. TradingView has no total-market-cap index, so the chart tracks the Russell 3000, which covers ~98% of US market cap (FTSE:RUA).",
  },
};

type MarketKind = keyof typeof MARKETS;

const marketConfig = (kind: string) => (kind in MARKETS ? MARKETS[kind as MarketKind] : undefined);

export const Route = createFileRoute("/market/$kind")({
  head: ({ params }) => ({
    meta: [
      {
        title: `${marketConfig(params.kind)?.title ?? "Market"} — BlackRug`,
      },
    ],
  }),
  component: MarketTotalPage,
});

function MarketTotalPage() {
  const { kind } = Route.useParams();
  const config = marketConfig(kind);
  const live = useMarket();

  if (!config) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <h1 className="text-2xl font-bold">Market not found</h1>
        <p className="text-sm text-muted-foreground">No market named "{kind}" is tracked here.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-brand-pink px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to trending
        </Link>
      </div>
    );
  }

  const kindCoins = live.coins.filter((c) => c.kind === config.kind);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Trending
          </Link>
          <span className="ml-auto grid h-8 w-8 place-items-center rounded-lg bg-brand-pink text-lg font-black text-primary-foreground">
            B
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section>
          <h1 className="text-2xl font-extrabold tracking-tight">{config.title}</h1>
          <p className="text-sm text-muted-foreground">Across {kindCoins.length} coins · live</p>
          <p className="mt-2 text-4xl font-extrabold tracking-tight">
            {formatCompactUsd(totalMcap(kindCoins))}
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h2 className="text-sm font-semibold">{config.chartTitle}</h2>
          <div className="mt-4">
            <TradingViewChart tvSymbol={config.tvSymbol} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{config.note}</p>
        </section>
      </main>
    </div>
  );
}
