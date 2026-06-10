# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this project is

**MDBX Navigator** is a read-only web UI for browsing the contents of a
[libmdbx](https://github.com/erthink/libmdbx) key-value database, in the spirit
of the table browsers that exist for SQL databases. It is split into two parts
that ship as a **single binary**:

- A **Go backend** that opens an `mdbx.dat` file from the local filesystem
  (read-only, exclusive mode) and exposes the raw KV data over a small REST API.
- A **React Router 7 / React frontend** (SPA, framework mode) that consumes
  those APIs and renders a read-only browser. In production the built frontend
  is embedded into the Go binary via `go:embed` and served by the same process;
  during development it can be run separately against the backend.

Everything the UI shows is raw bytes rendered as `0x…` hex strings — there is no
schema interpretation of keys/values.

## Repository layout

```
main.go                 CLI entrypoint (urfave/cli v3): flags, opens the env, starts the HTTP server
mdbxnav/                Core mdbx reading logic, decoupled from HTTP
  types.go              Table / KVResult / ValueResult structs (JSON-tagged)
  tables.go             ReadTables: enumerates DBIs + per-table stats at startup
routes/                 chi HTTP handlers (Backend struct + REST endpoints)
  router.go             Route table, CORS, and the embedded-FS static file server
  alltables.go          GET /api/tables
  table_forward.go      GET /api/table/{table}/forward  (+ readForward cursor helper)
  table_backward.go     GET /api/table/{table}/backward (+ readBackward cursor helper)
  table_search.go       GET /api/table/{table}/search   (prefix / range search)
  getvalue.go           GET /api/table/{table}/value     (single full value)
  util.go               Shared query-param parsing (readParams / readKey)
web/                    Frontend (React Router 7 SPA + Tailwind v4)
  static.go             package web — go:embed all:build/client → web.FS
  react-router.config.ts  React Router framework config (ssr: false → SPA mode)
  vite.config.ts        Vite 8 + @react-router/dev + @tailwindcss/vite plugins
  eslint.config.mjs     Flat ESLint config (ESLint 9)
  app/routes.ts         Route manifest (flatRoutes() — keeps the app/routes/ file convention)
  app/routes/           File-based routes (clientLoader-only, ssr disabled)
  app/components/       UI components (Results, NavBar, hex rendering, etc.)
  app/tailwind.css      Tailwind v4 entry (@import "tailwindcss" + @theme overrides)
  app/types.ts          Shared TS types + constants (incl. BACKEND_URL)
.goreleaser.yaml        Release/build config; embeds the frontend into the binary
doc/                    Screenshot used by README
```

## Build, run, and dev workflows

### Toolchain
- **Go** 1.26.x with **CGO enabled** — `mdbx-go` is a cgo binding, so a working
  C toolchain is required and `CGO_ENABLED=1` must be set. Pure-Go cross
  compilation will not work. (The `go` directive in `go.mod` is `1.26.4`.)
- **Node** 24.16.0 (pinned in `web/.nvmrc`; run `nvm install` inside `web/`).
- **pnpm** is the package manager (not npm). Install it standalone or via
  `corepack enable`. The frontend has a committed `web/pnpm-lock.yaml`.
- **goreleaser** for producing the embedded single-binary build.

### Full binary (frontend embedded)
```shell
goreleaser build --snapshot --clean --single-target
```
goreleaser's `before` hooks run `go mod tidy`, `pnpm --dir web install
--frozen-lockfile`, and `pnpm --dir web run build` first, then builds the Go
binary. The output lands in `./dist/mdbx-navigator_<arch>/`.

> Important: the Go build embeds `web/build/client` via `//go:embed all:build/client`.
> A plain `go build ./...` **fails** unless that directory exists. Build the
> frontend first (`pnpm --dir web run build`) or use goreleaser, which does it
> for you.

### Run
```shell
./mdbx-navigator --data <path-to-your-mdbx.dat>
```
CLI flags (see `main.go`):
- `--data` (required) — path to the `mdbx.dat` file.
- `--host` (default `127.0.0.1`) — bind address.
- `--port` (default `56516`) — bind port.
- `--lengthcap` (default `32`) — max value length (bytes) returned in list
  results before truncation; full values come from the `/value` endpoint.

The DB is opened **read-only in exclusive mode** with `OptMaxDB = 1000`. The app
is browse-only by design — do not add write paths. The UI is served at
`http://127.0.0.1:56516/`.

> Exclusive mode means the open **fails if another process already holds the
> file** (e.g. a running Erigon node). Stop the writer first, or point `--data`
> at a copy/snapshot. Real Erigon chaindata has ~100+ tables, many with
> `entries=0` — that is normal, and `forward`/`backward`/`search` on an empty
> table just return `[]`.

### Frontend-only dev loop (inside `web/`)
```shell
pnpm install       # restore deps from pnpm-lock.yaml
pnpm run dev       # React Router dev server (Vite)
pnpm run build     # production build → build/client (what gets embedded)
pnpm run lint      # eslint (flat config)
pnpm run typecheck # react-router typegen && tsc
```
Run a backend separately (`go run . --data <file>` after building the frontend,
or point at an existing binary) so the dev UI has an API to call.

> Some native packages run install scripts that pnpm blocks by default. They are
> explicitly allowed in `web/pnpm-workspace.yaml` under `allowBuilds`: `esbuild`
> (Vite's platform binary), `@tailwindcss/oxide` (Tailwind v4's engine), and
> `unrs-resolver` (the resolver behind `eslint-import-resolver-typescript`).
> Without those entries, `pnpm install` / `pnpm run build` fail their dependency
> check.

## Conventions & gotchas

- **Hex everywhere.** Keys and values cross the API boundary as `0x`-prefixed
  hex strings. Backend encodes with `encoding/hex`; the frontend parses/formats
  with `ethers` `hexlify`/`isHexString`. Search keys may be an odd number of hex
  nibbles — `table_search.go` right-pads with a `0` to byte-align.
- **dupsort tables.** Duplicate keys are addressed by a `dupIdx` ordinal. Cursor
  helpers (`readForward`/`readBackward`) track `dupIdx` as they walk, and several
  handlers advance the cursor `dupIdx` times to reach a specific duplicate. Keep
  this in mind when touching cursor logic — forward and backward index
  bookkeeping are mirror images and easy to get subtly wrong.
- **Opening DBIs (`mdbx.DBAccede`).** Tables are opened for reading with the
  `mdbx.DBAccede` flag (`txn.OpenDBI(name, mdbx.DBAccede, …)` /
  `OpenDBISimple(name, mdbx.DBAccede)`), **not** `0`. libmdbx persists a table's
  flags (e.g. `DupSort`), and (since the mdbx-go v0.40 bump) opening an existing
  dupsort table with `0` fails with `MDBX_INCOMPATIBLE`. `DBAccede` means "adopt
  the flags the DB was created with", so dupsort tables get their dupsort cursor
  semantics. Do not revert these to `0`.
- **Pagination.** Loaders fetch `pageSize + 1` (or `+2` when resuming from a
  cursor position) rows on purpose, to detect whether a next page exists without
  a separate count. See `web/app/routes/*` and `DEFAULT_PAGE_SIZE` in `types.ts`.
- **Frontend is SPA-only.** React Router runs with `ssr: false` (set in
  `react-router.config.ts`); routes use `clientLoader` (not server `loader`) and
  there is no Node server in production — the Go binary serves the static client
  build and the API. The build still does a one-shot server pass to prerender
  `index.html`, which is why `@react-router/node` and `isbot` are runtime
  `dependencies` (not devDependencies).
- **`BACKEND_URL` is hardcoded** to `http://127.0.0.1:56516/api` in
  `web/app/types.ts`. If you change the default port/host, or run the UI against
  a remote backend, this constant must change too. CORS on the backend currently
  allows all origins for `GET`.
- **Read-only contract.** The backend only registers `GET` routes and opens the
  env read-only. Preserve this — no mutation endpoints, no write transactions.
- **No test suite yet.** There are currently no Go or frontend tests. If you add
  logic worth covering (cursor traversal / dupsort / pagination are the prime
  candidates), add tests alongside it.

## Code style

- **Go:** standard `gofmt`; run `go vet ./...` before finishing. Handlers live on
  the `routes.Backend` receiver; keep mdbx access inside `Env.View(...)` closures
  and always `defer cursor.Close()` / `defer Env.CloseDBI(...)`.
- **TypeScript/React:** Prettier (config in `web/.prettierrc.json`, with the
  Tailwind plugin) + ESLint flat config (`web/eslint.config.mjs`). Use the `~/*`
  import alias for `web/app/*` (resolved natively by Vite + tsconfig `paths`).
  Styling is Tailwind v4 utility classes; theme overrides live in
  `app/tailwind.css` via `@theme` (there is no `tailwind.config.ts`).

## Reference

- README.md — user-facing install/build/run notes.
- libmdbx: https://github.com/erthink/libmdbx
- mdbx-go binding: https://github.com/erigontech/mdbx-go
