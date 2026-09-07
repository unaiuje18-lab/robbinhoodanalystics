import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { LiveMarketContext } from "@/hooks/useLiveMarket";
import { applyQuotes, seedMarket, stepMarket, type MarketState } from "@/lib/market";
import { fetchBinanceQuotes, fetchMemeQuotes } from "@/lib/quotes";
import { getStockQuotes } from "@/lib/stockQuotes";

const TAPE_TICK_MS = 2000;

/**
 * Owns the market state.
 *
 * - Real quotes arrive on a poll (React Query): CoinGecko for memes (~60s),
 *   Binance as a fast overlay for Binance-listed memes (~10s), and the
 *   Nasdaq screener via a server function for stocks (~60s, server-cached).
 *   Every poll folds into state through the pure applyQuotes.
 * - The 2s tick only advances the fictional meme tape and creator fees —
 *   it no longer invents prices.
 */
export function LiveMarketProvider({ children }: { children: ReactNode }) {
  const [market, setMarket] = useState<MarketState>(seedMarket);

  // Initial state is deterministic, so SSR and first paint agree; polling and
  // ticking are client-only effects.
  useEffect(() => {
    const id = setInterval(() => setMarket((prev) => stepMarket(prev)), TAPE_TICK_MS);
    return () => clearInterval(id);
  }, []);

  const memes = useQuery({
    queryKey: ["meme-quotes"],
    queryFn: fetchMemeQuotes,
    refetchInterval: 60_000,
    staleTime: 45_000,
  });
  const binance = useQuery({
    queryKey: ["binance-quotes"],
    queryFn: fetchBinanceQuotes,
    refetchInterval: 10_000,
    staleTime: 8_000,
  });
  const stocks = useQuery({
    queryKey: ["stock-quotes"],
    queryFn: getStockQuotes,
    refetchInterval: 60_000,
    staleTime: 45_000,
  });

  useEffect(() => {
    if (memes.data) setMarket((prev) => applyQuotes(prev, memes.data!));
  }, [memes.data]);
  useEffect(() => {
    if (binance.data) setMarket((prev) => applyQuotes(prev, binance.data!));
  }, [binance.data]);
  useEffect(() => {
    if (stocks.data) setMarket((prev) => applyQuotes(prev, stocks.data!));
  }, [stocks.data]);

  return <LiveMarketContext.Provider value={market}>{children}</LiveMarketContext.Provider>;
}
