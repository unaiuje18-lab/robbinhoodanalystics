/**
 * Binance kline (candle) fetcher and pure series transforms backing the
 * insights row. The public REST endpoint needs no key and allows browser
 * CORS — same host the live quote overlay already fetches (src/lib/quotes.ts).
 * Unlike the quote fetchers, failures here are surfaced to the UI as an
 * explicit "chart unavailable" state instead of being swallowed.
 */

export type ChartRange = "24h" | "30d" | "all";

/** One candle, reduced to what the charts need. `t` is the open time (ms). */
export type Kline = { t: number; close: number; quoteVolume: number };

export const CHART_RANGES: Record<ChartRange, { interval: string; limit: number }> = {
  "24h": { interval: "15m", limit: 96 },
  "30d": { interval: "4h", limit: 180 },
  all: { interval: "1d", limit: 1000 },
};

/** Parse Binance's array-of-arrays kline payload, dropping malformed rows. */
export function parseKlines(raw: unknown): Kline[] {
  if (!Array.isArray(raw)) return [];
  const klines: Kline[] = [];
  for (const row of raw) {
    if (!Array.isArray(row)) continue;
    const t = Number(row[0]);
    const close = Number(row[4]);
    const quoteVolume = Number(row[7]);
    if (!Number.isFinite(t) || !Number.isFinite(close) || close <= 0) continue;
    klines.push({ t, close, quoteVolume: Number.isFinite(quoteVolume) ? quoteVolume : 0 });
  }
  return klines;
}

/** Fetch the kline series for one Binance symbol over a chart range. */
export async function fetchKlines(
  symbol: string,
  range: ChartRange,
  signal?: AbortSignal,
): Promise<Kline[]> {
  const { interval, limit } = CHART_RANGES[range];
  const url =
    `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}` +
    `&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    ...(signal ? { signal } : {}),
  });
  if (!res.ok) throw new Error(`Binance klines ${res.status} for ${symbol}`);
  return parseKlines(await res.json());
}

export type PctPoint = { t: number; pct: number };

/** Cumulative % change from the range open: first point is always 0. */
export function toPctSeries(klines: Kline[]): PctPoint[] {
  const base = klines[0]?.close;
  if (base === undefined || base <= 0) return [];
  return klines.map((k) => ({ t: k.t, pct: (k.close / base - 1) * 100 }));
}

export type IndexPoint = { t: number; mcap: number; vol: number };

/**
 * Aggregate several coins into one index series: at each timestamp, market
 * cap = Σ supply × close and volume = Σ quote volume, counting only the
 * coins that have a candle at that t (young listings join as they list).
 * Coins with a missing/non-positive supply are skipped entirely.
 */
export function buildIndexSeries(
  klinesByTicker: Record<string, Kline[]>,
  supplyByTicker: Record<string, number>,
): IndexPoint[] {
  const candlesAt = new Map<number, IndexPoint>();
  let included = 0;
  for (const [ticker, klines] of Object.entries(klinesByTicker)) {
    const supply = supplyByTicker[ticker];
    if (supply === undefined || !Number.isFinite(supply) || supply <= 0) continue;
    included++;
    for (const k of klines) {
      const point = candlesAt.get(k.t) ?? { t: k.t, mcap: 0, vol: 0 };
      point.mcap += supply * k.close;
      point.vol += k.quoteVolume;
      candlesAt.set(k.t, point);
    }
  }
  if (included === 0) return [];
  return [...candlesAt.values()].sort((a, b) => a.t - b.t);
}

/** % change between the first and last points of a series ([] → null). */
export function rangeChangePct(values: number[]): number | null {
  const first = values[0];
  const last = values[values.length - 1];
  if (first === undefined || last === undefined || first <= 0) return null;
  return (last / first - 1) * 100;
}
