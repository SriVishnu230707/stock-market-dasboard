# Ticker Room — Real-Time Stock Dashboard (MERN)

A working full-stack demo: MongoDB + Express + React + Node, with live price
updates over Socket.IO, server-side alert evaluation, watchlists, and a
paper-trading portfolio.

Prices are **simulated** (a random walk on the server), not a real market
feed — see "Swapping in a real market feed" below for how to change that
without touching the frontend.

## Project layout

```
server/   Express API + Socket.IO + Mongoose models
client/   Vite + React frontend
```

## 1. Prerequisites

- Node.js 18+
- A MongoDB instance — either:
  - **Local**: install MongoDB Community Server and run `mongod`, or
  - **Atlas** (free tier): create a cluster at mongodb.com/atlas and copy its
    connection string.

## 2. Run the server

```bash
cd server
npm install
cp .env.example .env
# edit .env: set MONGO_URI (local mongod URI works out of the box) and JWT_SECRET
npm run dev
```

You should see:
```
[mongo] connected -> mongodb://127.0.0.1:27017/stockdash
[seed] inserted 8 stocks
[server] listening on http://localhost:4000
```

The stock list is seeded automatically on first boot (idempotent — safe to
restart). Health check: `curl http://localhost:4000/api/health`.

## 3. Run the client

In a second terminal:

```bash
cd client
npm install
npm run dev
```

Open http://localhost:5173, register an account, and you're in. The Vite
dev server proxies `/api` to `http://localhost:4000` (see `vite.config.js`);
the Socket.IO connection talks to port 4000 directly.

## 4. The two-account real-time demo

This is the single best way to show that this is actually real-time, not a
page that refreshes on a timer:

1. Register two accounts in two browser windows (or one normal + one
   incognito).
2. In account A, create an alert: e.g. `RELIANCE crosses above 2850`.
3. Watch the Dashboard in account B — prices update every ~1.5s with no
   reload.
4. Within a few ticks, account A gets a toast notification the moment the
   alert fires — account B never sees it, because alerts are private
   (Socket.IO rooms, one per user).
5. In account B, buy some shares on the Portfolio tab and watch the P&L
   column move on its own as the price keeps ticking.

## How the real-time pieces fit together

- **One upstream feed, many subscribers.** A single `setInterval` on the
  server (`server/lib/market.js`) generates the next tick for all 8 stocks
  and broadcasts it to every connected socket via the `"market"` room.
  Browsers never talk to a market-data provider directly — see module 18 in
  the original design doc for why that matters at scale.
- **Hot path stays in memory.** Current prices live in
  `server/lib/priceCache.js`, not in a database query, so a 1.5s tick loop
  never waits on Mongo. Every ~30s (`FLUSH_EVERY_N_TICKS`), the server
  flushes an aggregated candle to the `Candle` collection and snapshots
  current prices back onto the `Stock` documents — the "raw tick → 1-minute
  candle → long-term storage" pattern, so a restart doesn't lose much.
- **Alerts are indexed by symbol**, not scanned linearly
  (`server/lib/alertIndex.js`), so evaluating "did anything just cross a
  threshold" costs a map lookup per stock per tick, not a table scan.
- **Auth over both REST and sockets.** The same JWT the browser gets from
  `/api/auth/login` is sent again in the Socket.IO handshake
  (`socket.handshake.auth.token`) and verified with the same secret
  (`server/lib/auth.js`).

## Swapping in a real market feed

Replace the body of the tick handler in `server/lib/market.js`
(`priceCache.tickAll()`) with a handler fed by your provider's WebSocket
(e.g. Finnhub) or a historical-data replay loop. Nothing else needs to
change — the cache shape, alert engine, and Socket.IO broadcast are already
provider-agnostic.

## Running from any IDE (VS Code, WebStorm, terminal, etc.)

The project has no editor lock-in — it's plain Node + Vite, runnable from any
terminal. From the repo root:

```bash
npm install          # installs root tooling (eslint, prettier, concurrently)
npm run install:all  # installs server/ and client/ dependencies
cp server/.env.example server/.env   # then fill in MONGO_URI, JWT_SECRET
npm run dev           # runs server + client together, labeled output
```

`npm run dev` at the root uses `concurrently` to run both apps in one
terminal with color-coded `[SERVER]` / `[CLIENT]` prefixes — no need to open
two terminal tabs. Individual scripts (`npm run dev:server`, `npm run
dev:client`, `npm run lint`, `npm run format`) work the same way in any
shell or IDE task runner.

A root `.editorconfig` and `.nvmrc` (Node 20) keep indentation and Node
version consistent regardless of which editor opens the project.

### VS Code specifics

Opening the folder in VS Code will prompt you to install the recommended
extensions (`.vscode/extensions.json`). Current marketplace versions as of
this writing — **check the Extensions panel for newer patches, since these
update frequently**:

| Extension | Marketplace ID | Version (verified) |
|---|---|---|
| ESLint | `dbaeumer.vscode-eslint` | 3.0.34 |
| Prettier - Code formatter | `esbenp.prettier-vscode` | 12.4.0 |
| MongoDB for VS Code | `mongodb.mongodb-vscode` | ~1.14.x |
| DotENV | `mikestead.dotenv` | 1.0.1 |
| ES7+ React/Redux/React-Native snippets | `rodrigovallades.es7-react-js-snippets` | latest (see note) |
| EditorConfig for VS Code | `editorconfig.editorconfig` | latest |

**Note on the React snippets extension:** the original `dsznajder.es7-react-js-snippets`
package is no longer actively maintained; `rodrigovallades.es7-react-js-snippets`
is the community fork with 3M+ installs that's currently kept up to date.
Either works for snippets (`rfc`, `useState`, etc.) — this is a convenience
extension, not a functional dependency.

`.vscode/settings.json` wires Prettier as the default formatter with
format-on-save, and points ESLint at the root flat config. `.vscode/launch.json`
provides three debug targets from the Run and Debug panel:

- **Server: Debug (Node)** — runs the server with the debugger attached and auto-restarts on file changes.
- **Client: Launch Chrome** — starts the Vite dev server (via `.vscode/tasks.json`) and opens it in a debuggable Chrome instance.
- **Full Stack: Server + Chrome** — both at once.

None of this is required — `npm run dev` from a plain terminal works
identically inside or outside VS Code.

## What's deliberately left out

To keep this buildable end-to-end: no password reset, no admin dashboard,
technical indicators are limited to SMA(10), and there's no news
integration or AI assistant module. These were flagged as out-of-scope in
the original project write-up's 4-day plan — add them incrementally once
the core loop above is solid.
