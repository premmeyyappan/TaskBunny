# TaskBunny

Personal productivity tracker with cross-device sync and behavioral analytics.

**Stack:** React Native (Expo) · Node.js · PostgreSQL · WebSockets · Docker

---

## What it does

TaskBunny lets you manage tasks across multiple devices and tracks your productivity patterns over time. Events (task started, paused, completed, etc.) are recorded as they happen and synced in the background. The server runs a weekly scoring pass that turns raw activity into a 0–100 productivity score with sub-metrics for completion rate, focus depth, and consistency.

The analytics screen shows a daily-bucket trend chart for any 7/30/90-day window and a linear-regression slope so you can see if things are actually getting better or just feeling that way.

---

## Repository layout

```
packages/
  shared/    TypeScript types and algorithm constants (imported by server + mobile)
  server/    Node.js API — Express, ws, pg
  mobile/    React Native app — Expo, Redux Toolkit, React Navigation
docs/
  architecture.md       High-level system design and data-flow diagrams
  sync-protocol.md      How conflict resolution works (vector clocks, LWW)
  api-spec.yaml         OpenAPI 3.0 spec
  benchmark-results.md  Query plan comparisons from explain-queries.sh
scripts/
  benchmark.sh          Throughput load test (wrk / curl loop)
  seed-events.sh        Populate a dev database with realistic test data
  explain-queries.sh    Capture EXPLAIN ANALYZE before/after indexes
```

---

## Getting started

### Prerequisites

- Docker + Docker Compose
- Node.js 18+

### Run with Docker

```bash
cp .env.example .env        # set DB_PASSWORD and JWT_SECRET
docker-compose up -d
bash scripts/seed-events.sh # optional: load test data
```

API available at `http://localhost:3000`.

### Run locally (no Docker)

```bash
npm install
cp .env.example .env
# Start PostgreSQL separately, then update DATABASE_URL in .env
npm run dev --workspace=packages/server
```

### Mobile

```bash
cd packages/mobile
npx expo start
```

Point `EXPO_PUBLIC_API_URL` at your running server.

---

## Running tests

```bash
npm test --workspaces --if-present
```

Tests live in `packages/mobile/__tests__/` and cover the scoring algorithm, vector clock operations, and offline queue behaviour.

---

## Architecture notes

See [`docs/architecture.md`](docs/architecture.md) for a full write-up. Short version:

- **Sync** uses a Last-Write-Wins protocol with vector clock arbitration (LWW-VC). Each device increments its own clock component on every write; the server merges clocks and detects concurrent edits. Details in [`docs/sync-protocol.md`](docs/sync-protocol.md).
- **Events** are buffered in a 200 ms batch window on the server before a single multi-row `INSERT`, reducing round-trips under burst load.
- **Analytics** run server-side on a `productivity_events` table that is range-partitioned by month. Pre-aggregated `behavior_windows` rows keep the dashboard fast on large histories.
- **Offline** events are queued in AsyncStorage and drained in 100-event batches when the device comes back online.
