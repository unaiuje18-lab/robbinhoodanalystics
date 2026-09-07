/**
 * Nasdaq's public screener download — real market caps for US listings, no key.
 * Shared by gen-stocks and the stock-quotes server function.
 */

export type ScreenerRow = {
  symbol?: string;
  name?: string;
  lastsale?: string;
  pctchange?: string;
  volume?: string;
  marketCap?: string;
};

export type ParsedStock = {
  ticker: string;
  name: string;
  priceUsd: number;
  mcapUsd: number;
  change24hPct: number;
  vol24hUsd: number;
};

export const SCREENER_EXCHANGES = ["nasdaq", "nyse", "amex"];

export async function fetchScreenerRows(exchange: string): Promise<ScreenerRow[]> {
  const url =
    `https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=25&download=true` +
    `&exchange=${exchange}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`${exchange}: HTTP ${res.status}`);
  const json = (await res.json()) as { data?: { rows?: ScreenerRow[] } };
  return json.data?.rows ?? [];
}

function parseNum(s: string | undefined): number {
  const n = Number((s ?? "").replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** The screener writes class shares as "BRK/A"; normalize to "BRK.A". */
export function parseStockRow(r: ScreenerRow): ParsedStock | null {
  const ticker = (r.symbol ?? "").trim().toUpperCase().replace("/", ".");
  const name = (r.name ?? "").trim();
  const priceUsd = parseNum(r.lastsale);
  const mcapUsd = Math.round(parseNum(r.marketCap));
  if (!ticker || !name || priceUsd <= 0 || mcapUsd <= 0) return null;
  return {
    ticker,
    name,
    priceUsd,
    mcapUsd,
    change24hPct: Math.round(parseNum(r.pctchange) * 100) / 100,
    vol24hUsd: Math.round(parseNum(r.volume) * priceUsd),
  };
}
