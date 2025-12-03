/**
 * Productivity Scoring Engine
 *
 * Pure function: takes a ScoringInput describing one user's activity over a
 * trailing 7-day window and returns a ProductivityScore in [0, 100].
 *
 * Weights are defined in @taskbunny/shared/constants/scoring so they can be
 * audited independently of the server runtime.
 *
 * Sub-metric breakdown:
 *   CompletionRate  (35%) — tasks finished vs tasks due in window
 *   VelocityIndex   (25%) — story points vs personal 30-day baseline
 *   FocusDepth      (20%) — median uninterrupted session vs 90-min anchor
 *   Consistency     (15%) — active days / 7
 *   OverduePenalty   (5%) — inverted overdue task ratio
 */

import {
  SCORING_WEIGHTS,
  FOCUS_DEPTH_ANCHOR_MIN,
  DEEP_WORK_THRESHOLD_MIN,
  FOCUS_SESSION_GAP_MS,
} from '@taskbunny/shared';
import type { FocusSession, ProductivityScore, ScoringInput } from '@taskbunny/shared';

export function computeProductivityScore(input: ScoringInput): ProductivityScore {
  const completionRate   = computeCompletionRate(input);
  const velocityIndex    = computeVelocityIndex(input);
  const focusDepth       = computeFocusDepth(input.focusSessions);
  const consistencyScore = computeConsistency(input);
  const overdueRatio     = computeOverdueRatio(input);

  const rawScore =
    completionRate   * SCORING_WEIGHTS.COMPLETION_RATE +
    velocityIndex    * SCORING_WEIGHTS.VELOCITY_INDEX  +
    focusDepth       * SCORING_WEIGHTS.FOCUS_DEPTH     +
    consistencyScore * SCORING_WEIGHTS.CONSISTENCY     +
    overdueRatio     * SCORING_WEIGHTS.OVERDUE_PENALTY;

  const score = Math.round(Math.max(0, Math.min(1, rawScore)) * 10000) / 100;

  return {
    score,
    completionRate,
    velocityIndex,
    focusDepth,
    consistencyScore,
    overdueRatio,
    windowStart: input.windowStart,
    windowEnd:   input.windowEnd,
    computedAt:  new Date(),
  };
}

/**
 * Ratio of tasks completed to tasks due in the scoring window.
 * Falls back to the 30-day historical average if no tasks were due.
 */
function computeCompletionRate(input: ScoringInput): number {
  if (input.tasksDueInWindow === 0) {
    // No tasks due — use historical baseline so chronic non-planners
    // aren't rewarded with a perfect rate
    return Math.min(input.historicalAvgStoryPoints > 0 ? 0.7 : 0.5, 1);
  }
  return clamp(input.tasksCompleted / input.tasksDueInWindow);
}

/**
 * Story points completed vs personal 30-day rolling average.
 * Values above baseline are clamped to 1.0 to prevent single-burst inflation.
 */
function computeVelocityIndex(input: ScoringInput): number {
  if (input.historicalAvgStoryPoints === 0) return 0.5; // no history yet
  return clamp(input.storyPointsCompleted / input.historicalAvgStoryPoints);
}

/**
 * Median uninterrupted focus session duration normalised against a 90-minute anchor.
 * Sessions are derived from raw events by collapsing gaps < FOCUS_SESSION_GAP_MS.
 */
function computeFocusDepth(sessions: FocusSession[]): number {
  // TODO: count interrupted sessions at half-weight rather than dropping them
  // entirely — right now someone who does 3 × 50-min sessions but gets pulled
  // into a meeting during each one scores 0 focus depth, which feels wrong.
  // Punting for now; want to see real usage data before deciding on the weight.
  const continuousSessions = sessions.filter(
    (s) => s.durationMs >= DEEP_WORK_THRESHOLD_MIN * 60 * 1000 && !s.interrupted
  );
  if (continuousSessions.length === 0) return 0;

  const medianMinutes = medianDurationMin(continuousSessions);
  return clamp(medianMinutes / FOCUS_DEPTH_ANCHOR_MIN);
}

/**
 * Fraction of days in the 7-day window where at least one task was completed.
 * Rewards showing up consistently rather than burst-working.
 */
function computeConsistency(input: ScoringInput): number {
  return clamp(input.activeDays / 7);
}

/**
 * Inverted overdue ratio — contributes full weight when no tasks are overdue.
 */
function computeOverdueRatio(input: ScoringInput): number {
  if (input.tasksTotal === 0) return 1;
  const overdueRate = input.tasksOverdue / input.tasksTotal;
  return clamp(1 - overdueRate);
}

function medianDurationMin(sessions: FocusSession[]): number {
  const sorted = sessions
    .map((s) => s.durationMs / 60000)
    .sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export { FOCUS_SESSION_GAP_MS };
