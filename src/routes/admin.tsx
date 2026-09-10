import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowLeft, ArrowUp, LogOut, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { CoinAvatar, Dot } from "@/components/CoinArt";
import { coinSeeds } from "@/data/coins";
import { stockSeeds } from "@/data/stocks";
import { BOARD_MAX } from "@/lib/blackrug";
import {
  adminGetStateFn,
  adminLoginFn,
  adminSaveBoardFn,
  adminSetHiddenFn,
} from "@/lib/blackrugServer";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — BlackRug" }] }),
  component: Admin,
});

const SESSION_KEY = "blackrug:admin";

/** Swap two positions in a copied array (board reordering). */
function swapped(arr: string[], i: number, j: number): string[] {
  const next = [...arr];
  const tmp = next[i]!;
  next[i] = next[j]!;
  next[j] = tmp;
  return next;
}

function readSavedPassword(): string | null {
  try {
    return sessionStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

/** Look up seed art so board rows render the same avatar as the market. */
function seedFor(ticker: string) {
  return coinSeeds.find((c) => c.ticker === ticker) ?? stockSeeds.find((c) => c.ticker === ticker);
}

/** Board candidates span both markets, each labeled with its kind. */
const BOARD_CANDIDATES = [
  ...coinSeeds.map((c) => ({ ...c, kind: "Meme coin" })),
  ...stockSeeds.map((c) => ({ ...c, kind: "Stock" })),
];

function Admin() {
  const [password, setPassword] = useState<string | null>(readSavedPassword);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!password) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <form
          className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-card p-6 shadow-card"
          onSubmit={(e) => {
            e.preventDefault();
            adminLoginFn({ data: { password: input } })
              .then(() => {
                try {
                  sessionStorage.setItem(SESSION_KEY, input);
                } catch {
                  /* private mode — session just won't survive refresh */
                }
                setPassword(input);
              })
              .catch(() => setError("Wrong password"));
          }}
        >
          <h1 className="text-lg font-bold">BlackRug admin</h1>
          <p className="text-sm text-muted-foreground">
            Enter the admin password to manage The Board and hidden tokens.
          </p>
          <input
            type="password"
            autoFocus
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            placeholder="Admin password"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-pink"
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            className="w-full rounded-xl bg-brand-pink px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-pink/90"
          >
            Sign in
          </button>
          <Link
            to="/"
            className="block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            Back to the market
          </Link>
        </form>
      </div>
    );
  }

  return <AdminPanel password={password} onSignOut={() => setPassword(null)} />;
}

function AdminPanel({ password, onSignOut }: { password: string; onSignOut: () => void }) {
  const queryClient = useQueryClient();
  const [board, setBoard] = useState<string[] | null>(null);
  const [search, setSearch] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const { data } = useQuery({
    queryKey: ["blackrug-admin", password],
    queryFn: () => adminGetStateFn({ data: { password } }),
    refetchInterval: 60_000,
  });

  const serverBoard = data?.board ?? [];
  const effectiveBoard = board ?? serverBoard;
  const specs = data?.specs ?? {};
  const specTickers = Object.entries(specs).sort((a, b) => b[1].createdAt - a[1].createdAt);

  const query = search.trim().toLowerCase();
  const matches = query
    ? BOARD_CANDIDATES.filter(
        (c) => c.ticker.toLowerCase().includes(query) || c.name.toLowerCase().includes(query),
      ).slice(0, 8)
    : [];

  const saveBoard = (tickers: string[]) => {
    adminSaveBoardFn({ data: { password, tickers } })
      .then(() => {
        setBoard(null);
        setSavedAt(Date.now());
        setSaveFailed(false);
        queryClient.invalidateQueries({ queryKey: ["blackrug"] });
        queryClient.invalidateQueries({ queryKey: ["blackrug-admin"] });
      })
      .catch(() => setSaveFailed(true));
  };

  const toggleHidden = (ticker: string, hidden: boolean) => {
    adminSetHiddenFn({ data: { password, ticker, hidden } }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["blackrug"] });
      queryClient.invalidateQueries({ queryKey: ["blackrug-admin"] });
    });
  };

  const dirty = board !== null && board.join("|") !== serverBoard.join("|");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Market
          </Link>
          <span className="text-sm font-bold">BlackRug admin</span>
          <button
            type="button"
            onClick={onSignOut}
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6">
        {/* The Board — curator picks. Reorder, remove, add, then save. */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-sm font-semibold">The Board</h2>
            <span className="rounded-full bg-muted px-2 text-xs font-semibold">
              {effectiveBoard.length}/{BOARD_MAX}
            </span>
            <div className="ml-auto flex items-center gap-3">
              {saveFailed ? <span className="text-xs text-danger">Save failed — retry</span> : null}
              {savedAt && !dirty ? <span className="text-xs text-success">Saved ✓</span> : null}
              <button
                type="button"
                disabled={!dirty}
                onClick={() => saveBoard(effectiveBoard)}
                className="rounded-xl bg-brand-pink px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40"
              >
                Save board
              </button>
            </div>
          </div>

          <ol className="mt-4 divide-y divide-border">
            {effectiveBoard.map((ticker, i) => {
              const seed = seedFor(ticker);
              return (
                <li key={ticker} className="flex items-center gap-3 py-2">
                  <span className="w-5 text-right text-xs font-bold tabular-nums text-muted-foreground">
                    {i + 1}
                  </span>
                  <Dot hue={seed?.hue ?? 0} image={seed?.image ?? null} className="h-7 w-7" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{ticker}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {seed?.name ?? "unknown coin"}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      aria-label={`Move ${ticker} up`}
                      disabled={i === 0}
                      onClick={() => setBoard(swapped(effectiveBoard, i, i - 1))}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${ticker} down`}
                      disabled={i === effectiveBoard.length - 1}
                      onClick={() => setBoard(swapped(effectiveBoard, i, i + 1))}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${ticker} from the board`}
                      onClick={() => setBoard(effectiveBoard.filter((t) => t !== ticker))}
                      className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-danger"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
          {effectiveBoard.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              The Board is empty — search below and add up to {BOARD_MAX} coins.
            </p>
          ) : null}

          <div className="mt-4 border-t border-border pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the coin universe to add to The Board…"
                className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-pink"
              />
            </div>
            {matches.length > 0 ? (
              <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
                {matches.map((c) => {
                  const onBoard = effectiveBoard.includes(c.ticker);
                  const full = effectiveBoard.length >= BOARD_MAX;
                  return (
                    <li key={c.ticker} className="flex items-center gap-3 px-3 py-2">
                      <CoinAvatar
                        ticker={c.ticker}
                        hue={c.hue}
                        hue2={c.hue2}
                        image={c.image ?? null}
                        className="h-7 w-7 shrink-0 rounded-lg"
                      />
                      <span className="text-sm font-semibold">{c.ticker}</span>
                      <span className="truncate text-xs text-muted-foreground">{c.name}</span>
                      <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {c.kind}
                      </span>
                      <button
                        type="button"
                        disabled={onBoard || full}
                        onClick={() => setBoard([...effectiveBoard, c.ticker])}
                        className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold transition-colors hover:border-brand-pink hover:text-brand-pink disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {onBoard ? "On the board" : "Add"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </section>

        {/* Token registry — every technical specification, hide/unhide. */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
          <h2 className="text-sm font-semibold">Tokens</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Every technical specification ever created. Hidden tokens disappear from The Board, Top
            Voted and Top Volume and can't receive votes.
          </p>
          {specTickers.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No specifications yet — they're created automatically when a coin enters the Top
              Volume top 20.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      #
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Ticker
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Spec created
                    </th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">
                      Votes (24h)
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Visible
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {specTickers.map(([ticker, spec], i) => {
                    const seed = seedFor(ticker);
                    return (
                      <tr key={ticker} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-4 tabular-nums text-muted-foreground">{i + 1}</td>
                        <td className="py-2 pr-4">
                          <span className="flex items-center gap-2 font-semibold">
                            <Dot
                              hue={seed?.hue ?? 0}
                              image={seed?.image ?? null}
                              className="h-6 w-6"
                            />
                            {ticker}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {new Date(spec.createdAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {data?.voteCounts[ticker] ?? 0}
                        </td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={!spec.hidden}
                            aria-label={`${spec.hidden ? "Show" : "Hide"} ${ticker}`}
                            onClick={() => toggleHidden(ticker, !spec.hidden)}
                            className={`relative h-5 w-9 rounded-full transition-colors ${
                              spec.hidden ? "bg-muted-foreground/30" : "bg-success"
                            }`}
                          >
                            <span
                              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                                spec.hidden ? "left-0.5" : "left-[18px]"
                              }`}
                            />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
