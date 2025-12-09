import { query, queryOne } from '../../db/client';
import type { TimeSeriesBucket, BehaviorWindow, FocusSession, ScoreDataPoint } from '@taskbunny/shared';

/**
 * Fetch daily event counts and completed task counts for a user
 * over the requested window, bucketed by calendar day.
 *
 * Uses the idx_events_user_time partial index (003_indexes.sql).
 */
export async function getDailyBuckets(
  userId: string,
  windowDays: number
): Promise<TimeSeriesBucket[]> {
  const rows = await query<TimeSeriesBucket>(`
    SELECT
      date_trunc('day', e.recorded_at) AS bucket,
      COUNT(*) FILTER (WHERE e.event_type = 'task_completed') AS "tasksCompleted",
      COUNT(*) AS "eventsCount",
      COALESCE(s.score, 0) AS score
    FROM productivity_events e
    LEFT JOIN productivity_scores s
      ON s.user_id = e.user_id
      AND date_trunc('day', s.computed_at) = date_trunc('day', e.recorded_at)
    WHERE e.user_id = $1
      AND e.recorded_at >= now() - ($2 || ' days')::INTERVAL
    GROUP BY 1, s.score
    ORDER BY 1 ASC
  `, [userId, windowDays]);

  return rows;
}

/**
 * Reconstruct focus sessions from raw task_started / task_paused /
 * task_completed events for a user in the given window.
 *
 * A session is a contiguous block of activity on one task where no gap
 * between consecutive events exceeds FOCUS_SESSION_GAP_MS (10 minutes).
 */
export async function getFocusSessions(
  userId: string,
  windowStart: Date,
  windowEnd: Date
): Promise<FocusSession[]> {
  const rows = await query<{
    task_id: string;
    event_type: string;
    recorded_at: Date;
  }>(`
    SELECT task_id, event_type, recorded_at
    FROM productivity_events
    WHERE user_id = $1
      AND recorded_at BETWEEN $2 AND $3
      AND task_id IS NOT NULL
      AND event_type IN ('task_started', 'task_paused', 'task_resumed', 'task_completed', 'interruption')
    ORDER BY task_id, recorded_at ASC
  `, [userId, windowStart, windowEnd]);

  return buildSessions(rows);
}

function buildSessions(
  rows: Array<{ task_id: string; event_type: string; recorded_at: Date }>
): FocusSession[] {
  const sessionsByTask = new Map<string, typeof rows>();
  for (const row of rows) {
    if (!sessionsByTask.has(row.task_id)) sessionsByTask.set(row.task_id, []);
    sessionsByTask.get(row.task_id)!.push(row);
  }

  const sessions: FocusSession[] = [];
  const GAP_MS = 10 * 60 * 1000;

  for (const [taskId, events] of sessionsByTask) {
    let sessionStart = events[0].recorded_at;
    let lastTime = sessionStart;
    let interrupted = false;

    for (let i = 1; i < events.length; i++) {
      const gap = new Date(events[i].recorded_at).getTime() - new Date(lastTime).getTime();
      if (events[i].event_type === 'interruption') interrupted = true;

      if (gap > GAP_MS || events[i].event_type === 'task_paused') {
        sessions.push({
          taskId,
          startedAt: sessionStart,
          endedAt: lastTime,
          durationMs: new Date(lastTime).getTime() - new Date(sessionStart).getTime(),
          interrupted,
        });
        sessionStart = events[i].recorded_at;
        interrupted = false;
      }
      lastTime = events[i].recorded_at;
    }

    // Close open session
    sessions.push({
      taskId,
      startedAt: sessionStart,
      endedAt: lastTime,
      durationMs: new Date(lastTime).getTime() - new Date(sessionStart).getTime(),
      interrupted,
    });
  }

  return sessions;
}

export async function getBehaviorWindows(
  userId: string
): Promise<BehaviorWindow[]> {
  return query<BehaviorWindow>(`
    SELECT user_id AS "userId", window_type AS "windowType",
           metric_key AS "metricKey", metric_value AS "metricValue",
           computed_at AS "computedAt"
    FROM behavior_windows
    WHERE user_id = $1
    ORDER BY computed_at DESC
  `, [userId]);
}

/**
 * Fetch the user's score history for longitudinal regression analysis.
 * Returns one row per scoring run, ordered oldest-first so the regression
 * index (x-axis) maps to chronological position.
 */
export async function getScoreHistory(
  userId: string,
  days: number
): Promise<ScoreDataPoint[]> {
  return query<ScoreDataPoint>(`
    SELECT
      score,
      computed_at  AS "computedAt",
      window_start AS "windowStart",
      window_end   AS "windowEnd"
    FROM productivity_scores
    WHERE user_id = $1
      AND computed_at >= now() - ($2 || ' days')::INTERVAL
    ORDER BY computed_at ASC
  `, [userId, days]);
}

export async function getHistoricalAvgStoryPoints(
  userId: string
): Promise<number> {
  const row = await queryOne<{ avg: string }>(`
    SELECT COALESCE(metric_value, 0)::TEXT AS avg
    FROM behavior_windows
    WHERE user_id = $1
      AND window_type = '30d'
      AND metric_key = 'avg_story_points_per_7d'
    ORDER BY computed_at DESC
    LIMIT 1
  `, [userId]);
  return parseFloat(row?.avg ?? '0');
}
