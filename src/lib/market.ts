import { coinSeeds } from "@/data/coins";
import { stockSeeds } from "@/data/stocks";
import { hashStr, mulberry32, type Rng } from "@/lib/random";

export const HISTORY_CAP = 120;
export const TRADES_CAP = 40;
export const CREATOR_FEE_RATE = 0.01;

/** What the hero "Total creator earnings" stat starts at — earned fees accrue on top. */
const TOTAL_EARNINGS_TARGET = 2_712_958;
const TRADE_PROBABILITY = 0.65;
const SECOND_TRADE_PROBABILITY = 0.25;
const BUY_PROBABILITY = 0.62;

export type LiveCoin = {
  ticker: string;
  name: string;
  /** Which market it belongs to — drives the grid toggle and the trade tape. */
  kind: "meme" | "stock";
  priceUsd: number;
  /** Reference price 24h ago — change24hPct is always derived from this. */
  open24hUsd: number;
  mcapUsd: number;
  vol24hUsd: number;
  earningsUsd: number;
  change24hPct: number;
  /** Price history, oldest → newest, ends at priceUsd. */
  history: number[];
  /** Signed % move of the last tick — drives the green/red flash. */
  lastDeltaPct: number;
  /** Logo URL, when the seed list provides one; components fall back to gradients. */
  image: string | null;
  /**
   * TradingView symbol for the real candlestick chart (stocks and major
   * memes); null → detail pages render the simulated chart.
   */
  tvSymbol: string | null;
  hue: number;
  hue2: number;
};

export type TradeAction = "Buy" | "Sell";

export type TradeEvent = {
  id: string;
  ticker: string;
  addr: string;
  action: TradeAction;
  amountUsd: number;
};

export type MarketState = {
  tickIndex: number;
  /** PRNG state — carrying it in state keeps stepMarket pure. */
  rngState: number;
  coins: LiveCoin[];
  /** Newest first, capped at TRADES_CAP. */
  trades: TradeEvent[];
  /** Client clock of the last real-quote application; null before the first poll. */
  quotesUpdatedAt: number | null;
};

export type MarketTab = "trending" | "top" | "gainers" | "losers";

export type MarketKind = "memes" | "stocks";

/**
 * How long a ranking snapshot stays fixed before it may re-rank — 15 ticks
 * ≈ 30s. Re-ranking every tick made ~2/3 of the grid jump while scrolling.
 */
export const SNAPSHOT_REFRESH_TICKS = 15;

/** True when `snapshot` is old enough to be replaced by `latest`. */
export function isRefreshDue(snapshot: MarketState, latest: MarketState, everyN: number): boolean {
  return latest.tickIndex - snapshot.tickIndex >= everyN;
}

/** Approximate standard normal via 3 uniforms (Irwin–Hall), range [-1.5, 1.5]. */
function gauss(rng: Rng): number {
  return rng.next() + rng.next() + rng.next() - 1.5;
}

/** Per-tick volatility band: memes 0.3%–1.5%, stocks a saner 0.08%–0.3%. */
function volFor(kind: LiveCoin["kind"], ticker: string): number {
  const jitter = (hashStr(ticker) % 100) / 100;
  return kind === "meme" ? 0.003 + jitter * 0.012 : 0.0008 + jitter * 0.0022;
}

/** Skewed trade size: mostly $3–$50, occasionally whales up to ~$5k. */
function tradeAmount(rng: Rng): number {
  return Math.round((3 + Math.pow(rng.next(), 3) * 5000) * 100) / 100;
}

function fakeAddr(rng: Rng): string {
  const hex = (n: number) => {
    let s = "";
    for (let i = 0; i < n; i++) s += "0123456789abcdef".charAt(Math.floor(rng.next() * 16));
    return s;
  };
  return `0x${hex(4)}...${hex(4)}`;
}

function withDerivedChange(coin: LiveCoin): LiveCoin {
  return { ...coin, change24hPct: (coin.priceUsd / coin.open24hUsd - 1) * 100 };
}

/**
 * Deterministic initial market — every call returns the same state so the
 * server render and the client's first paint agree (no hydration mismatch).
 */
export function seedMarket(): MarketState {
  const seed = hashStr("flaunch-live-seed-v1");
  const rng = mulberry32(seed);
  const totalMemeMcap = coinSeeds.reduce((sum, c) => sum + c.mcapUsd, 0);
  const earningsScale = totalMemeMcap > 0 ? TOTAL_EARNINGS_TARGET / totalMemeMcap : 0;

  const buildCoin = (
    seedCoin: {
      ticker: string;
      name: string;
      priceUsd: number;
      mcapUsd: number;
      change24hPct: number;
      vol24hUsd: number;
      image: string | null;
      tvSymbol?: string | null;
      hue: number;
      hue2: number;
    },
    kind: LiveCoin["kind"],
    earningsUsd: number,
    tvSymbol: string | null,
  ): LiveCoin => {
    const open24hUsd = seedCoin.priceUsd / (1 + seedCoin.change24hPct / 100);
    // Walk backwards from today's price so history ends exactly at it.
    const history = new Array<number>(HISTORY_CAP);
    history[HISTORY_CAP - 1] = seedCoin.priceUsd;
    let p = seedCoin.priceUsd;
    const vol = volFor(kind, seedCoin.ticker);
    for (let i = HISTORY_CAP - 2; i >= 0; i--) {
      p = Math.max(p / (1 + gauss(rng) * vol), 1e-12);
      history[i] = p;
    }
    return withDerivedChange({
      ticker: seedCoin.ticker,
      name: seedCoin.name,
      kind,
      priceUsd: seedCoin.priceUsd,
      open24hUsd,
      mcapUsd: seedCoin.mcapUsd,
      vol24hUsd: seedCoin.vol24hUsd,
      earningsUsd,
      change24hPct: seedCoin.change24hPct,
      history,
      lastDeltaPct: 0,
      image: seedCoin.image,
      tvSymbol,
      hue: seedCoin.hue,
      hue2: seedCoin.hue2,
    });
  };

  const coins: LiveCoin[] = [
    ...coinSeeds.map((s) => buildCoin(s, "meme", s.mcapUsd * earningsScale, s.tvSymbol ?? null)),
    ...stockSeeds.map((s) => buildCoin(s, "stock", 0, s.tvSymbol)),
  ];

  // The tape only carries meme trades — stocks don't print every 2 seconds.
  const memes = coins.filter((c) => c.kind === "meme");
  const trades: TradeEvent[] = [];
  for (let i = 0; i < 14; i++) {
    const coin = memes[Math.floor(rng.next() * memes.length)];
    if (!coin) continue;
    trades.push({
      id: `seed-${i}`,
      ticker: coin.ticker,
      addr: fakeAddr(rng),
      action: rng.next() < BUY_PROBABILITY ? "Buy" : "Sell",
      amountUsd: tradeAmount(rng),
    });
  }

  return { tickIndex: 0, rngState: rng.state(), coins, trades, quotesUpdatedAt: null };
}

function makeTradeSpec(
  rng: Rng,
  memeIndices: number[],
): { coinIndex: number; action: TradeAction; amountUsd: number } {
  return {
    coinIndex: memeIndices[Math.floor(rng.next() * memeIndices.length)] ?? 0,
    action: rng.next() < BUY_PROBABILITY ? "Buy" : "Sell",
    amountUsd: tradeAmount(rng),
  };
}

/**
 * Advance the market one tick. Pure: same input state → same output state.
 * Prices, volume and market caps are owned by real quotes (see applyQuotes) —
 * this tick only records the fictional meme tape and the creator fees it earns.
 */
export function stepMarket(prev: MarketState): MarketState {
  const rng = mulberry32(prev.rngState);

  const specs = [] as { coinIndex: number; action: TradeAction; amountUsd: number }[];
  const memeIndices = prev.coins.flatMap((c, i) => (c.kind === "meme" ? [i] : []));
  if (memeIndices.length > 0 && rng.next() < TRADE_PROBABILITY) {
    specs.push(makeTradeSpec(rng, memeIndices));
    if (rng.next() < SECOND_TRADE_PROBABILITY) specs.push(makeTradeSpec(rng, memeIndices));
  }

  const coins = prev.coins.map((coin, i) => {
    const spec = specs.find((s) => s.coinIndex === i);
    if (!spec) return coin;
    return {
      ...coin,
      earningsUsd: coin.earningsUsd + spec.amountUsd * CREATOR_FEE_RATE,
    };
  });

  const trades: TradeEvent[] = [
    ...specs.map((spec, j) => {
      const coin = prev.coins[spec.coinIndex];
      return {
        id: `${prev.tickIndex + 1}-${j}`,
        ticker: coin ? coin.ticker : "",
        addr: fakeAddr(rng),
        action: spec.action,
        amountUsd: spec.amountUsd,
      };
    }),
    ...prev.trades,
  ].slice(0, TRADES_CAP);

  return {
    tickIndex: prev.tickIndex + 1,
    rngState: rng.state(),
    coins,
    trades,
    quotesUpdatedAt: prev.quotesUpdatedAt,
  };
}

export type Quote = {
  ticker: string;
  priceUsd: number | null;
  change24hPct: number | null;
  vol24hUsd: number | null;
  mcapUsd: number | null;
};

/**
 * Fold real provider quotes into the market. Price, 24h change, volume and
 * market cap become the provider's word; the seeded history grows one point
 * per real price move and lastDeltaPct drives the green/red flashes. Quotes
 * without a market cap (the Binance overlay) scale the last known cap by the
 * price ratio.
 */
export function applyQuotes(
  state: MarketState,
  quotes: Quote[],
  now: number = Date.now(),
): MarketState {
  if (quotes.length === 0) return state;
  const byTicker = new Map(quotes.map((q) => [q.ticker.toUpperCase(), q] as const));

  const coins = state.coins.map((coin) => {
    const quote = byTicker.get(coin.ticker);
    if (!quote) return coin;

    const prevPrice = coin.priceUsd;
    const priceUsd = quote.priceUsd !== null && quote.priceUsd > 0 ? quote.priceUsd : prevPrice;
    const ratio = prevPrice > 0 ? priceUsd / prevPrice : 1;
    const mcapUsd =
      quote.mcapUsd !== null && quote.mcapUsd > 0
        ? quote.mcapUsd
        : Math.max(coin.mcapUsd * ratio, 0);
    const vol24hUsd =
      quote.vol24hUsd !== null && quote.vol24hUsd > 0 ? quote.vol24hUsd : coin.vol24hUsd;
    // Anchor the 24h open on the provider's change so the derived % matches it.
    const open24hUsd =
      quote.change24hPct !== null ? priceUsd / (1 + quote.change24hPct / 100) : coin.open24hUsd;
    const history =
      priceUsd !== prevPrice ? [...coin.history.slice(-(HISTORY_CAP - 1)), priceUsd] : coin.history;
    const lastDeltaPct = prevPrice > 0 ? (priceUsd / prevPrice - 1) * 100 : 0;

    return withDerivedChange({
      ...coin,
      priceUsd,
      open24hUsd,
      mcapUsd,
      vol24hUsd,
      history,
      lastDeltaPct,
    });
  });

  return { ...state, coins, quotesUpdatedAt: now };
}

export function totalCreatorEarnings(coins: LiveCoin[]): number {
  return coins.reduce((sum, c) => sum + c.earningsUsd, 0);
}

export function total24hVolume(coins: LiveCoin[]): number {
  return coins.reduce((sum, c) => sum + c.vol24hUsd, 0);
}

export function totalMcap(coins: LiveCoin[]): number {
  return coins.reduce((sum, c) => sum + c.mcapUsd, 0);
}

export function topByEarnings(coins: LiveCoin[], count: number): LiveCoin[] {
  return [...coins].sort((a, b) => b.earningsUsd - a.earningsUsd).slice(0, count);
}

export function topByVolume(coins: LiveCoin[], count: number): LiveCoin[] {
  return [...coins].sort((a, b) => b.vol24hUsd - a.vol24hUsd).slice(0, count);
}

/** Movement weighted by size — big caps need real volume to trend. */
export function trendingScore(coin: LiveCoin): number {
  return Math.abs(coin.change24hPct) * Math.log10(coin.vol24hUsd + 10);
}

export function sortCoins(coins: LiveCoin[], tab: MarketTab): LiveCoin[] {
  const sorted = [...coins];
  switch (tab) {
    case "trending":
      return sorted.sort((a, b) => trendingScore(b) - trendingScore(a));
    case "top":
      return sorted.sort((a, b) => b.mcapUsd - a.mcapUsd);
    case "gainers":
      return sorted.sort((a, b) => b.change24hPct - a.change24hPct);
    case "losers":
      return sorted.sort((a, b) => a.change24hPct - b.change24hPct);
  }
}

export type CoinFilterOptions = { query: string; recentBuys: boolean };

export function filterCoins(
  coins: LiveCoin[],
  trades: TradeEvent[],
  opts: CoinFilterOptions,
): LiveCoin[] {
  let result = coins;
  const q = opts.query.trim().toLowerCase();
  if (q) {
    result = result.filter(
      (c) => c.ticker.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }
  if (opts.recentBuys) {
    const bought = new Set(trades.filter((t) => t.action === "Buy").map((t) => t.ticker));
    result = result.filter((c) => bought.has(c.ticker));
  }
  return result;
}
