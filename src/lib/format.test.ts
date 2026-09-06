import { describe, expect, it } from "vitest";
import { formatCompactUsd, formatPct, formatUsd } from "./format";

describe("formatCompactUsd", () => {
  it("formats billions, millions, thousands and plain amounts", () => {
    expect(formatCompactUsd(14_002_709_301)).toBe("$14B");
    expect(formatCompactUsd(2_712_958)).toBe("$2.7M");
    expect(formatCompactUsd(91_200)).toBe("$91.2K");
    expect(formatCompactUsd(43_340)).toBe("$43.3K");
    expect(formatCompactUsd(850)).toBe("$850");
    expect(formatCompactUsd(0)).toBe("$0");
  });
});

describe("formatUsd", () => {
  it("keeps significant digits on sub-cent prices", () => {
    expect(formatUsd(0.0000912)).toBe("$0.000091");
    expect(formatUsd(0.00389376)).toBe("$0.0039");
  });

  it("formats ordinary amounts with grouping", () => {
    expect(formatUsd(197.32)).toBe("$197.32");
    expect(formatUsd(2_412.5)).toBe("$2,412.5");
    expect(formatUsd(3)).toBe("$3");
    expect(formatUsd(0.5)).toBe("$0.5");
  });
});

describe("formatPct", () => {
  it("signs the value and keeps one decimal", () => {
    expect(formatPct(7.3)).toBe("+7.3%");
    expect(formatPct(-3.6)).toBe("-3.6%");
    expect(formatPct(0)).toBe("+0.0%");
  });
});
