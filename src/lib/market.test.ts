import { describe, expect, it } from "vitest";
import {
  HISTORY_CAP,
  TRADES_CAP,
  filterCoins,
  isRefreshDue,
  seedMarket,
  sortCoins,
  stepMarket,
  topByEarnings,
  topByVolume,
  total24hVolume,
  totalCreatorEarnings,
  trendingScore,
} from "./market";

describe("seedMarket", () => {
  it("is deterministic — same state every call (SSR/first-paint safety)", () => {
    expect(seedMarket()).toEqual(seedMarket());
  });

  it("seeds creator earnings near the hero-number target", () => {
    const { coins } = seedMarket();
    expect(totalCreatorEarnings(coins)).toBeCloseTo(2_712_958, 0);
  });

  it("gives every coin a capped history ending at its current price", () => {
    for (const coin of seedMarket().coins) {
      expect(coin.history).toHaveLength(HISTORY_CAP);
      expect(coin.history[coin.history.length - 1]).toBeCloseTo(coin.priceUsd, 15);
      for (const p of coin.history) expect(p).toBeGreaterThan(0);
    }
  });

  it("derives change24hPct from open24hUsd", () => {
    for (const coin of seedMarket().coins) {
      expect((coin.priceUsd / coin.open24hUsd - 1) * 100).toBeCloseTo(coin.change24hPct, 9);
    }
  });
});

describe("stepMarket", () => {
  it("is pure — the previous state is untouched", () => {
    const prev = seedMarket();
    const snapshot = structuredClone(prev);
    stepMarket(prev);
    expect(prev).toEqual(snapshot);
  });

  it("advances the tick and the PRNG state", () => {
    const prev = seedMarket();
    const next = stepMarket(prev);
    expect(next.tickIndex).toBe(prev.tickIndex + 1);
    expect(next.rngState).not.toBe(prev.rngState);
  });

  it("keeps invariants over 200 ticks", () => {
    let state = seedMarket();
    for (let i = 0; i < 200; i++) state = stepMarket(state);

    expect(state.tickIndex).toBe(200);
    expect(state.trades.length).toBeLessThanOrEqual(TRADES_CAP);
    const ids = new Set(state.trades.map((t) => t.id));
    expect(ids.size).toBe(state.trades.length);

    for (const coin of state.coins) {
      expect(coin.priceUsd).toBeGreaterThan(0);
      expect(coin.history).toHaveLength(HISTORY_CAP);
      expect(coin.history[coin.history.length - 1]).toBeCloseTo(coin.priceUsd, 15);
      expect(coin.vol24hUsd).toBeGreaterThanOrEqual(0);
      expect((coin.priceUsd / coin.open24hUsd - 1) * 100).toBeCloseTo(coin.change24hPct, 9);
    }
  });

  it("never decreases a coin's creator earnings", () => {
    let state = seedMarket();
    const before = new Map(state.coins.map((c) => [c.ticker, c.earningsUsd]));
    state = stepMarket(state);
    for (const coin of state.coins) {
      const prevEarnings = before.get(coin.ticker);
      expect(prevEarnings).toBeDefined();
      expect(coin.earningsUsd).toBeGreaterThanOrEqual(prevEarnings!);
    }
  });

  it("reproduces the same sequence from the same starting state", () => {
    let a = seedMarket();
    let b = seedMarket();
    for (let i = 0; i < 25; i++) {
      a = stepMarket(a);
      b = stepMarket(b);
      expect(a).toEqual(b);
    }
  });
});

describe("sortCoins", () => {
  it("sorts by tab without mutating the input", () => {
    const coins = seedMarket().coins;
    const input = [...coins];

    const byMcap = sortCoins(coins, "top");
    for (let i = 1; i < byMcap.length; i++) {
      expect(byMcap[i - 1]!.mcapUsd).toBeGreaterThanOrEqual(byMcap[i]!.mcapUsd);
    }

    const gainers = sortCoins(coins, "gainers");
    for (let i = 1; i < gainers.length; i++) {
      expect(gainers[i - 1]!.change24hPct).toBeGreaterThanOrEqual(gainers[i]!.change24hPct);
    }

    const losers = sortCoins(coins, "losers");
    for (let i = 1; i < losers.length; i++) {
      expect(losers[i - 1]!.change24hPct).toBeLessThanOrEqual(losers[i]!.change24hPct);
    }

    const trending = sortCoins(coins, "trending");
    for (let i = 1; i < trending.length; i++) {
      expect(trendingScore(trending[i - 1]!)).toBeGreaterThanOrEqual(trendingScore(trending[i]!));
    }

    expect(coins).toEqual(input);
  });
});

describe("filterCoins", () => {
  const coins = seedMarket().coins;
  const first = coins[0]!;
  const second = coins[1]!;

  it("matches query against ticker and name, case-insensitively", () => {
    const byTicker = filterCoins(coins, [], {
      query: first.ticker.toLowerCase(),
      recentBuys: false,
    });
    expect(byTicker.some((c) => c.ticker === first.ticker)).toBe(true);

    const byName = filterCoins(coins, [], { query: first.name, recentBuys: false });
    expect(byName.some((c) => c.name === first.name)).toBe(true);

    const none = filterCoins(coins, [], { query: "zzzznotacoin", recentBuys: false });
    expect(none).toHaveLength(0);
  });

  it("ignores blank queries", () => {
    expect(filterCoins(coins, [], { query: "   ", recentBuys: false })).toHaveLength(coins.length);
  });

  it("recentBuys keeps only coins with Buy trades in the feed", () => {
    const trades = [
      {
        id: "t1",
        ticker: first.ticker,
        addr: "0xaaaa...bbbb",
        action: "Buy" as const,
        amountUsd: 10,
      },
      {
        id: "t2",
        ticker: second.ticker,
        addr: "0xcccc...dddd",
        action: "Sell" as const,
        amountUsd: 10,
      },
    ];
    const result = filterCoins(coins, trades, { query: "", recentBuys: true });
    expect(result.some((c) => c.ticker === first.ticker)).toBe(true);
    expect(result.some((c) => c.ticker === second.ticker)).toBe(false);
  });
});

describe("isRefreshDue", () => {
  const snapshot = seedMarket();

  it("holds positions until the refresh interval elapses", () => {
    expect(isRefreshDue(snapshot, { ...snapshot, tickIndex: snapshot.tickIndex + 1 }, 15)).toBe(
      false,
    );
    expect(isRefreshDue(snapshot, { ...snapshot, tickIndex: snapshot.tickIndex + 14 }, 15)).toBe(
      false,
    );
  });

  it("allows a re-rank once the interval elapses", () => {
    expect(isRefreshDue(snapshot, { ...snapshot, tickIndex: snapshot.tickIndex + 15 }, 15)).toBe(
      true,
    );
    expect(isRefreshDue(snapshot, { ...snapshot, tickIndex: snapshot.tickIndex + 40 }, 15)).toBe(
      true,
    );
  });
});

describe("selectors", () => {
  it("topByEarnings and topByVolume return descending slices", () => {
    const coins = seedMarket().coins;
    const earn = topByEarnings(coins, 4);
    expect(earn).toHaveLength(4);
    for (let i = 1; i < earn.length; i++) {
      expect(earn[i - 1]!.earningsUsd).toBeGreaterThanOrEqual(earn[i]!.earningsUsd);
    }

    const vol = topByVolume(coins, 3);
    expect(vol).toHaveLength(3);
    for (let i = 1; i < vol.length; i++) {
      expect(vol[i - 1]!.vol24hUsd).toBeGreaterThanOrEqual(vol[i]!.vol24hUsd);
    }

    expect(total24hVolume(coins)).toBeGreaterThan(0);
  });
});
