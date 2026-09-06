import { coinSeeds } from "@/data/coins";
import { hashStr, mulberry32, type Rng } from "@/lib/random";

export const HISTORY_CAP = 120;
export const TRADES_CAP = 40;
export const CREATOR_FEE_RATE = 0.01;

/** What the hero "Total creator earnings" stat starts at — earned fees accrue on top. */
const TOTAL_EARNINGS_TARGET = 2_712_958;
const TRADE_PROBABILITY = 0.65;
const SECOND_TRADE_PROBABILITY = 0.25;
const JUMP_PROBABILITY = 0.02;
const BUY_PROBABILITY = 0.62;
/** A trade moves price proportionally to amount/mcap; scaled and capped. */
const TRADE_IMPACT_SCALE = 40;
const TRADE_IMPACT_CAP = 5;
/** Per-tick volume decay keeps 24h volume bounded in a forever-running sim. */
const VOLUME_DECAY = 0.9985;

export type LiveCoin = {
  ticker: string;
  name: string;
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
};

export type MarketTab = "trending" | "top" | "gainers" | "losers";

/** Approximate standard normal via 3 uniforms (Irwin–Hall), range [-1.5, 1.5]. */
function gauss(rng: Rng): number {
  return rng.next() + rng.next() + rng.next() - 1.5;
}

/** Per-tick volatility band for a coin: 0.3% – 1.5%. */
function volFor(ticker: string): number {
  return 0.003 + ((hashStr(ticker) % 100) / 100) * 0.012;
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
  const totalMcap = coinSeeds.reduce((sum, c) => sum + c.mcapUsd, 0);
  const earningsScale = totalMcap > 0 ? TOTAL_EARNINGS_TARGET / totalMcap : 0;

  const coins: LiveCoin[] = coinSeeds.map((seedCoin) => {
    const open24hUsd = seedCoin.priceUsd / (1 + seedCoin.change24hPct / 100);
    // Walk backwards from today's price so history ends exactly at it.
    const history = new Array<number>(HISTORY_CAP);
    history[HISTORY_CAP - 1] = seedCoin.priceUsd;
    let p = seedCoin.priceUsd;
    const vol = volFor(seedCoin.ticker);
    for (let i = HISTORY_CAP - 2; i >= 0; i--) {
      p = Math.max(p / (1 + gauss(rng) * vol), 1e-12);
      history[i] = p;
    }
    return withDerivedChange({
      ticker: seedCoin.ticker,
      name: seedCoin.name,
      priceUsd: seedCoin.priceUsd,
      open24hUsd,
      mcapUsd: seedCoin.mcapUsd,
      vol24hUsd: seedCoin.vol24hUsd,
      earningsUsd: seedCoin.mcapUsd * earningsScale,
      change24hPct: seedCoin.change24hPct,
      history,
      lastDeltaPct: 0,
      image: seedCoin.image,
      hue: seedCoin.hue,
      hue2: seedCoin.hue2,
    });
  });

  const trades: TradeEvent[] = [];
  for (let i = 0; i < 14; i++) {
    const coin = coins[Math.floor(rng.next() * coins.length)];
    if (!coin) continue;
    trades.push({
      id: `seed-${i}`,
      ticker: coin.ticker,
      addr: fakeAddr(rng),
      action: rng.next() < BUY_PROBABILITY ? "Buy" : "Sell",
      amountUsd: tradeAmount(rng),
    });
  }

  return { tickIndex: 0, rngState: rng.state(), coins, trades };
}

function makeTradeSpec(
  rng: Rng,
  coinCount: number,
): { coinIndex: number; action: TradeAction; amountUsd: number } {
  return {
    coinIndex: Math.floor(rng.next() * coinCount),
    action: rng.next() < BUY_PROBABILITY ? "Buy" : "Sell",
    amountUsd: tradeAmount(rng),
  };
}

function impactPctOf(amountUsd: number, mcapUsd: number, action: TradeAction): number {
  if (mcapUsd <= 0) return 0;
  const capped = Math.min((amountUsd / mcapUsd) * TRADE_IMPACT_SCALE, TRADE_IMPACT_CAP);
  return action === "Buy" ? capped : -capped;
}

/**
 * Advance the market one tick. Pure: same input state → same output state.
 * Trade decisions are drawn first so their price impact folds into this tick.
 */
export function stepMarket(prev: MarketState): MarketState {
  const rng = mulberry32(prev.rngState);

  const specs = [] as { coinIndex: number; action: TradeAction; amountUsd: number }[];
  if (prev.coins.length > 0 && rng.next() < TRADE_PROBABILITY) {
    specs.push(makeTradeSpec(rng, prev.coins.length));
    if (rng.next() < SECOND_TRADE_PROBABILITY) specs.push(makeTradeSpec(rng, prev.coins.length));
  }

  const impactByIndex = new Map<number, number>();
  for (const spec of specs) {
    const coin = prev.coins[spec.coinIndex];
    if (!coin) continue;
    impactByIndex.set(
      spec.coinIndex,
      (impactByIndex.get(spec.coinIndex) ?? 0) +
        impactPctOf(spec.amountUsd, coin.mcapUsd, spec.action),
    );
  }

  const coins = prev.coins.map((coin, i) => {
    let deltaPct = gauss(rng) * volFor(coin.ticker) * 100;
    if (rng.next() < JUMP_PROBABILITY) {
      deltaPct += (rng.next() < 0.5 ? -1 : 1) * (1 + rng.next() * 5);
    }
    const impact = impactByIndex.get(i);
    if (impact !== undefined) deltaPct += impact;

    const priceUsd = Math.max(coin.priceUsd * (1 + deltaPct / 100), 1e-12);
    const mcapUsd = Math.max(coin.mcapUsd * (1 + deltaPct / 100), 0);
    const history = [...coin.history.slice(-(HISTORY_CAP - 1)), priceUsd];

    return withDerivedChange({
      ...coin,
      priceUsd,
      mcapUsd,
      history,
      lastDeltaPct: deltaPct,
    });
  });

  // Fold trade effects (volume, creator fees) into the coins that were traded.
  for (const spec of specs) {
    const coin = coins[spec.coinIndex];
    if (!coin) continue;
    coin.vol24hUsd = coin.vol24hUsd * VOLUME_DECAY + spec.amountUsd;
    coin.earningsUsd += spec.amountUsd * CREATOR_FEE_RATE;
  }
  // Untraded coins still decay volume so it stays bounded.
  const traded = new Set(specs.map((s) => s.coinIndex));
  for (let i = 0; i < coins.length; i++) {
    if (!traded.has(i)) {
      const coin = coins[i];
      if (coin) coin.vol24hUsd = coin.vol24hUsd * VOLUME_DECAY;
    }
  }

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
  };
}

export function totalCreatorEarnings(coins: LiveCoin[]): number {
  return coins.reduce((sum, c) => sum + c.earningsUsd, 0);
}

export function total24hVolume(coins: LiveCoin[]): number {
  return coins.reduce((sum, c) => sum + c.vol24hUsd, 0);
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
