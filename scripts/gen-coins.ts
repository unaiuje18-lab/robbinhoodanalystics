/**
 * Generates src/data/coins.ts — the meme-coin universe.
 *
 * Usage:
 *   bun run gen:coins                 # top 250 from CoinGecko's meme category
 *   bun scripts/gen-coins.ts <file>   # .txt (CSV/TSV/pipe/markdown table) or
 *                                     # .json (CoinGecko /coins/markets shape)
 *
 * Expected .txt columns: symbol/ticker, name, price, market cap, 24h change (%),
 * 24h volume, optionally image/logo. With a header row, columns are matched by
 * name in any order; without one, that order is assumed. $ , % and thousands
 * separators are stripped.
 *
 * Every coin gets its TradingView symbol resolved (curated overrides first,
 * then TradingView symbol search) so detail pages can show real candlesticks;
 * unresolved coins fall back to the simulated chart.
 */
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { tvSymbolsByTicker } from "../src/data/tvSymbols";
import { hashStr } from "../src/lib/random";
import { mapPool, resolveTvSymbol } from "./tv-search";

const MAX_COINS = 250;
const SUPPLY = 1_000_000_000; // fallback supply used to derive price/mcap when one is missing
const TV_CONCURRENCY = 6;

type Row = {
  ticker: string;
  name: string;
  priceUsd: number;
  mcapUsd: number;
  change24hPct: number;
  vol24hUsd: number;
  image: string | null;
  tvSymbol: string | null;
};

function parseNum(raw: string): number | null {
  const cleaned = raw.replace(/[$,%\s]/g, "");
  if (!cleaned || !/^-?\d+(\.\d+)?([eE]\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function splitLine(line: string, delim: string): string[] {
  if (delim === ",") return splitCsv(line);
  return line.split(delim);
}

function detectDelim(line: string): string {
  if (line.includes("|")) return "|";
  if (line.includes("\t")) return "\t";
  if (line.includes(",")) return ",";
  return "\t"; // single-column lines still "split"
}

type Columns = {
  ticker: number;
  name: number;
  price: number;
  mcap: number;
  change: number;
  volume: number;
  image: number;
};

const DEFAULT_COLUMNS: Columns = {
  ticker: 0,
  name: 1,
  price: 2,
  mcap: 3,
  change: 4,
  volume: 5,
  image: -1,
};

function matchHeader(cells: string[]): Columns | null {
  if (cells.some((c) => parseNum(c) !== null)) return null; // headers have no numbers
  const find = (re: RegExp, exclude?: RegExp) =>
    cells.findIndex((c, i) => re.test(c) && i === cells.indexOf(c) && !(exclude?.test(c) ?? false));
  const cols: Columns = {
    ticker: find(/^(sym|symbol|ticker)$/i),
    name: find(/^(name|coin)$/i),
    price: find(/price/i, /market|cap|24h|vol/i),
    mcap: find(/market\s*cap|mcap|marketcap/i),
    change: find(/change|24h\s*%/i, /vol/i),
    volume: find(/vol/i, /market|cap/i),
    image: find(/^(image|logo|img)$/i),
  };
  if (cols.ticker === -1 || cols.name === -1) return null;
  return cols;
}

function isSeparatorRow(cells: string[]): boolean {
  return cells.length > 0 && cells.every((c) => /^[\s|:-]*$/.test(c));
}

function parseTxt(content: string): Row[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  let columns = DEFAULT_COLUMNS;
  const rows: Row[] = [];

  for (const line of lines) {
    const delim = detectDelim(line);
    const cells = splitLine(line, delim).map((c) => c.trim());
    if (isSeparatorRow(cells)) continue;

    const header = matchHeader(cells);
    if (header) {
      columns = header;
      continue;
    }

    const cell = (col: number): string => cells[col] ?? "";
    const ticker = cell(columns.ticker).replace(/^\$/, "").toUpperCase();
    const name = cell(columns.name);
    if (!ticker || !name) continue;

    let priceUsd = parseNum(cell(columns.price));
    let mcapUsd = parseNum(cell(columns.mcap));
    const change24hPct = parseNum(cell(columns.change)) ?? 0;
    let vol24hUsd = parseNum(cell(columns.volume));
    const image = columns.image >= 0 ? cell(columns.image) || null : null;

    if (priceUsd === null && mcapUsd !== null) priceUsd = mcapUsd / SUPPLY;
    if (mcapUsd === null && priceUsd !== null) mcapUsd = priceUsd * SUPPLY;
    if (vol24hUsd === null && mcapUsd !== null) vol24hUsd = mcapUsd * 0.02;
    if (priceUsd === null || mcapUsd === null) continue;

    rows.push({ ticker, name, priceUsd, mcapUsd, change24hPct, vol24hUsd, image, tvSymbol: null });
  }

  if (rows.length === 0) {
    console.error(
      "No parseable rows in input. Expected columns: symbol, name, price, market cap, 24h change, 24h volume[, image]\n" +
        "(CSV, TSV, pipe-separated or a markdown table — with or without a header row).",
    );
    process.exit(1);
  }
  return rows;
}

type GeckoCoin = {
  symbol?: string;
  name?: string;
  image?: string | null;
  current_price?: number;
  market_cap?: number;
  price_change_percentage_24h?: number | null;
  total_volume?: number | null;
};

function parseJson(content: string): Row[] {
  const parsed = JSON.parse(content) as GeckoCoin[];
  if (!Array.isArray(parsed)) {
    console.error("JSON input must be an array of coins (CoinGecko /coins/markets shape).");
    process.exit(1);
  }
  const rows: Row[] = [];
  for (const c of parsed) {
    const ticker = (c.symbol ?? "").trim().toUpperCase();
    const name = (c.name ?? "").trim();
    const priceUsd = c.current_price ?? 0;
    const mcapUsd = c.market_cap ?? priceUsd * SUPPLY;
    if (!ticker || !name) continue;
    rows.push({
      ticker,
      name,
      priceUsd,
      mcapUsd,
      change24hPct: c.price_change_percentage_24h ?? 0,
      vol24hUsd: c.total_volume ?? mcapUsd * 0.02,
      image: typeof c.image === "string" && c.image ? c.image : null,
      tvSymbol: null,
    });
  }
  if (rows.length === 0) {
    console.error("JSON input contained no coins with symbol+name.");
    process.exit(1);
  }
  return rows;
}

/** The whole meme category from CoinGecko, two pages of 250. */
async function fetchMemeRows(): Promise<Row[]> {
  const rows: Row[] = [];
  for (const page of [1, 2]) {
    const url =
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=meme-token` +
      `&order=market_cap_desc&per_page=250&page=${page}&price_change_percentage=24h`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.error(`CoinGecko page ${page}: HTTP ${res.status} — skipped.`);
      continue;
    }
    rows.push(...parseJson(await res.text()));
  }
  return rows;
}

function dedupeAndCap(rows: Row[], cap: number): Row[] {
  const seen = new Set<string>();
  const unique = rows.filter((r) => {
    if (seen.has(r.ticker)) return false;
    seen.add(r.ticker);
    return true;
  });
  return unique.sort((a, b) => b.mcapUsd - a.mcapUsd).slice(0, cap);
}

async function resolveTvSymbols(rows: Row[]): Promise<Row[]> {
  const curated = rows.filter((r) => tvSymbolsByTicker[r.ticker]);
  const needSearch = rows.filter((r) => !tvSymbolsByTicker[r.ticker]);
  const resolved = await mapPool(needSearch, TV_CONCURRENCY, async (row) => ({
    ticker: row.ticker,
    tvSymbol: await resolveTvSymbol("crypto", row.ticker, row.name),
  }));
  const byTicker = new Map(resolved.map((r) => [r.ticker, r.tvSymbol] as const));
  const found = resolved.filter((r) => r.tvSymbol !== null).length;
  console.log(
    `TradingView symbols: ${curated.length} curated + ${found}/${needSearch.length} searched` +
      ` (${rows.length - curated.length - found} unresolved → simulated chart)`,
  );
  return rows.map((r) => ({
    ...r,
    tvSymbol: tvSymbolsByTicker[r.ticker] ?? byTicker.get(r.ticker) ?? null,
  }));
}

const inputArg = process.argv[2];
let parsed: Row[];
if (inputArg) {
  const content = readFileSync(inputArg, "utf8");
  parsed = dedupeAndCap(
    inputArg.endsWith(".json") ? parseJson(content) : parseTxt(content),
    MAX_COINS,
  );
} else {
  parsed = dedupeAndCap(await fetchMemeRows(), MAX_COINS);
}
const rows = await resolveTvSymbols(parsed);

const out: string[] = [];
out.push(
  "// AUTO-GENERATED by `bun run gen:coins` (CoinGecko meme category or a provided list) — do not edit by hand.",
);
out.push("// Regenerate: bun run gen:coins (or pass a .txt/.json file as an argument).");
out.push("");
out.push("export type CoinSeed = {");
out.push("  ticker: string;");
out.push("  name: string;");
out.push("  priceUsd: number;");
out.push("  mcapUsd: number;");
out.push("  change24hPct: number;");
out.push("  vol24hUsd: number;");
out.push("  image: string | null;");
out.push("  tvSymbol: string | null;");
out.push("  hue: number;");
out.push("  hue2: number;");
out.push("};");
out.push("");
out.push("export const coinSeeds: CoinSeed[] = [");
for (const r of rows) {
  const hue = hashStr(r.ticker) % 360;
  const hue2 = (hue + 40 + (hashStr(r.name) % 40)) % 360;
  out.push(
    `  { ticker: ${JSON.stringify(r.ticker)}, name: ${JSON.stringify(r.name)}, ` +
      `priceUsd: ${r.priceUsd}, mcapUsd: ${r.mcapUsd}, change24hPct: ${r.change24hPct}, ` +
      `vol24hUsd: ${r.vol24hUsd}, image: ${JSON.stringify(r.image)}, ` +
      `tvSymbol: ${JSON.stringify(r.tvSymbol)}, hue: ${hue}, hue2: ${hue2} },`,
  );
}
out.push("];");
out.push("");

const outPath = fileURLToPath(new URL("../src/data/coins.ts", import.meta.url));
writeFileSync(outPath, out.join("\n"));
console.log(`Parsed ${rows.length} coins → src/data/coins.ts`);
