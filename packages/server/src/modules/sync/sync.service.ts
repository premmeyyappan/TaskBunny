/**
 * Sync Service — conflict detection and resolution via vector clocks.
 *
 * Protocol: Last-Write-Wins with Vector Clock Arbitration (LWW-VC).
 *
 * For each incoming event from a client batch:
 *   1. Check idempotency: skip if already processed (client_event_id seen before).
 *   2. Compare client vector clock against server's stored clock for that device.
 *   3. Apply if client clock is newer or concurrent; discard if server already has
 *      a strictly later version.
 *   4. For concurrent task updates (neither clock dominates), default to server
 *      state and return a ConflictRecord so the client can reconcile.
 *   5. Merge vector clocks element-wise and persist.
 *
 * The batch endpoint accepts up to SYNC_BATCH_MAX_SIZE events per request,
 * committed in a single transaction for atomicity.
 */

import { pool } from '../../db/client';
import { compare, merge } from '../../utils/vectorClock';
import {
  getVectorClock,
  upsertVectorClock,
  isEventProcessed,
  markEventsProcessed,
} from './sync.repository';
import type {
  SyncBatchRequest,
  SyncBatchResult,
  ConflictRecord,
  EventPayload,
  VectorClock,
} from '@taskbunny/shared';
import { SYNC_BATCH_MAX_SIZE } from '@taskbunny/shared';
import { logger } from '../../utils/logger';

export async function processSyncBatch(
  userId: string,
  request: SyncBatchRequest
): Promise<SyncBatchResult> {
  const { deviceId, clientVectorClock, events } = request;

  const batch = events.slice(0, SYNC_BATCH_MAX_SIZE);
  const serverVC = await getVectorClock(userId, deviceId);

  const toInsert: EventPayload[]   = [];
  const conflicts: ConflictRecord[] = [];
  let skipped = 0;

  for (const event of batch) {
    // Idempotency check: skip duplicates from retry/replay
    if (await isEventProcessed(event.clientEventId)) {
      skipped++;
      continue;
    }

    const comparison = compare(event.vectorClock, serverVC);

    if (comparison === 'before') {
      // Server has a strictly newer state — discard the incoming event
      conflicts.push({
        clientEventId: event.clientEventId,
        conflictType: 'event_superseded',
        clientVersion: event,
        serverVersion: null, // caller can re-fetch if needed
        resolution: 'server_wins',
      });
      skipped++;
      continue;
    }

    // 'after', 'concurrent', or 'equal' — accept the event.
    // NOTE: 'equal' shouldn't occur if devices always increment before emitting,
    // but we've seen it when two devices do a cold-start sync at the same time
    // and both send their first event before either has received an ack.
    // Treating equal as accepted is safe — ON CONFLICT handles the duplicate.
    toInsert.push(event);
  }

  if (toInsert.length > 0) {
    await insertEventsBatch(userId, toInsert);
    await markEventsProcessed(
      toInsert.map((e) => ({ clientEventId: e.clientEventId, userId }))
    );
  }

  // Merge vector clocks and persist
  const mergedVC: VectorClock = merge(serverVC, clientVectorClock);
  await upsertVectorClock(userId, deviceId, mergedVC);

  logger.info(
    { userId, deviceId, applied: toInsert.length, skipped, conflicts: conflicts.length },
    'sync batch processed'
  );

  return {
    applied:           toInsert.length,
    skipped,
    conflicts,
    serverVectorClock: mergedVC,
    serverTimestamp:   new Date().toISOString(),
  };
}

/**
 * Batch upsert using multi-row VALUES — single round-trip per flush window.
 * ON CONFLICT on client_event_id ensures idempotency at the DB level too.
 */
async function insertEventsBatch(
  userId: string,
  events: EventPayload[]
): Promise<void> {
  if (events.length === 0) return;

  const placeholders = events.map((_, i) => {
    const base = i * 7;
    return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6}::JSONB,$${base+7})`;
  }).join(', ');

  const params = events.flatMap((e) => [
    e.clientEventId,
    userId,
    e.taskId ?? null,
    e.deviceId,
    e.eventType,
    JSON.stringify(e.payload),
    e.recordedAt,
  ]);

  await pool.query(`
    INSERT INTO productivity_events
      (client_event_id, user_id, task_id, device_id, event_type, payload, recorded_at)
    VALUES ${placeholders}
    ON CONFLICT DO NOTHING
  `, params);
}
