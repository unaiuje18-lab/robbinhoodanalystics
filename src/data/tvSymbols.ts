/**
 * TradingView symbols for the major meme coins that trade on Binance — these
 * get real candlestick charts on their detail pages. Anything not listed here
 * (obscure coins, or whatever the user's pasted list contains) keeps the
 * live simulated chart. Keyed by our seed ticker.
 */
export const tvSymbolsByTicker: Record<string, string> = {
  DOGE: "BINANCE:DOGEUSDT",
  SHIB: "BINANCE:SHIBUSDT",
  PEPE: "BINANCE:PEPEUSDT",
  TRUMP: "BINANCE:TRUMPUSDT",
  PENGU: "BINANCE:PENGUUSDT",
  PUMP: "BINANCE:PUMPUSDT",
  WIF: "BINANCE:WIFUSDT",
  FLOKI: "BINANCE:FLOKIUSDT",
  BONK: "BINANCE:BONKUSDT",
  POPCAT: "BINANCE:POPCATUSDT",
};
