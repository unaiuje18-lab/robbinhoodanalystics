import { describe, expect, it } from "vitest";
import { buildIndexSeries, parseKlines, rangeChangePct, toPctSeries, type Kline } from "./klines";

const k = (t: number, close: number, quoteVolume = 0): Kline => ({ t, close, quoteVolume });

describe("parseKlines", () => {
  it("maps Binance's array-of-arrays rows onto { t, close, quoteVolume }", () => {
    const raw = [
      [1700000000000, "0.1", "0.2", "0.05", "0.12", "1000", 0, "84000.5"],
      [1700000900000, "0.12", "0.3", "0.11", "0.25", "2000", 0, "160000"],
    ];
    expect(parseKlines(raw)).toEqual([
      { t: 1700000000000, close: 0.12, quoteVolume: 84000.5 },
      { t: 1700000900000, close: 0.25, quoteVolume: 160000 },
    ]);
  });

  it("drops malformed rows and non-positive closes, tolerates junk", () => {
    const raw = [
      "not an array",
      [1, "0.1", "0.2", "0.05", "0.12", "1", 0, "10"],
      [2, "0.1", "0.2", "0.05", "0", "1", 0, "10"], // zero close
      [3, "0.1", "0.2", "0.05", "-1", "1", 0, "10"], // negative close
      [4, "0.1", "0.2", "0.05", "oops", "1", 0, "10"], // NaN close
      [5, "0.1", "0.2", "0.05", "0.3", "1", 0, "NaN"], // NaN volume → 0
    ];
    expect(parseKlines(raw)).toEqual([
      { t: 1, close: 0.12, quoteVolume: 10 },
      { t: 5, close: 0.3, quoteVolume: 0 },
    ]);
    expect(parseKlines(null)).toEqual([]);
    expect(parseKlines(undefined)).toEqual([]);
    expect(parseKlines(42)).toEqual([]);
  });
});

describe("toPctSeries", () => {
  it("expresses every close as cumulative % from the range open", () => {
    const series = toPctSeries([k(0, 100), k(1, 110), k(2, 99)]);
    expect(series.map((p) => p.t)).toEqual([0, 1, 2]);
    expect(series.map((p) => p.pct)[0]).toBe(0);
    expect(series.map((p) => p.pct)[1]).toBeCloseTo(10, 9);
    expect(series.map((p) => p.pct)[2]).toBeCloseTo(-1, 9);
  });

  it("returns [] for empty or unusable input", () => {
    expect(toPctSeries([])).toEqual([]);
    expect(toPctSeries([k(0, 0), k(1, 5)])).toEqual([]);
  });
});

describe("buildIndexSeries", () => {
  it("sums supply × close and quote volume per timestamp", () => {
    const series = buildIndexSeries(
      {
        DOGE: [k(0, 1, 100), k(1, 2, 200)],
        SHIB: [k(0, 10, 50), k(1, 5, 25)],
      },
      { DOGE: 3, SHIB: 2 },
    );
    expect(series).toEqual([
      { t: 0, mcap: 3 * 1 + 2 * 10, vol: 150 },
      { t: 1, mcap: 3 * 2 + 2 * 5, vol: 225 },
    ]);
  });

  it("counts only coins that have a candle at each t (young listings join late)", () => {
    const series = buildIndexSeries(
      {
        OLD: [k(0, 1, 0), k(1, 2, 0)],
        NEW: [k(1, 10, 0)],
      },
      { OLD: 1, NEW: 1 },
    );
    expect(series).toEqual([
      { t: 0, mcap: 1, vol: 0 },
      { t: 1, mcap: 12, vol: 0 },
    ]);
  });

  it("skips coins with missing, zero or negative supply", () => {
    const series = buildIndexSeries(
      { A: [k(0, 1, 1)], B: [k(0, 100, 1)], C: [k(0, 100, 1)] },
      { A: 1, B: 0, C: -5 },
    );
    expect(series).toEqual([{ t: 0, mcap: 1, vol: 1 }]);
  });

  it("returns [] with no usable coins, and sorts by timestamp", () => {
    expect(buildIndexSeries({ A: [k(0, 1, 0)] }, {})).toEqual([]);
    expect(buildIndexSeries({}, { A: 1 })).toEqual([]);
    const unsorted = buildIndexSeries({ A: [k(9, 1, 0), k(3, 1, 0)] }, { A: 1 });
    expect(unsorted.map((p) => p.t)).toEqual([3, 9]);
  });
});

describe("rangeChangePct", () => {
  it("compares first and last values", () => {
    expect(rangeChangePct([100, 120])).toBeCloseTo(20, 9);
    expect(rangeChangePct([100, 50])).toBeCloseTo(-50, 9);
    expect(rangeChangePct([100])).toBe(0);
  });

  it("returns null for empty or unusable series", () => {
    expect(rangeChangePct([])).toBeNull();
    expect(rangeChangePct([0, 10])).toBeNull();
  });
});
