# Sync Protocol

TaskBunny uses **Last-Write-Wins with Vector Clock Arbitration (LWW-VC)** to resolve conflicts when a user edits tasks on multiple devices while offline.

## Why Vector Clocks?

Naive timestamp-based LWW fails silently when device clocks are skewed or when two writes happen "at the same time" on different devices. Vector clocks detect the actual causal relationship between events without requiring clock synchronisation.

## Data Structures

### VectorClock

```ts
type VectorClock = Record<string, number>; // { deviceId: logicalTimestamp }
```

Each device maintains its own counter. Before emitting any event, the device increments its counter:

```ts
// Before emitting:
vc[deviceId] += 1;
event.vectorClock = { ...vc };
```

### SyncVector (server-side)

The server persists the last known merged vector clock per `(userId, deviceId)` pair in the `sync_vectors` table. This is the "ground truth" the server uses to arbitrate conflicts.

## Sync Batch Flow

```
Client                              Server
  |                                    |
  |-- POST /sync/batch --------------->|
  |   { deviceId, clientVC, events }   |
  |                                    |
  |                      load serverVC |
  |                      for each event:
  |                        compare(event.vc, serverVC)
  |                        'after'      → apply
  |                        'before'     → discard, add to conflicts
  |                        'concurrent' → apply (server logs conflict)
  |                        'equal'      → idempotent skip
  |                      merge VCs     |
  |                      persist       |
  |<-- { applied, conflicts, serverVC }|
  |                                    |
  | merge serverVC into local VC       |
  | surface conflicts to user          |
```

## Conflict Cases

| Case | Condition | Resolution |
|---|---|---|
| Client ahead | `compare(clientVC, serverVC) == 'after'` | Apply client event |
| Server ahead | `compare(clientVC, serverVC) == 'before'` | Discard, return server state |
| Concurrent | Neither dominates | Apply client; return `ConflictRecord` |
| Duplicate | `clientEventId` already in `processed_event_ids` | Skip (idempotent) |

## Offline Caching

Events that cannot be delivered (no network) are persisted to `AsyncStorage` in the offline queue (`offline.service.ts`). The queue is drained in FIFO order when the device comes online (`useNetworkStatus` + `useSync`).

Queue limits:
- Max size: 10,000 events (oldest dropped when exceeded)
- Flush batch size: 100 events per POST
- Storage key: `@taskbunny/offline_queue`

## Idempotency

Every event has a `clientEventId` (UUID v4). The server checks `processed_event_ids` before inserting. Re-delivered events (common after network retry) are silently skipped without error.
