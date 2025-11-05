import { pool, query } from '../../db/client';
import type { EventPayload } from '@taskbunny/shared';

export async function insertEvents(
  userId: string,
  events: EventPayload[]
): Promise<void> {
  if (events.length === 0) return;

  const placeholders = events.map((_, i) => {
    const b = i * 7;
    return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6}::JSONB,$${b+7})`;
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

export async function getRecentEvents(
  userId: string,
  since: Date,
  limit = 100
): Promise<EventPayload[]> {
  return query<EventPayload>(`
    SELECT
      client_event_id AS "clientEventId",
      user_id AS "userId",
      task_id AS "taskId",
      device_id AS "deviceId",
      event_type AS "eventType",
      payload,
      recorded_at AS "recordedAt"
    FROM productivity_events
    WHERE user_id = $1 AND recorded_at >= $2
    ORDER BY recorded_at DESC
    LIMIT $3
  `, [userId, since, limit]);
}
