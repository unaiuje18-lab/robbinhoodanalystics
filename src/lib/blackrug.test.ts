import { describe, expect, it } from "vitest";

import {
  BOARD_MAX,
  VOTE_WINDOW_MS,
  castVote,
  contractFor,
  emptyData,
  ensureSpecs,
  lastVoteAt,
  normalizeBoard,
  pruneVotes,
  topVoted,
  voteCounts,
  visibleBoard,
  type BlackrugData,
  type SpecEntry,
} from "./blackrug";

const HOUR = 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

const universe = new Set(["DOGE", "PEPE", "PUMP", "WIF"]);

function withSpecs(tickers: string[], at = NOW - 5 * HOUR): BlackrugData {
  const { data } = ensureSpecs(emptyData(), tickers, universe, at);
  return data;
}

function specOf(data: BlackrugData, ticker: string): SpecEntry {
  const spec = data.specs[ticker];
  if (!spec) throw new Error(`expected a spec for ${ticker}`);
  return spec;
}

/** castVote that throws instead of returning a rejection — for happy paths. */
function cast(data: BlackrugData, ticker: string, voterId: string, at: number): BlackrugData {
  const result = castVote(data, ticker, voterId, at);
  if (!result.ok) throw new Error(`vote failed: ${result.reason}`);
  return result.data;
}

describe("contractFor", () => {
  it("is a deterministic 0x + 40-hex address", () => {
    expect(contractFor("DOGE")).toMatch(/^0x[0-9a-f]{40}$/);
    expect(contractFor("DOGE")).toBe(contractFor("DOGE"));
    expect(contractFor("DOGE")).not.toBe(contractFor("PEPE"));
  });
});

describe("ensureSpecs", () => {
  it("creates a spec per known ticker and is idempotent", () => {
    const first = ensureSpecs(emptyData(), ["DOGE", "PEPE"], universe, NOW);
    expect(first.created).toEqual(["DOGE", "PEPE"]);
    expect(specOf(first.data, "DOGE").contract).toBe(contractFor("DOGE"));

    const again = ensureSpecs(first.data, ["DOGE", "PUMP"], universe, NOW + 1);
    expect(again.created).toEqual(["PUMP"]);
    expect(specOf(again.data, "DOGE").createdAt).toBe(NOW);
  });

  it("ignores unknown tickers, blanks, and caps the batch", () => {
    const batch = ["DOGE", "", "SCAM", ...Array.from({ length: 40 }, (_, i) => `X${i}`)];
    const { data, created } = ensureSpecs(emptyData(), batch, universe, NOW);
    expect(created).toEqual(["DOGE"]);
    expect(Object.keys(data.specs)).toEqual(["DOGE"]);
  });
});

describe("castVote", () => {
  const data = withSpecs(["DOGE", "PEPE"]);

  it("records a vote on a spec'd coin", () => {
    const result = castVote(data, "DOGE", "voter-1", NOW);
    expect(result.ok).toBe(true);
    if (result.ok) expect(lastVoteAt(result.data, "voter-1")).toBe(NOW);
  });

  it("enforces one vote per voter per rolling 24h", () => {
    const first = castVote(data, "DOGE", "voter-1", NOW);
    if (!first.ok) throw new Error("expected ok");
    const early = castVote(first.data, "PEPE", "voter-1", NOW + VOTE_WINDOW_MS - HOUR);
    expect(early).toEqual({ ok: false, reason: "already-voted" });
    const late = castVote(first.data, "PEPE", "voter-1", NOW + VOTE_WINDOW_MS + HOUR);
    expect(late.ok).toBe(true);
  });

  it("rejects coins without a spec and hidden coins", () => {
    expect(castVote(data, "PUMP", "voter-2", NOW)).toEqual({ ok: false, reason: "no-spec" });
    const hidden: BlackrugData = {
      ...data,
      specs: { ...data.specs, DOGE: { ...specOf(data, "DOGE"), hidden: true } },
    };
    expect(castVote(hidden, "DOGE", "voter-2", NOW)).toEqual({ ok: false, reason: "hidden" });
  });
});

describe("vote counting and ranking", () => {
  it("counts only votes inside the 24h window and ranks by count", () => {
    const data = cast(
      cast(cast(withSpecs(["DOGE", "PEPE"]), "DOGE", "a", NOW - 3 * HOUR), "DOGE", "b", NOW - HOUR),
      "PEPE",
      "c",
      NOW - 2 * HOUR,
    );

    expect(voteCounts(data, NOW)).toEqual({ DOGE: 2, PEPE: 1 });
    expect(topVoted(data, NOW)).toEqual([
      { ticker: "DOGE", votes: 2 },
      { ticker: "PEPE", votes: 1 },
    ]);
  });

  it("hides hidden coins from Top Voted and the board", () => {
    const data = cast(withSpecs(["DOGE", "PEPE"]), "DOGE", "a", NOW - HOUR);
    const hidden: BlackrugData = {
      ...data,
      specs: { ...data.specs, DOGE: { ...specOf(data, "DOGE"), hidden: true } },
      board: ["DOGE", "PEPE"],
    };
    expect(topVoted(hidden, NOW)).toEqual([]);
    expect(visibleBoard(hidden)).toEqual(["PEPE"]);
  });
});

describe("pruneVotes", () => {
  it("drops votes past retention and keeps the rest untouched", () => {
    const data: BlackrugData = {
      ...withSpecs(["DOGE"]),
      votes: [
        { ticker: "DOGE", voterId: "ancient", at: NOW - 3 * VOTE_WINDOW_MS },
        { ticker: "DOGE", voterId: "fresh", at: NOW - HOUR },
      ],
    };
    const pruned = pruneVotes(data, NOW);
    expect(pruned.votes).toEqual([{ ticker: "DOGE", voterId: "fresh", at: NOW - HOUR }]);
    expect(pruneVotes(pruned, NOW)).toBe(pruned);
  });
});

describe("normalizeBoard", () => {
  it("dedupes, validates against the universe, and keeps order", () => {
    const { tickers, rejected } = normalizeBoard(
      ["DOGE", "PEPE", "DOGE", "SCAM", "", "PUMP"],
      universe,
    );
    expect(tickers).toEqual(["DOGE", "PEPE", "PUMP"]);
    expect(rejected).toEqual(["DOGE", "SCAM"]);
  });

  it("caps the board at BOARD_MAX entries", () => {
    const bigUniverse = new Set(Array.from({ length: 20 }, (_, i) => `C${i}`));
    const { tickers, rejected } = normalizeBoard(
      Array.from({ length: 20 }, (_, i) => `C${i}`),
      bigUniverse,
    );
    expect(tickers).toHaveLength(BOARD_MAX);
    expect(rejected).toHaveLength(10);
  });
});
