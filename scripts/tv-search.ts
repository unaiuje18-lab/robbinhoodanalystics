/**
 * Shared TradingView symbol-search resolver for the generators.
 * Uses TradingView's public symbol-search endpoint (the one their own widget
 * uses) with no key.
 *
 * Crypto mode prefers spot listings on major exchanges with USDT/USD quotes.
 * Stock mode is strict on purpose: exact symbol match on a US exchange only,
 * accepting "stock" and "dr" (depositary receipt / ADR) types — anything else
 * returns null rather than risk charting a wrong company.
 */

const CRYPTO_EXCHANGE_PRIORITY = [
  "BINANCE",
  "COINBASE",
  "KRAKEN",
  "BYBIT",
  "OKX",
  "GATEIO",
  "GATE",
  "KUCOIN",
  "BITGET",
  "MEXC",
  "HTX",
];

const STOCK_EXCHANGES = ["NASDAQ", "NYSE", "AMEX", "NYSEAMERICAN"];

export type TvMarket = "crypto" | "stock";

type TvSearchHit = { exchange?: string; symbol?: string; description?: string; type?: string };

function stripEm(s: string): string {
  return s.replace(/<\/?em>/g, "");
}

async function search(query: string, exchange?: string): Promise<TvSearchHit[]> {
  const url =
    `https://symbol-search.tradingview.com/symbol_search/?text=${encodeURIComponent(query)}` +
    `&hl=1&lang=en&domain=production` +
    (exchange ? `&exchange=${encodeURIComponent(exchange)}` : "");
  const res = await fetch(url, { headers: { Origin: "https://www.tradingview.com" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as TvSearchHit[];
}

async function resolveCrypto(ticker: string, name?: string): Promise<string | null> {
  const queries = [ticker, ...(name ? [name] : [])];
  for (const query of queries) {
    try {
      const hits = await search(query);
      const wanted = ticker.toUpperCase();
      const wantedName = (name ?? "").replace(/<[^>]*>/g, "").toUpperCase();
      const matches = hits
        .filter((h) => typeof h.exchange === "string" && typeof h.symbol === "string")
        .filter((h) => {
          const symbolUpper = stripEm(h.symbol!).toUpperCase();
          const descriptionUpper = stripEm(h.description ?? "").toUpperCase();
          const baseMatch =
            symbolUpper.startsWith(wanted) ||
            (wantedName.length >= 3 && descriptionUpper.includes(wantedName));
          if (!baseMatch) return false;
          return h.type === "spot" || h.type === "swap";
        });
      if (matches.length === 0) continue;

      const score = (h: TvSearchHit): number => {
        const exchangeRank = CRYPTO_EXCHANGE_PRIORITY.indexOf(h.exchange!.toUpperCase());
        const exchangeScore = exchangeRank === -1 ? CRYPTO_EXCHANGE_PRIORITY.length : exchangeRank;
        const symbolUpper = stripEm(h.symbol!).toUpperCase();
        const exactBase = symbolUpper.startsWith(wanted) ? 0 : 1;
        const quoteScore = symbolUpper.endsWith("USDT") || symbolUpper.endsWith("USD") ? 0 : 1;
        const typeScore = h.type === "swap" ? 1 : 0;
        return exchangeScore * 8 + exactBase * 4 + quoteScore * 2 + typeScore;
      };
      const best = matches.reduce((a, b) => (score(b) < score(a) ? b : a));
      return `${stripEm(best.exchange!).toUpperCase()}:${stripEm(best.symbol!).toUpperCase()}`;
    } catch {
      continue;
    }
  }
  return null;
}

async function resolveStock(ticker: string): Promise<string | null> {
  const wanted = ticker.toUpperCase();
  const accept = (h: TvSearchHit): string | null => {
    if (typeof h.exchange !== "string" || typeof h.symbol !== "string") return null;
    const exchange = h.exchange.toUpperCase();
    if (!STOCK_EXCHANGES.includes(exchange)) return null;
    if (h.type !== "stock" && h.type !== "dr") return null;
    const symbol = stripEm(h.symbol).toUpperCase();
    if (symbol !== wanted) return null; // exact match only — never a wrong company
    return `${exchange}:${symbol}`;
  };

  // Pass 1: plain search for an exact US hit.
  try {
    const hits = await search(wanted);
    for (const h of hits) {
      const resolved = accept(h);
      if (resolved) return resolved;
    }
  } catch {
    // fall through to the per-exchange passes
  }

  // Pass 2: filtered search on each US exchange.
  for (const exchange of STOCK_EXCHANGES) {
    try {
      const hits = await search(wanted, exchange);
      for (const h of hits) {
        const resolved = accept(h);
        if (resolved) return resolved;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function resolveTvSymbol(
  market: TvMarket,
  ticker: string,
  name?: string,
): Promise<string | null> {
  return market === "stock" ? resolveStock(ticker) : resolveCrypto(ticker, name);
}

export async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!);
    }
  }
  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}
