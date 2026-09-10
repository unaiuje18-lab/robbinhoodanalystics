import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { emptyData, pruneVotes, type BlackrugData } from "./blackrug";

/**
 * Server-side persistence for BlackRug state — a single JSON file rewritten
 * atomically (tmp file + rename). All mutations funnel through mutateStore,
 * whose in-process queue serializes read-modify-write cycles so concurrent
 * votes can't clobber each other. Swapping this module for a real DB later
 * changes nothing else.
 */

const DATA_FILE = join(process.cwd(), "data", "blackrug.json");

let queue: Promise<unknown> = Promise.resolve();

function loadSync(): BlackrugData {
  try {
    const parsed = JSON.parse(readFileSync(DATA_FILE, "utf8")) as Partial<BlackrugData>;
    return {
      specs: parsed.specs ?? {},
      board: Array.isArray(parsed.board) ? parsed.board : [],
      votes: Array.isArray(parsed.votes) ? parsed.votes : [],
    };
  } catch {
    return emptyData();
  }
}

function saveSync(data: BlackrugData): void {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  renameSync(tmp, DATA_FILE);
}

/** Read the current state (fresh on every call — the file is small). */
export function loadStore(): BlackrugData {
  return loadSync();
}

/**
 * Serialized read-modify-write. The mutator returns the next state (or the
 * same reference to skip the write); votes past retention are pruned on save.
 */
export function mutateStore<T>(
  mutate: (data: BlackrugData) => { data: BlackrugData; result: T },
): Promise<T> {
  const run = queue.then(async () => {
    const current = loadSync();
    const { data: next, result } = mutate(current);
    if (next !== current) saveSync(pruneVotes(next, Date.now()));
    return result;
  });
  // Keep the chain alive even when a mutation throws.
  queue = run.catch(() => undefined);
  return run;
}
