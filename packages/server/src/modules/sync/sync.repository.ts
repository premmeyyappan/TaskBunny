import { query, queryOne, pool } from '../../db/client';
import type { VectorClock, SyncCheckpoint } from '@taskbunny/shared';

export async function getVectorClock(
  userId: string,
  deviceId: string
): Promise<VectorClock> {
  const row = await queryOne<{ vector_clock: VectorClock }>(`
    SELECT vector_clock FROM sync_vectors
    WHERE user_id = $1 AND device_id = $2
  `, [userId, deviceId]);
  return row?.vector_clock ?? {};
}

export async function upsertVectorClock(
  userId: string,
  deviceId: string,
  vectorClock: VectorClock
): Promise<void> {
  await pool.query(`
    INSERT INTO sync_vectors (user_id, device_id, vector_clock, last_synced_at)
    VALUES ($1, $2, $3, now())
    ON CONFLICT (user_id, device_id)
    DO UPDATE SET vector_clock = $3, last_synced_at = now()
  `, [userId, deviceId, JSON.stringify(vectorClock)]);
}

export async function isEventProcessed(clientEventId: string): Promise<boolean> {
  const row = await queryOne<{ client_event_id: string }>(`
    SELECT client_event_id FROM processed_event_ids
    WHERE client_event_id = $1
  `, [clientEventId]);
  return row !== null;
}

export async function markEventsProcessed(
  eventIds: Array<{ clientEventId: string; userId: string }>
): Promise<void> {
  if (eventIds.length === 0) return;
  const values = eventIds
    .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2}, now())`)
    .join(', ');
  const params = eventIds.flatMap((e) => [e.clientEventId, e.userId]);
  await pool.query(
    `INSERT INTO processed_event_ids (client_event_id, user_id, processed_at)
     VALUES ${values}
     ON CONFLICT (client_event_id) DO NOTHING`,
    params
  );
}

export async function getCheckpoint(
  userId: string,
  deviceId: string
): Promise<SyncCheckpoint | null> {
  const row = await queryOne<{
    user_id: string; device_id: string;
    vector_clock: VectorClock; last_synced_at: string;
  }>(`
    SELECT user_id, device_id, vector_clock, last_synced_at
    FROM sync_vectors
    WHERE user_id = $1 AND device_id = $2
  `, [userId, deviceId]);

  if (!row) return null;
  return {
    userId: row.user_id,
    deviceId: row.device_id,
    vectorClock: row.vector_clock,
    lastSyncedAt: row.last_synced_at,
  };
}
