import { keepPreviousData, useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { tvSymbolsByTicker } from "@/data/tvSymbols";
import {
  buildIndexSeries,
  fetchKlines,
  rangeChangePct,
  toPctSeries,
  type ChartRange,
  type IndexPoint,
  type Kline,
  type PctPoint,
} from "@/lib/klines";
import type { LiveCoin } from "@/lib/market";
import { useMarketSnapshot } from "@/hooks/useLiveMarket";

/**
 * The Binance-listed memes — the only coins with a free history source. A
 * module-level constant: queries hang off this fixed list so hook order is
 * static; the snapshot only contributes prices, caps and 24h changes.
 */
const BINANCE_MEMES: { ticker: string; symbol: string }[] = Object.entries(tvSymbolsByTicker)
  .filter(([, tv]) => tv.startsWith("BINANCE:"))
  .map(([ticker, tv]) => ({ ticker, symbol: tv.slice("BINANCE:".length) }));

/** How fresh a cached kline series must be considered, per range. */
const STALE_MS: Record<ChartRange, number> = { "24h": 60_000, "30d": 600_000, all: 600_000 };
/** The 24h chart keeps inching forward; longer ranges barely move. */
const REFETCH_MS: Record<ChartRange, number | false> = { "24h": 60_000, "30d": false, all: false };

function klinesQueryOptions(symbol: string, range: ChartRange) {
  return {
    queryKey: ["klines", symbol, range] as const,
    queryFn: ({ signal }: { signal: AbortSignal }) => fetchKlines(symbol, range, signal),
    staleTime: STALE_MS[range],
    refetchInterval: REFETCH_MS[range],
    placeholderData: keepPreviousData,
    retry: 1,
  };
}

type KlinesForRange = {
  /** ticker → klines for every symbol that returned usable candles. */
  byTicker: Map<string, Kline[]>;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

/**
 * Klines for the whole Binance meme universe, pooled under one loading /
 * error surface. Partial failures degrade quietly (fewer coins in the
 * panel); only a total failure flips the error state.
 */
function useMemeKlines(range: ChartRange): KlinesForRange {
  // useQueries is the hook-count-safe way to fan out over the fixed universe.
  const results = useQueries({
    queries: BINANCE_MEMES.map(({ symbol }) => klinesQueryOptions(symbol, range)),
  });
  const byTicker = new Map<string, Kline[]>();
  let isLoading = false;
  let failed = 0;
  results.forEach((query, i) => {
    if (query.isPending) isLoading = true;
    if (query.isError) failed++;
    if (query.data && query.data.length > 0)
      byTicker.set(BINANCE_MEMES[i]?.ticker ?? "", query.data);
  });
  const refetch = () => results.forEach((query) => void query.refetch());
  return { byTicker, isLoading, isError: !isLoading && failed === BINANCE_MEMES.length, refetch };
}

export type GainerSeries = { coin: LiveCoin; points: PctPoint[]; lastPct: number };

/** Top gainers panel: the 3 strongest Binance memes with their % series. */
export function useGainersChart(range: ChartRange): {
  entries: GainerSeries[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const { market } = useMarketSnapshot();
  const { byTicker: klinesByTicker, isLoading, isError, refetch } = useMemeKlines(range);

  return useMemo(() => {
    const byTicker = new Map(market.coins.map((c) => [c.ticker, c] as const));
    const entries: GainerSeries[] = [];
    for (const { ticker } of BINANCE_MEMES) {
      const coin = byTicker.get(ticker);
      const klines = klinesByTicker.get(ticker);
      if (!coin || !klines || klines.length === 0) continue;
      const points = toPctSeries(klines);
      const lastPct = rangeChangePct(klines.map((k) => k.close));
      if (points.length > 0 && lastPct !== null) entries.push({ coin, points, lastPct });
    }
    entries.sort((a, b) => b.coin.change24hPct - a.coin.change24hPct);
    return { entries: entries.slice(0, 3), isLoading, isError, refetch };
  }, [market, klinesByTicker, isLoading, isError, refetch]);
}

export type IndexStats = {
  series: IndexPoint[];
  mcapUsd: number | null;
  volUsd: number | null;
  mcapChangePct: number | null;
  volChangePct: number | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

/** Market-cap panel: supply-weighted index over every Binance-listed meme. */
export function useMarketCapIndex(range: ChartRange): IndexStats {
  const { market } = useMarketSnapshot();
  const { byTicker: klinesByTicker, isLoading, isError, refetch } = useMemeKlines(range);

  return useMemo(() => {
    const byTicker = new Map(market.coins.map((c) => [c.ticker, c] as const));
    // Implied supply from the snapshot — the same ratio trick applyQuotes
    // uses to carry market caps across price-only Binance quotes.
    const supplies: Record<string, number> = {};
    for (const { ticker } of BINANCE_MEMES) {
      const coin = byTicker.get(ticker);
      if (coin && coin.priceUsd > 0) supplies[ticker] = coin.mcapUsd / coin.priceUsd;
    }
    const series = buildIndexSeries(Object.fromEntries(klinesByTicker), supplies);
    const last = series[series.length - 1];
    return {
      series,
      mcapUsd: last?.mcap ?? null,
      volUsd: last?.vol ?? null,
      mcapChangePct: rangeChangePct(series.map((p) => p.mcap)),
      volChangePct: rangeChangePct(series.map((p) => p.vol)),
      isLoading,
      isError,
      refetch,
    };
  }, [market, klinesByTicker, isLoading, isError, refetch]);
}
