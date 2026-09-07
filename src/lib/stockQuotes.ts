import { createServerFn } from "@tanstack/react-start";
import type { Quote } from "@/lib/market";
import { SCREENER_EXCHANGES, fetchScreenerRows, parseStockRow } from "@/lib/nasdaq";

let cache: { at: number; quotes: Quote[] } | null = null;
const TTL = 60_000;

/**
 * Real quotes for the top 500 US listings (Nasdaq screener: market cap, price,
 * day change, volume). Runs server-side only — the screener blocks browser
 * CORS — and caches for a minute so polling clients stay well under rate
 * limits.
 */
export const getStockQuotes = createServerFn({ method: "GET" }).handler(
  async (): Promise<Quote[]> => {
    if (cache && Date.now() - cache.at < TTL) return cache.quotes;
    const screeners = await Promise.all(
      SCREENER_EXCHANGES.map((exchange) => fetchScreenerRows(exchange).catch(() => [])),
    );
    const quotes: Quote[] = screeners
      .flat()
      .map(parseStockRow)
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.mcapUsd - a.mcapUsd)
      .slice(0, 500)
      .map((s) => ({
        ticker: s.ticker,
        priceUsd: s.priceUsd,
        change24hPct: s.change24hPct,
        vol24hUsd: s.vol24hUsd,
        mcapUsd: s.mcapUsd,
      }));
    if (quotes.length > 0) cache = { at: Date.now(), quotes };
    return quotes;
  },
);
