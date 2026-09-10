import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, Copy, ExternalLink, Star, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { CoinAvatar } from "@/components/CoinArt";
import { FlashingPrice } from "@/components/FlashingPrice";
import { TradingViewChart } from "@/components/TradingViewChart";
import { useBlackrug } from "@/hooks/useBlackrug";
import { useFavorites } from "@/hooks/useFavorites";
import { useMarket } from "@/hooks/useLiveMarket";
import { VOTE_WINDOW_MS, contractFor } from "@/lib/blackrug";
import { formatCompactUsd, formatPct, formatUsd } from "@/lib/format";

/** Live simulated price line — used when a coin has no TradingView listing. */
function SimPriceChart({
  data,
  strokeColor,
}: {
  data: { i: number; price: number }[];
  strokeColor: string;
}) {
  return (
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
  );
}

export const Route = createFileRoute("/coin/$ticker")({
  head: ({ params }) => ({
    meta: [{ title: `$${params.ticker.toUpperCase()} technical specifications — BlackRug` }],
  }),
  component: CoinDetail,
});

/** Contract address row — truncated mono text, click to copy the full value. */
function CopyContract({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={copied ? "Copied!" : `Copy ${address}`}
      onClick={() => {
        navigator.clipboard?.writeText(address).catch(() => undefined);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-xs transition-colors hover:bg-muted"
    >
      {`${address.slice(0, 6)}…${address.slice(-4)}`}
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );
}

/**
 * The vote panel — one vote per visitor per rolling 24h, enforced by the
 * server. Renders the right state for spec-less, hidden, voted and votable
 * coins so every token page explains its own voting status.
 */
function VotePanel({ ticker }: { ticker: string }) {
  const { state, vote, voting } = useBlackrug();
  const [justVoted, setJustVoted] = useState(false);

  // Until the first fetch lands we can't know the coin's spec status — keep
  // the panel quiet instead of flashing the "no spec" note.
  if (!state) return null;
  const spec = state.specs[ticker];
  if (!spec) {
    return (
      <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
        This coin doesn't have a technical specification yet — it gets one automatically the first
        time it enters the Top Volume top 20.
      </p>
    );
  }
  if (spec.hidden) {
    return (
      <p className="rounded-xl bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
        This token is currently hidden by the BlackRug team.
      </p>
    );
  }

  const remaining = state.myVoteAt ? state.myVoteAt + VOTE_WINDOW_MS - Date.now() : 0;
  const voted = justVoted || remaining > 0;
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        disabled={voted || voting}
        onClick={() =>
          vote(ticker).then((result) => {
            if (result.ok) setJustVoted(true);
          })
        }
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
          voted
            ? "cursor-default bg-success/15 text-success"
            : "bg-brand-pink text-primary-foreground hover:-translate-y-0.5 hover:shadow-card disabled:opacity-60"
        }`}
      >
        <ThumbsUp className="h-4 w-4" />
        {voted
          ? remaining > 0
            ? `Voted — next vote in ${hours}h ${minutes}m`
            : "Voted — thank you!"
          : voting
            ? "Voting…"
            : `Vote for $${ticker}`}
      </button>
      <p className="text-center text-[11px] text-muted-foreground">
        1 vote per day · no account needed
      </p>
    </div>
  );
}

/** Sidebar row — label left, value right, hairline between rows. */
function StatRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right font-semibold ${className ?? ""}`}>{value}</dd>
    </div>
  );
}

function StatBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <dl className="mt-1 divide-y divide-border">{children}</dl>
    </div>
  );
}

function CoinDetail() {
  const { ticker } = Route.useParams();
  const market = useMarket();
  const { state: blackrugState } = useBlackrug();
  const { favorites, toggle: toggleFavorite } = useFavorites();
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

  const isFav = favorites.has(coin.ticker);
  const peers = market.coins.filter((c) => c.kind === coin.kind);
  const rank = peers.filter((c) => c.mcapUsd > coin.mcapUsd).length + 1;
  const tvUrl = coin.tvSymbol
    ? `https://www.tradingview.com/symbols/${coin.tvSymbol.replace(":", "-")}/`
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
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

      <main className="mx-auto max-w-7xl space-y-8 px-6 py-8">
        {/* Hero: avatar, name, rank + favorite on the left; live price + CTA right. */}
        <section className="flex flex-wrap items-start gap-5 border-b border-border pb-6">
          <CoinAvatar
            ticker={coin.ticker}
            hue={coin.hue}
            hue2={coin.hue2}
            image={coin.image}
            className="h-24 w-24 shrink-0 rounded-2xl"
          />
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight">{coin.name}</h1>
            <p className="text-sm text-muted-foreground">
              {coin.kind === "stock" ? "Stock" : "Meme coin"} · ${coin.ticker}
              {coin.tvSymbol ? ` · ${coin.tvSymbol}` : ""}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">
                Rank #{rank} <span className="text-muted-foreground/60">of {peers.length}</span>
              </span>
              <button
                type="button"
                aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                title={isFav ? "Remove from favorites" : "Add to favorites"}
                onClick={() => toggleFavorite(coin.ticker)}
                className={`transition-transform hover:scale-110 ${
                  isFav ? "text-brand-pink" : "text-muted-foreground/50"
                }`}
              >
                <Star className={`h-4 w-4 ${isFav ? "fill-brand-pink" : ""}`} />
              </button>
            </div>
          </div>
          <div className="ml-auto flex flex-col items-end gap-2">
            <div className="rounded-2xl px-1 text-right">
              <p className="text-3xl font-extrabold tracking-tight">
                <FlashingPrice price={coin.priceUsd} />
              </p>
              <p
                className={
                  up ? "text-sm font-semibold text-success" : "text-sm font-semibold text-danger"
                }
              >
                {formatPct(coin.change24hPct)}{" "}
                <span className="font-normal text-muted-foreground">24h</span>
              </p>
            </div>
            {tvUrl && (
              <a
                href={tvUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Trade on TradingView <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </section>

        {/* Chart left, statistics sidebar right. */}
        <section className="grid items-start gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="text-sm font-semibold">Price chart</h2>
              <div className="mt-4">
                {coin.tvSymbol ? (
                  <TradingViewChart tvSymbol={coin.tvSymbol} className="h-[560px]" />
                ) : (
                  <div className="h-[480px]">
                    <SimPriceChart data={data} strokeColor={strokeColor} />
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
              <h2 className="text-sm font-semibold">Recent trades</h2>
              {trades.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  {coin.kind === "stock"
                    ? "Stocks don't print on the meme trade tape."
                    : "No trades yet — the tape moves every few seconds, check back shortly."}
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
            </div>
          </div>

          <aside className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-card">
            <StatBlock title="Statistics">
              <StatRow label="Price" value={formatUsd(coin.priceUsd)} />
              <StatRow
                label="24h change"
                value={formatPct(coin.change24hPct)}
                className={up ? "text-success" : "text-danger"}
              />
              <StatRow label="24h open" value={formatUsd(coin.open24hUsd)} />
              <StatRow label="Market cap" value={formatCompactUsd(coin.mcapUsd)} />
              <StatRow label="24h volume" value={formatCompactUsd(coin.vol24hUsd)} />
              <StatRow
                label="Rank"
                value={
                  <>
                    #{rank}{" "}
                    <span className="font-normal text-muted-foreground">of {peers.length}</span>
                  </>
                }
              />
              {coin.kind === "stock" ? (
                <StatRow label="Exchange" value={coin.tvSymbol?.split(":")[0] ?? "—"} />
              ) : (
                <StatRow label="Creator earnings" value={formatCompactUsd(coin.earningsUsd)} />
              )}
            </StatBlock>

            <div className="space-y-3">
              <StatBlock title="Technical specifications">
                <StatRow
                  label="Contract"
                  value={<CopyContract address={contractFor(coin.ticker)} />}
                />
                <StatRow
                  label="Votes (24h)"
                  value={(blackrugState?.voteCounts[coin.ticker] ?? 0).toLocaleString("en-US")}
                />
              </StatBlock>
              <VotePanel ticker={coin.ticker} />
            </div>

            <StatBlock title="Information">
              <StatRow label="Category" value={coin.kind === "stock" ? "Stock" : "Meme coin"} />
              <StatRow
                label="Chart source"
                value={coin.tvSymbol ? "TradingView" : "BlackRug simulation"}
              />
              {tvUrl && (
                <StatRow
                  label="Listed on"
                  value={
                    <a
                      href={tvUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-brand-pink hover:underline"
                    >
                      {coin.tvSymbol} <ExternalLink className="h-3 w-3" />
                    </a>
                  }
                />
              )}
            </StatBlock>
          </aside>
        </section>
      </main>
    </div>
  );
}
