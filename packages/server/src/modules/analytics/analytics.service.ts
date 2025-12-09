import { subDays } from '../../utils/dateUtils';
import { computeProductivityScore } from './scoring.engine';
import { computeTrendAnalysis } from './trend.analysis';
import {
  getDailyBuckets,
  getFocusSessions,
  getHistoricalAvgStoryPoints,
  getScoreHistory,
} from './timeseries.repository';
import { query, queryOne } from '../../db/client';
import type { ProductivityScore, TimeSeriesBucket, ScoringInput, TrendAnalysis } from '@taskbunny/shared';
import { SCORING_WINDOW_DAYS } from '@taskbunny/shared';
import { pool } from '../../db/client';

export async function computeAndPersistScore(userId: string): Promise<ProductivityScore> {
  const windowEnd   = new Date();
  const windowStart = subDays(windowEnd, SCORING_WINDOW_DAYS);

  const [taskStats, focusSessions, historicalAvg] = await Promise.all([
    getTaskStats(userId, windowStart, windowEnd),
    getFocusSessions(userId, windowStart, windowEnd),
    getHistoricalAvgStoryPoints(userId),
  ]);

  const input: ScoringInput = {
    userId,
    windowStart,
    windowEnd,
    ...taskStats,
    focusSessions,
    historicalAvgStoryPoints: historicalAvg,
  };

  const scored = computeProductivityScore(input);

  // Persist for trend chart
  await pool.query(`
    INSERT INTO productivity_scores
      (user_id, score, completion_rate, velocity_index, focus_depth,
       consistency_score, overdue_ratio, window_start, window_end, computed_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `, [
    userId,
    scored.score,
    scored.completionRate,
    scored.velocityIndex,
    scored.focusDepth,
    scored.consistencyScore,
    scored.overdueRatio,
    scored.windowStart,
    scored.windowEnd,
    scored.computedAt,
  ]);

  return scored;
}

export async function getTrend(
  userId: string,
  windowDays: number
): Promise<TimeSeriesBucket[]> {
  return getDailyBuckets(userId, windowDays);
}

/**
 * Run OLS linear regression over the user's score history and return a
 * longitudinal trend analysis: slope, R², trend classification, and a
 * 4-week score projection.
 */
export async function getLongitudinalAnalysis(
  userId: string,
  windowDays = 90
): Promise<TrendAnalysis> {
  const scores = await getScoreHistory(userId, windowDays);
  return computeTrendAnalysis(scores, windowDays);
}

export async function getLatestScore(userId: string): Promise<ProductivityScore | null> {
  return queryOne<ProductivityScore>(`
    SELECT
      score, completion_rate AS "completionRate", velocity_index AS "velocityIndex",
      focus_depth AS "focusDepth", consistency_score AS "consistencyScore",
      overdue_ratio AS "overdueRatio",
      window_start AS "windowStart", window_end AS "windowEnd",
      computed_at AS "computedAt"
    FROM productivity_scores
    WHERE user_id = $1
    ORDER BY computed_at DESC
    LIMIT 1
  `, [userId]);
}

async function getTaskStats(
  userId: string,
  windowStart: Date,
  windowEnd: Date
): Promise<Pick<
  ScoringInput,
  'tasksCompleted' | 'tasksDueInWindow' | 'tasksOverdue' |
  'tasksTotal' | 'storyPointsCompleted' | 'activeDays'
>> {
  const row = await queryOne<{
    tasks_completed: string;
    tasks_due: string;
    tasks_overdue: string;
    tasks_total: string;
    story_points_completed: string;
    active_days: string;
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed' AND completed_at BETWEEN $2 AND $3) AS tasks_completed,
      COUNT(*) FILTER (WHERE due_at BETWEEN $2 AND $3) AS tasks_due,
      COUNT(*) FILTER (WHERE status != 'completed' AND status != 'cancelled' AND due_at < $3) AS tasks_overdue,
      COUNT(*) AS tasks_total,
      COALESCE(SUM(story_points) FILTER (WHERE status = 'completed' AND completed_at BETWEEN $2 AND $3), 0) AS story_points_completed,
      (
        SELECT COUNT(DISTINCT date_trunc('day', recorded_at))
        FROM productivity_events
        WHERE user_id = $1 AND event_type = 'task_completed'
          AND recorded_at BETWEEN $2 AND $3
      ) AS active_days
    FROM tasks
    WHERE user_id = $1
  `, [userId, windowStart, windowEnd]);

  return {
    tasksCompleted:       parseInt(row?.tasks_completed ?? '0'),
    tasksDueInWindow:     parseInt(row?.tasks_due ?? '0'),
    tasksOverdue:         parseInt(row?.tasks_overdue ?? '0'),
    tasksTotal:           parseInt(row?.tasks_total ?? '0'),
    storyPointsCompleted: parseInt(row?.story_points_completed ?? '0'),
    activeDays:           parseInt(row?.active_days ?? '0'),
  };
}
