import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { CoinAvatar } from "@/components/CoinArt";
import { useMarket } from "@/hooks/useLiveMarket";
import { formatCompactUsd, formatPct, formatUsd } from "@/lib/format";

export const Route = createFileRoute("/coin/$ticker")({
  head: ({ params }) => ({
    meta: [{ title: `${params.ticker.toUpperCase()} — Flaunch` }],
  }),
  component: CoinDetail,
});

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-extrabold tracking-tight ${className ?? ""}`}>{value}</p>
    </div>
  );
}

function CoinDetail() {
  const { ticker } = Route.useParams();
  const market = useMarket();
  const coin = market.coins.find((c) => c.ticker.toLowerCase() === ticker.toLowerCase());

  if (!coin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <h1 className="text-2xl font-bold">Coin not found</h1>
        <p className="text-sm text-muted-foreground">
          No coin with ticker "${ticker.toUpperCase()}" is listed right now.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-brand-pink px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to trending
        </Link>
      </div>
    );
  }

  const up = coin.change24hPct >= 0;
  const strokeColor = up ? "oklch(0.6 0.17 150)" : "oklch(0.62 0.22 20)";
  const data = coin.history.map((price, i) => ({ i, price }));
  const trades = market.trades.filter((t) => t.ticker === coin.ticker);

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
            F
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <section className="flex flex-wrap items-center gap-4">
          <CoinAvatar
            ticker={coin.ticker}
            hue={coin.hue}
            hue2={coin.hue2}
            image={coin.image}
            className="h-16 w-16 shrink-0 rounded-2xl"
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight">{coin.name}</h1>
            <p className="text-sm text-muted-foreground">${coin.ticker}</p>
          </div>
          <div
            key={market.tickIndex}
            className={`ml-auto rounded-2xl px-1 text-right ${
              coin.lastDeltaPct > 0.02 ? "flash-up" : coin.lastDeltaPct < -0.02 ? "flash-down" : ""
            }`}
          >
            <p className="text-3xl font-extrabold tracking-tight">{formatUsd(coin.priceUsd)}</p>
            <p
              className={
                up ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"
              }
            >
              {formatPct(coin.change24hPct)}{" "}
              <span className="font-normal text-muted-foreground">24h</span>
            </p>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Market cap" value={formatCompactUsd(coin.mcapUsd)} />
          <Stat label="24h volume" value={formatCompactUsd(coin.vol24hUsd)} />
          <Stat label="Creator earnings" value={formatCompactUsd(coin.earningsUsd)} />
          <Stat
            label="24h change"
            value={formatPct(coin.change24hPct)}
            className={up ? "text-success" : "text-danger"}
          />
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h2 className="text-sm font-semibold">Price</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <YAxis domain={["auto", "auto"]} hide />
                <Tooltip
                  formatter={(value) => [formatUsd(Number(value)), "Price"]}
                  labelFormatter={() => ""}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid oklch(0.929 0.013 255.508)",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={strokeColor}
                  strokeWidth={2}
                  fill="url(#priceFill)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-card">
          <h2 className="text-sm font-semibold">Recent trades</h2>
          {trades.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No trades yet — the tape moves every few seconds, check back shortly.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {trades.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{t.addr}</span>
                  <span
                    className={
                      t.action === "Buy"
                        ? "font-semibold text-success"
                        : "font-semibold text-danger"
                    }
                  >
                    {t.action}
                  </span>
                  <span className="font-semibold">{formatUsd(t.amountUsd)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
