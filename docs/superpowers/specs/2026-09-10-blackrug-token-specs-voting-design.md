# BlackRug — token specs, The Board, and voting

Date: 2026-09-10 · Status: approved in chat, implemented same day

## Goal

Rebrand the site to **BlackRug** and add three curated market views plus a
persistent, auto-created "Technical specifications" page for every token that
earns one — with daily community voting.

## Decisions (from brainstorming)

- **BlackRug** is the site name (rebrand away from Flaunch).
- The three lists are **new tabs on the home page**: The Board · Top Voted ·
  Top Volume (then Meme coins · Stocks · Favorites).
- **Top Volume** = top 20 meme coins by live 24h volume.
- When a coin **enters the top 20 by volume for the first time**, its technical
  specification is created automatically (client detects, server records —
  Option A). Specs persist forever; leaving the top 20 changes nothing.
- **The Board** = up to 10 coins the curator picks manually, in a curated
  order, managed in `/admin` (add, delete, replace, reorder).
- **Top Voted** = top 20 spec'd coins by votes cast in the last 24h.
- Voting: **1 vote per visitor per rolling 24h**, no login. Visitor identity
  is an anonymous UUID in localStorage, enforced server-side.
- The coin universe is the generated meme list (~250 coins), so spec spam is
  bounded; `ensureSpecs` validates every ticker against it.
- **Contract addresses are deterministic** (40 hex chars hashed from the
  ticker) — no admin editing, stable forever, computed client-side too.
- Storage: **server-side JSON file** (`data/blackrug.json`, gitignored),
  written atomically, writes serialized, votes older than 48h pruned.
  A later swap to a real DB only touches the store module.
- Admin auth: shared password (`BLACKRUG_ADMIN_PASSWORD`, dev fallback
  `blackrug`) checked per request; admin UI at `/admin` (linked in footer).
- Hidden coins (admin toggle): removed from all three tabs, not votable, spec
  page shows a "hidden" notice.
- `/coin/$ticker` (existing route) becomes the **Technical specifications**
  page: logo, name, rank, price, 24h, chart, market cap, volume, votes (24h),
  contract + copy button, and the vote button. Coins without a spec keep their
  page with a note that a spec is created automatically on entering the top 20.

## Server API (`src/lib/blackrugServer.ts`, pure logic in `src/lib/blackrug.ts`)

| Function | Notes |
| --- | --- |
| `getBlackrugState({ voterId })` | specs (createdAt, hidden), board order, 24h vote counts, caller's last vote |
| `ensureSpecs({ tickers })` | validates vs universe, caps 25/call, creates missing specs, returns created |
| `castVote({ ticker, voterId })` | rejects: no spec / hidden / voted < 24h ago |
| `adminLogin({ password })` | password check |
| `adminGetState / adminSaveBoard / adminSetHidden` | password checked per call |

## Data shape

```jsonc
{
  "specs": { "DOGE": { "createdAt": 1730000000000, "contract": "0x…", "hidden": false } },
  "board": ["DOGE", "PUMP"],
  "votes": [ { "ticker": "DOGE", "voterId": "uuid", "at": 1730000000000 } ]
}
```

## Testing

Vitest over the pure module: deterministic contracts, `ensureSpecs`
validation/idempotency/cap, vote window + counting + ranking, board
normalization (dedupe, cap 10), hidden filtering, store load/save/prune.
UI verified live at http://localhost:8080.
