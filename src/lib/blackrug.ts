import { hashStr } from "@/lib/random";

/**
 * BlackRug domain logic — pure and isomorphic, so both the vitest suite and
 * the UI can trust it. The server store (blackrugStore) persists this shape;
 * server functions (blackrugServer) are thin wrappers.
 *
 * A "spec" (technical specification page) is created the first time a coin
 * enters the Top Volume top 20 and then lives forever. Voting is 1 vote per
 * anonymous visitor per rolling 24h; Top Voted ranks votes cast in 24h.
 */

export const VOTE_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Votes leave the file two windows after they leave every ranking. */
export const VOTE_RETENTION_MS = 2 * VOTE_WINDOW_MS;
export const BOARD_MAX = 10;
/** Top Volume / Top Voted list size. */
export const TOP_LIST_SIZE = 20;
/** Safety valve — the home page sends at most the top 20, this is generous. */
export const ENSURE_SPECS_MAX = 25;

export type SpecEntry = {
  /** Client clock of the moment the coin first entered the top 20. */
  createdAt: number;
  /** Deterministic pseudo-contract — never stored twice, derivable anywhere. */
  contract: string;
  hidden: boolean;
};

export type VoteRecord = { ticker: string; voterId: string; at: number };

export type BlackrugData = {
  specs: Record<string, SpecEntry>;
  /** Board tickers, curator-ordered, max BOARD_MAX. */
  board: string[];
  votes: VoteRecord[];
};

export function emptyData(): BlackrugData {
  return { specs: {}, board: [], votes: [] };
}

/**
 * "0x" + 40 hex chars hashed from the ticker — the same address on every
 * client and server run without ever storing per-coin randomness.
 */
export function contractFor(ticker: string): string {
  let hex = "";
  let seed = ticker;
  while (hex.length < 40) {
    seed = `${seed}:${hashStr(seed).toString(16)}`;
    hex += hashStr(`${seed}#contract`).toString(16).padStart(8, "0");
  }
  return `0x${hex.slice(0, 40)}`;
}

export function hasSpec(data: BlackrugData, ticker: string): boolean {
  return Object.prototype.hasOwnProperty.call(data.specs, ticker);
}

export function isVotable(data: BlackrugData, ticker: string): boolean {
  const spec = data.specs[ticker];
  return spec !== undefined && !spec.hidden;
}

/**
 * Create specs for every known ticker that doesn't have one yet. Unknown
 * tickers are ignored (the universe is the ~250 generated coins, so even a
 * forged request can't grow the registry beyond it). Idempotent.
 */
export function ensureSpecs(
  data: BlackrugData,
  tickers: string[],
  universe: ReadonlySet<string>,
  now: number,
): { data: BlackrugData; created: string[] } {
  const specs = { ...data.specs };
  const created: string[] = [];
  for (const raw of tickers.slice(0, ENSURE_SPECS_MAX)) {
    const ticker = typeof raw === "string" ? raw.trim() : "";
    if (!ticker || !universe.has(ticker) || Object.prototype.hasOwnProperty.call(specs, ticker))
      continue;
    specs[ticker] = { createdAt: now, contract: contractFor(ticker), hidden: false };
    created.push(ticker);
  }
  if (created.length === 0) return { data, created };
  return { data: { ...data, specs }, created };
}

export function lastVoteAt(data: BlackrugData, voterId: string): number | null {
  let latest: number | null = null;
  for (const vote of data.votes) {
    if (vote.voterId === voterId && (latest === null || vote.at > latest)) latest = vote.at;
  }
  return latest;
}

export type VoteResult =
  | { ok: true; data: BlackrugData }
  | { ok: false; reason: "no-spec" | "hidden" | "already-voted" | "unknown-coin" };

/** Cast the caller's single vote — rejected inside the rolling 24h window. */
export function castVote(
  data: BlackrugData,
  ticker: string,
  voterId: string,
  now: number,
): VoteResult {
  if (!voterId || !ticker) return { ok: false, reason: "unknown-coin" };
  if (!hasSpec(data, ticker)) {
    return { ok: false, reason: "no-spec" };
  }
  if (!isVotable(data, ticker)) return { ok: false, reason: "hidden" };
  const previous = lastVoteAt(data, voterId);
  if (previous !== null && now - previous < VOTE_WINDOW_MS) {
    return { ok: false, reason: "already-voted" };
  }
  return {
    ok: true,
    data: { ...data, votes: [...data.votes, { ticker, voterId, at: now }] },
  };
}

/** Votes per ticker cast inside the trailing 24h window. */
export function voteCounts(data: BlackrugData, now: number): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const vote of data.votes) {
    if (now - vote.at >= VOTE_WINDOW_MS) continue;
    counts[vote.ticker] = (counts[vote.ticker] ?? 0) + 1;
  }
  return counts;
}

/** Top Voted: most 24h votes first, ties broken by earliest spec (seniority). */
export function topVoted(
  data: BlackrugData,
  now: number,
  count: number = TOP_LIST_SIZE,
): { ticker: string; votes: number }[] {
  const counts = voteCounts(data, now);
  return Object.entries(counts)
    .filter(([ticker]) => isVotable(data, ticker))
    .map(([ticker, votes]) => ({ ticker, votes }))
    .sort(
      (a, b) =>
        b.votes - a.votes ||
        (data.specs[a.ticker]?.createdAt ?? 0) - (data.specs[b.ticker]?.createdAt ?? 0) ||
        a.ticker.localeCompare(b.ticker),
    )
    .slice(0, count);
}

/** Drop votes no ranking can see anymore, keeping the file small. */
export function pruneVotes(data: BlackrugData, now: number): BlackrugData {
  const votes = data.votes.filter((vote) => now - vote.at < VOTE_RETENTION_MS);
  return votes.length === data.votes.length ? data : { ...data, votes };
}

/**
 * Validate a curator-submitted board: universe members only, deduped,
 * capped at BOARD_MAX, order preserved.
 */
export function normalizeBoard(
  board: string[],
  universe: ReadonlySet<string>,
): { tickers: string[]; rejected: string[] } {
  const seen = new Set<string>();
  const tickers: string[] = [];
  const rejected: string[] = [];
  for (const raw of board) {
    const ticker = typeof raw === "string" ? raw.trim() : "";
    if (!ticker || !universe.has(ticker) || seen.has(ticker)) {
      if (ticker) rejected.push(ticker);
      continue;
    }
    if (tickers.length >= BOARD_MAX) {
      rejected.push(ticker);
      continue;
    }
    seen.add(ticker);
    tickers.push(ticker);
  }
  return { tickers, rejected };
}

/** Board coins in curator order, skipping hidden ones for display. */
export function visibleBoard(data: BlackrugData): string[] {
  return data.board.filter((ticker) => isVotable(data, ticker));
}
