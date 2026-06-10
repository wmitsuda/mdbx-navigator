# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this project is

**MDBX Navigator** is a read-only web UI for browsing the contents of a
[libmdbx](https://github.com/erthink/libmdbx) key-value database, in the spirit
of the table browsers that exist for SQL databases. It is split into two parts
that ship as a **single binary**:

- A **Go backend** that opens an `mdbx.dat` file from the local filesystem
  (read-only, exclusive mode) and exposes the raw KV data over a small REST API.
- A **Remix / React frontend** (SPA) that consumes those APIs and renders a
  read-only browser. In production the built frontend is embedded into the Go
  binary via `go:embed` and served by the same process; during development it
  can be run separately against the backend.

Everything the UI shows is raw bytes rendered as `0x…` hex strings — there is no
schema interpretation of keys/values.

## Repository layout

```
main.go                 CLI entrypoint (urfave/cli): flags, opens the env, starts the HTTP server
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
web/                    Frontend (Remix SPA + Tailwind)
  static.go             package web — go:embed all:build/client → web.FS
  app/routes/           Remix file-based routes (clientLoader-only, ssr disabled)
  app/components/       UI components (Results, NavBar, hex rendering, etc.)
  app/types.ts          Shared TS types + constants (incl. BACKEND_URL)
.goreleaser.yaml        Release/build config; embeds the frontend into the binary
doc/                    Screenshot used by README
```

## Build, run, and dev workflows

### Toolchain
- **Go** 1.22.5 with **CGO enabled** — `mdbx-go` is a cgo binding, so a working
  C toolchain is required and `CGO_ENABLED=1` must be set. Pure-Go cross
  compilation will not work.
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

The build needs network access (npm registry for `pnpm install`, the Go module
proxy for `go mod tidy`). goreleaser currently logs two `DEPRECATED` warnings for
`archives.format` / `archives.format_overrides.format` in `.goreleaser.yaml`;
they are harmless today but should be migrated per
<https://goreleaser.com/deprecations>.

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
> at a copy/snapshot. On startup the backend enumerates every DBI and logs one
> `found table: name=… entries=…` line per table, then `Loaded N tables`. Real
> Erigon chaindata has ~100+ tables, many with `entries=0` — that is normal, and
> `forward`/`backward`/`search` on an empty table just return `[]`.

### Frontend-only dev loop (inside `web/`)
```shell
pnpm install       # restore deps from pnpm-lock.yaml
pnpm run dev       # Vite dev server (Remix SPA)
pnpm run build     # production build → build/client (what gets embedded)
pnpm run lint      # eslint
pnpm run typecheck # tsc --noEmit
```
Run a backend separately (`go run . --data <file>` after building the frontend,
or point at an existing binary) so the dev UI has an API to call.

> `esbuild` runs an install script, which pnpm blocks by default. It is
> explicitly allowed in `web/pnpm-workspace.yaml` (`allowBuilds: esbuild: true`);
> without that, `pnpm run build` fails its pre-run dependency check.

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
- **Pagination.** Loaders fetch `pageSize + 1` (or `+2` when resuming from a
  cursor position) rows on purpose, to detect whether a next page exists without
  a separate count. See `web/app/routes/*` and `DEFAULT_PAGE_SIZE` in `types.ts`.
- **Frontend is SPA-only.** Remix runs with `ssr: false`; routes use
  `clientLoader` (not server `loader`) and there is no Node server in production —
  the Go binary serves the static client build and the API.
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
  Tailwind plugin) + ESLint (`web/.eslintrc.cjs`). Use the `~/*` import alias for
  `web/app/*`. Styling is Tailwind utility classes.

## Reference

- README.md — user-facing install/build/run notes.
- libmdbx: https://github.com/erthink/libmdbx
- mdbx-go binding: https://github.com/erigontech/mdbx-go
