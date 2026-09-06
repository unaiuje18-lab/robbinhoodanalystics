/**
 * The stock universe: the S&P 100 mega caps (with GOOGL standing in for both
 * Alphabet share classes → exactly 100 names).
 *
 * - `exchange` builds the TradingView symbol (e.g. NASDAQ:AAPL) for the
 *   real candlestick chart on detail pages.
 * - `domain` feeds the logo lookup (Google favicon service).
 * - `sharesB` is shares outstanding in billions, from public filings —
 *   approximate (buybacks/issuance drift a few % per quarter). Market cap is
 *   computed at generation time as real price × sharesB, so mcaps stay
 *   realistic even as prices move.
 * - `altTickers` are tried in order if the primary ticker is unknown to the
 *   quote source (e.g. BNY was BK until its 2025 rebrand).
 */
export type UniverseEntry = {
  ticker: string;
  exchange: "NASDAQ" | "NYSE";
  domain: string;
  sharesB: number;
  altTickers?: string[];
};

export const universe: UniverseEntry[] = [
  { ticker: "AAPL", exchange: "NASDAQ", domain: "apple.com", sharesB: 14.9 },
  { ticker: "ABBV", exchange: "NYSE", domain: "abbvie.com", sharesB: 1.77 },
  { ticker: "ABT", exchange: "NYSE", domain: "abbott.com", sharesB: 1.74 },
  { ticker: "ACN", exchange: "NYSE", domain: "accenture.com", sharesB: 1.57 },
  { ticker: "ADBE", exchange: "NASDAQ", domain: "adobe.com", sharesB: 0.44 },
  { ticker: "AMAT", exchange: "NASDAQ", domain: "appliedmaterials.com", sharesB: 0.81 },
  { ticker: "AMD", exchange: "NASDAQ", domain: "amd.com", sharesB: 1.62 },
  { ticker: "AMGN", exchange: "NASDAQ", domain: "amgen.com", sharesB: 0.54 },
  { ticker: "AMT", exchange: "NYSE", domain: "americantower.com", sharesB: 0.467 },
  { ticker: "AMZN", exchange: "NASDAQ", domain: "amazon.com", sharesB: 10.6 },
  { ticker: "AVGO", exchange: "NASDAQ", domain: "broadcom.com", sharesB: 4.68 },
  { ticker: "AXP", exchange: "NYSE", domain: "americanexpress.com", sharesB: 0.7 },
  { ticker: "BA", exchange: "NYSE", domain: "boeing.com", sharesB: 0.75 },
  { ticker: "BAC", exchange: "NYSE", domain: "bankofamerica.com", sharesB: 7.6 },
  { ticker: "BKNG", exchange: "NASDAQ", domain: "booking.com", sharesB: 0.0327 },
  { ticker: "BLK", exchange: "NYSE", domain: "blackrock.com", sharesB: 0.148 },
  { ticker: "BMY", exchange: "NYSE", domain: "bms.com", sharesB: 2.0 },
  { ticker: "BNY", exchange: "NYSE", domain: "bny.com", sharesB: 0.72, altTickers: ["BK"] },
  { ticker: "BRK.B", exchange: "NYSE", domain: "berkshirehathaway.com", sharesB: 2.17 },
  { ticker: "C", exchange: "NYSE", domain: "citigroup.com", sharesB: 1.87 },
  { ticker: "CAT", exchange: "NYSE", domain: "caterpillar.com", sharesB: 0.47 },
  { ticker: "CL", exchange: "NYSE", domain: "colgate.com", sharesB: 0.81 },
  { ticker: "CMCSA", exchange: "NASDAQ", domain: "comcast.com", sharesB: 3.7 },
  { ticker: "COF", exchange: "NYSE", domain: "capitalone.com", sharesB: 0.383 },
  { ticker: "COP", exchange: "NYSE", domain: "conocophillips.com", sharesB: 1.24 },
  { ticker: "COST", exchange: "NASDAQ", domain: "costco.com", sharesB: 0.444 },
  { ticker: "CRM", exchange: "NYSE", domain: "salesforce.com", sharesB: 0.956 },
  { ticker: "CSCO", exchange: "NASDAQ", domain: "cisco.com", sharesB: 3.95 },
  { ticker: "CVS", exchange: "NYSE", domain: "cvscaremark.com", sharesB: 1.26 },
  { ticker: "CVX", exchange: "NYSE", domain: "chevron.com", sharesB: 1.75 },
  { ticker: "DE", exchange: "NYSE", domain: "deere.com", sharesB: 0.272 },
  { ticker: "DHR", exchange: "NYSE", domain: "danaher.com", sharesB: 0.73 },
  { ticker: "DIS", exchange: "NYSE", domain: "thewaltdisneycompany.com", sharesB: 1.81 },
  { ticker: "DUK", exchange: "NYSE", domain: "duke-energy.com", sharesB: 0.774 },
  { ticker: "EMR", exchange: "NYSE", domain: "emerson.com", sharesB: 0.565 },
  { ticker: "FDX", exchange: "NYSE", domain: "fedex.com", sharesB: 0.244 },
  { ticker: "GD", exchange: "NYSE", domain: "generaldynamics.com", sharesB: 0.273 },
  { ticker: "GE", exchange: "NYSE", domain: "ge.com", sharesB: 1.06 },
  { ticker: "GEV", exchange: "NYSE", domain: "gevernova.com", sharesB: 0.274 },
  { ticker: "GILD", exchange: "NASDAQ", domain: "gilead.com", sharesB: 1.24 },
  { ticker: "GM", exchange: "NYSE", domain: "gm.com", sharesB: 0.995 },
  { ticker: "GOOGL", exchange: "NASDAQ", domain: "abc.xyz", sharesB: 12.2 },
  { ticker: "GS", exchange: "NYSE", domain: "goldmansachs.com", sharesB: 0.31 },
  { ticker: "HD", exchange: "NYSE", domain: "homedepot.com", sharesB: 0.992 },
  { ticker: "HON", exchange: "NASDAQ", domain: "honeywell.com", sharesB: 0.65 },
  { ticker: "IBM", exchange: "NYSE", domain: "ibm.com", sharesB: 0.92 },
  { ticker: "INTC", exchange: "NASDAQ", domain: "intel.com", sharesB: 4.3 },
  { ticker: "INTU", exchange: "NASDAQ", domain: "intuit.com", sharesB: 0.28 },
  { ticker: "ISRG", exchange: "NASDAQ", domain: "intuitivesurgical.com", sharesB: 0.356 },
  { ticker: "JNJ", exchange: "NYSE", domain: "jnj.com", sharesB: 2.4 },
  { ticker: "JPM", exchange: "NYSE", domain: "jpmorganchase.com", sharesB: 2.8 },
  { ticker: "KO", exchange: "NYSE", domain: "coca-cola.com", sharesB: 4.3 },
  { ticker: "LIN", exchange: "NASDAQ", domain: "linde.com", sharesB: 0.475 },
  { ticker: "LLY", exchange: "NYSE", domain: "lilly.com", sharesB: 0.9 },
  { ticker: "LMT", exchange: "NYSE", domain: "lockheedmartin.com", sharesB: 0.235 },
  { ticker: "LOW", exchange: "NYSE", domain: "lowes.com", sharesB: 0.565 },
  { ticker: "LRCX", exchange: "NASDAQ", domain: "lamresearch.com", sharesB: 1.28 },
  { ticker: "MA", exchange: "NYSE", domain: "mastercard.com", sharesB: 0.91 },
  { ticker: "MCD", exchange: "NYSE", domain: "mcdonalds.com", sharesB: 0.715 },
  { ticker: "MDLZ", exchange: "NASDAQ", domain: "mondelezinternational.com", sharesB: 1.29 },
  { ticker: "MDT", exchange: "NYSE", domain: "medtronic.com", sharesB: 1.28 },
  { ticker: "META", exchange: "NASDAQ", domain: "meta.com", sharesB: 2.53 },
  { ticker: "MMM", exchange: "NYSE", domain: "3m.com", sharesB: 0.545 },
  { ticker: "MO", exchange: "NYSE", domain: "altria.com", sharesB: 1.69 },
  { ticker: "MRK", exchange: "NYSE", domain: "merck.com", sharesB: 2.52 },
  { ticker: "MS", exchange: "NYSE", domain: "morganstanley.com", sharesB: 1.58 },
  { ticker: "MSFT", exchange: "NASDAQ", domain: "microsoft.com", sharesB: 7.43 },
  { ticker: "MU", exchange: "NASDAQ", domain: "micron.com", sharesB: 1.11 },
  { ticker: "NEE", exchange: "NYSE", domain: "nexteraenergy.com", sharesB: 2.06 },
  { ticker: "NFLX", exchange: "NASDAQ", domain: "netflix.com", sharesB: 0.428 },
  { ticker: "NKE", exchange: "NYSE", domain: "nike.com", sharesB: 1.48 },
  { ticker: "NOW", exchange: "NYSE", domain: "servicenow.com", sharesB: 0.206 },
  { ticker: "NVDA", exchange: "NASDAQ", domain: "nvidia.com", sharesB: 24.3 },
  { ticker: "ORCL", exchange: "NYSE", domain: "oracle.com", sharesB: 2.8 },
  { ticker: "PEP", exchange: "NASDAQ", domain: "pepsico.com", sharesB: 1.37 },
  { ticker: "PFE", exchange: "NYSE", domain: "pfizer.com", sharesB: 5.67 },
  { ticker: "PG", exchange: "NYSE", domain: "pg.com", sharesB: 2.35 },
  { ticker: "PLTR", exchange: "NASDAQ", domain: "palantir.com", sharesB: 2.4 },
  { ticker: "PM", exchange: "NYSE", domain: "pmi.com", sharesB: 1.56 },
  { ticker: "QCOM", exchange: "NASDAQ", domain: "qualcomm.com", sharesB: 1.09 },
  { ticker: "RTX", exchange: "NYSE", domain: "rtx.com", sharesB: 1.33 },
  { ticker: "SBUX", exchange: "NASDAQ", domain: "starbucks.com", sharesB: 1.13 },
  { ticker: "SCHW", exchange: "NYSE", domain: "schwab.com", sharesB: 1.8 },
  { ticker: "SO", exchange: "NYSE", domain: "southerncompany.com", sharesB: 1.1 },
  { ticker: "SPG", exchange: "NYSE", domain: "simon.com", sharesB: 0.326 },
  { ticker: "T", exchange: "NYSE", domain: "about.att.com", sharesB: 7.18 },
  { ticker: "TMO", exchange: "NYSE", domain: "thermofisher.com", sharesB: 0.38 },
  { ticker: "TMUS", exchange: "NASDAQ", domain: "t-mobile.com", sharesB: 1.16 },
  { ticker: "TSLA", exchange: "NASDAQ", domain: "tesla.com", sharesB: 3.23 },
  { ticker: "TXN", exchange: "NASDAQ", domain: "ti.com", sharesB: 0.91 },
  { ticker: "UBER", exchange: "NYSE", domain: "uber.com", sharesB: 2.08 },
  { ticker: "UNH", exchange: "NYSE", domain: "unitedhealthgroup.com", sharesB: 0.92 },
  { ticker: "UNP", exchange: "NYSE", domain: "unionpacific.com", sharesB: 0.604 },
  { ticker: "UPS", exchange: "NYSE", domain: "ups.com", sharesB: 0.855 },
  { ticker: "USB", exchange: "NYSE", domain: "usbank.com", sharesB: 1.55 },
  { ticker: "V", exchange: "NYSE", domain: "visa.com", sharesB: 1.95 },
  { ticker: "VZ", exchange: "NYSE", domain: "verizon.com", sharesB: 4.2 },
  { ticker: "WFC", exchange: "NYSE", domain: "wellsfargo.com", sharesB: 3.3 },
  { ticker: "WMT", exchange: "NYSE", domain: "walmart.com", sharesB: 8.05 },
  { ticker: "XOM", exchange: "NYSE", domain: "exxonmobil.com", sharesB: 4.35 },
];
