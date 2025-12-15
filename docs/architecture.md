# Architecture

## Overview

TaskBunny is a distributed productivity analytics system composed of three packages in a npm workspace monorepo:

```
packages/
  shared/   — TypeScript types, scoring constants, sync constants
  server/   — Node.js REST + WebSocket API, PostgreSQL
  mobile/   — React Native (Expo) client
```

## Data Flow

```
Mobile App
  │
  ├── User action (complete task, start session)
  │       │
  │       ▼
  │   eventFactory.makeEvent()
  │       │
  │       ▼
  │   offline.service.enqueue()        ← persists to AsyncStorage
  │       │
  │   (online?)
  │       │ yes
  │       ▼
  │   sync.service.flushOnce()
  │       │
  │       ▼
  │   POST /sync/batch ─────────────────────────────────┐
  │                                                     │
Server                                                  │
  ├── auth.middleware.requireAuth()                     │
  ├── rateLimit (5,000 events/device/day)               │
  ├── sync.service.processSyncBatch()                   │
  │       ├── vectorClock.compare() per event           │
  │       ├── insertEventsBatch() — single multi-row INSERT
  │       └── upsertVectorClock()                       │
  └── Response: { applied, conflicts, serverVectorClock }
          │
  Mobile  │
  └── merge serverVC into local VC
      └── surface conflicts if any
```

## WebSocket

After a sync batch is accepted, `ws.broadcaster.broadcastToUser()` pushes a `sync_complete` event to all other devices belonging to the same user. This allows a second device to know it should re-fetch tasks without polling.

Score updates are also pushed over WebSocket after `computeAndPersistScore()` runs, so the dashboard reflects new scores in real-time.

## Time-Series Schema

`productivity_events` is range-partitioned by month on `recorded_at`. This means:

- Queries scoped to `WHERE recorded_at > now() - interval '7 days'` touch only the current month's partition.
- Old partitions can be archived or dropped without affecting the hot path.
- PostgreSQL's partition pruning eliminates irrelevant partitions at plan time.

`productivity_scores` and `behavior_windows` are pre-aggregated derived tables that power the dashboard without requiring full-table aggregations on every load.

## Productivity Scoring

The scoring algorithm runs server-side in `scoring.engine.ts` as a pure function with no database dependencies. Inputs are fetched separately (`analytics.service.ts`) and injected. This makes the algorithm independently unit-testable (see `__tests__/scoring.test.ts`).

Weights are defined in `packages/shared/src/constants/scoring.ts` so they are auditable without running the server.

## Offline Support

The mobile client queues all events to AsyncStorage before attempting to send them. If the network is unavailable, events accumulate in the queue. When `useNetworkStatus` detects the device is online, `triggerSync` is dispatched, draining the queue in FIFO batches of 100.

The `SyncStatusBanner` component reflects real-time sync state from the Redux `sync` slice.
