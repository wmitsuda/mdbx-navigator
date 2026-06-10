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
- **Node** 20.10.0 (pinned in `web/.nvmrc`; run `nvm install` inside `web/`).
- **goreleaser** for producing the embedded single-binary build.

### Full binary (frontend embedded)
```shell
goreleaser build --snapshot --clean --single-target
```
goreleaser's `before` hooks run `go mod tidy`, `npm --prefix web ci`, and
`npm --prefix web run build` first, then builds the Go binary. The output lands
in `./dist/mdbx-navigator_<arch>/`.

> Important: the Go build embeds `web/build/client` via `//go:embed all:build/client`.
> A plain `go build ./...` **fails** unless that directory exists. Build the
> frontend first (`npm --prefix web run build`) or use goreleaser, which does it
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

### Frontend-only dev loop (inside `web/`)
```shell
npm run dev        # Vite dev server (Remix SPA)
npm run build      # production build → build/client (what gets embedded)
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```
Run a backend separately (`go run . --data <file>` after building the frontend,
or point at an existing binary) so the dev UI has an API to call.

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
