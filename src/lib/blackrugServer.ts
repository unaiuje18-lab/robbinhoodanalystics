import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { coinSeeds } from "@/data/coins";
import { stockSeeds } from "@/data/stocks";
import {
  castVote,
  ensureSpecs,
  lastVoteAt,
  normalizeBoard,
  voteCounts,
  type BlackrugData,
  type SpecEntry,
} from "./blackrug";
import { loadStore, mutateStore } from "./blackrugStore";

/**
 * BlackRug server functions — thin wrappers over the pure logic in
 * blackrug.ts and the file store. Contracts are derived, not transported:
 * every client recomputes them with contractFor(ticker).
 */

/** Memes + stocks — specs, votes and The Board span both markets. */
const UNIVERSE: ReadonlySet<string> = new Set([...coinSeeds, ...stockSeeds].map((c) => c.ticker));

const ADMIN_PASSWORD = process.env["BLACKRUG_ADMIN_PASSWORD"] ?? "blackrug";

const voterInput = z.object({ voterId: z.string().max(80).optional() });
const voteInput = z.object({
  ticker: z.string().min(1).max(40),
  voterId: z.string().min(8).max(80),
});
const ensureInput = z.object({ tickers: z.array(z.string().max(40)).max(25) });
const adminInput = z.object({ password: z.string().min(1).max(200) });
const boardInput = z.object({
  password: z.string().min(1).max(200),
  tickers: z.array(z.string().max(40)).max(50),
});
const hideInput = z.object({
  password: z.string().min(1).max(200),
  ticker: z.string().min(1).max(40),
  hidden: z.boolean(),
});

export type PublicSpec = Omit<SpecEntry, "contract">;

export type BlackrugPublicState = {
  specs: Record<string, PublicSpec>;
  /** Board tickers in curator order (UI skips hidden ones for display). */
  board: string[];
  /** 24h votes per ticker. */
  voteCounts: Record<string, number>;
  myVoteAt: number | null;
  myVoteTicker: string | null;
};

function toPublicState(
  data: BlackrugData,
  voterId?: string,
  now = Date.now(),
): BlackrugPublicState {
  const specs: Record<string, PublicSpec> = {};
  for (const [ticker, spec] of Object.entries(data.specs)) {
    specs[ticker] = { createdAt: spec.createdAt, hidden: spec.hidden };
  }
  const myVoteAt = voterId ? lastVoteAt(data, voterId) : null;
  const myVoteTicker = myVoteAt
    ? ([...data.votes].reverse().find((v) => v.voterId === voterId)?.ticker ?? null)
    : null;
  return { specs, board: data.board, voteCounts: voteCounts(data, now), myVoteAt, myVoteTicker };
}

export const getBlackrugState = createServerFn({ method: "GET" })
  .validator((input: unknown) => voterInput.parse(input ?? {}))
  .handler(({ data }): BlackrugPublicState => toPublicState(loadStore(), data.voterId));

/** Called by the home page with the current Top-Volume tickers (Option A). */
export const ensureSpecsFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => ensureInput.parse(input))
  .handler(({ data }): Promise<{ created: string[] }> => {
    return mutateStore((store) => {
      const { data: next, created } = ensureSpecs(store, data.tickers, UNIVERSE, Date.now());
      return { data: next, result: { created } };
    });
  });

export type VoteResponse =
  | { ok: true; state: BlackrugPublicState }
  | { ok: false; reason: "no-spec" | "hidden" | "already-voted" | "unknown-coin" };

export const castVoteFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => voteInput.parse(input))
  .handler(({ data }): Promise<VoteResponse> => {
    return mutateStore<VoteResponse>((store) => {
      const result = castVote(store, data.ticker, data.voterId, Date.now());
      if (!result.ok) return { data: store, result };
      return {
        data: result.data,
        result: { ok: true as const, state: toPublicState(result.data, data.voterId) },
      };
    });
  });

export const adminLoginFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => adminInput.parse(input))
  .handler(({ data }): { ok: boolean } => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Wrong admin password");
    return { ok: true };
  });

export type AdminState = {
  specs: Record<string, SpecEntry>;
  board: string[];
  voteCounts: Record<string, number>;
};

export const adminGetStateFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => adminInput.parse(input))
  .handler(({ data }): AdminState => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Wrong admin password");
    const store = loadStore();
    return { specs: store.specs, board: store.board, voteCounts: voteCounts(store, Date.now()) };
  });

export const adminSaveBoardFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => boardInput.parse(input))
  .handler(({ data }): Promise<{ tickers: string[]; rejected: string[] }> => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Wrong admin password");
    return mutateStore<{ tickers: string[]; rejected: string[] }>((store) => {
      const { tickers, rejected } = normalizeBoard(data.tickers, UNIVERSE);
      const next: BlackrugData = { ...store, board: tickers };
      // Board coins always deserve a spec page (they're curated, votable picks).
      const { data: withSpecs } = ensureSpecs(next, tickers, UNIVERSE, Date.now());
      return { data: withSpecs, result: { tickers, rejected } };
    });
  });

export const adminSetHiddenFn = createServerFn({ method: "POST" })
  .validator((input: unknown) => hideInput.parse(input))
  .handler(({ data }): Promise<{ ok: boolean }> => {
    if (data.password !== ADMIN_PASSWORD) throw new Error("Wrong admin password");
    return mutateStore<{ ok: boolean }>((store) => {
      if (!Object.prototype.hasOwnProperty.call(store.specs, data.ticker)) {
        return { data: store, result: { ok: false } };
      }
      const current = store.specs[data.ticker]!;
      return {
        data: {
          ...store,
          specs: { ...store.specs, [data.ticker]: { ...current, hidden: data.hidden } },
        },
        result: { ok: true },
      };
    });
  });
