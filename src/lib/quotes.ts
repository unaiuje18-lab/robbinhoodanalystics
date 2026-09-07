import { coinSeeds } from "@/data/coins";
import type { Quote } from "@/lib/market";

/**
 * Client-side real-time quote fetchers (both APIs allow browser CORS).
 * - Memes: CoinGecko meme category — exact price, market cap, 24h change and
 *   volume for every seed; poll every ~60s (free-tier friendly).
 * - Binance overlay: one bulk 24h-ticker call covering every Binance-listed
 *   meme; fresher prices (~10s) but no market cap, so it only refreshes the
 *   price-sensitive fields.
 */
export async function fetchMemeQuotes(): Promise<Quote[]> {
  const quotes: Quote[] = [];
  for (const page of [1, 2]) {
    const url =
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=meme-token` +
      `&order=market_cap_desc&per_page=250&page=${page}&price_change_percentage=24h`;
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const rows = (await res.json()) as Array<{
        symbol?: string;
        current_price?: number;
        market_cap?: number | null;
        price_change_percentage_24h?: number | null;
        total_volume?: number | null;
      }>;
      for (const row of rows) {
        const ticker = (row.symbol ?? "").trim().toUpperCase();
        if (!ticker || row.current_price == null) continue;
        quotes.push({
          ticker,
          priceUsd: row.current_price,
          change24hPct: row.price_change_percentage_24h ?? null,
          vol24hUsd: row.total_volume ?? null,
          mcapUsd: row.market_cap ?? null,
        });
      }
    } catch {
      // network hiccup — the next poll retries
    }
  }
  return quotes;
}

export async function fetchBinanceQuotes(): Promise<Quote[]> {
  try {
    const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
      quoteVolume: string;
    }>;

    // Our seeds carry resolved Binance symbols ("BINANCE:DOGEUSDT").
    const tickerBySymbol = new Map<string, string>();
    for (const seed of coinSeeds) {
      if (seed.tvSymbol?.startsWith("BINANCE:")) {
        tickerBySymbol.set(seed.tvSymbol.slice("BINANCE:".length), seed.ticker);
      }
    }

    const quotes: Quote[] = [];
    for (const row of rows) {
      const ticker = tickerBySymbol.get(row.symbol);
      if (!ticker) continue;
      const price = Number(row.lastPrice);
      const change = Number(row.priceChangePercent);
      const volume = Number(row.quoteVolume);
      quotes.push({
        ticker,
        priceUsd: Number.isFinite(price) && price > 0 ? price : null,
        change24hPct: Number.isFinite(change) ? change : null,
        vol24hUsd: Number.isFinite(volume) && volume > 0 ? volume : null,
        mcapUsd: null, // Binance has no market cap — applyQuotes scales the last known one
      });
    }
    return quotes;
  } catch {
    return [];
  }
}
