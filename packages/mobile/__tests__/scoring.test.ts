import { computeProductivityScore } from '../../server/src/modules/analytics/scoring.engine';
import type { ScoringInput } from '@taskbunny/shared';

const BASE_INPUT: ScoringInput = {
  userId:                   'test-user',
  windowStart:              new Date('2024-01-01'),
  windowEnd:                new Date('2024-01-08'),
  tasksCompleted:           8,
  tasksDueInWindow:         10,
  tasksOverdue:             1,
  tasksTotal:               15,
  storyPointsCompleted:     20,
  historicalAvgStoryPoints: 18,
  activeDays:               6,
  focusSessions: [
    { taskId: 't1', startedAt: new Date(), endedAt: new Date(), durationMs: 45 * 60 * 1000, interrupted: false },
    { taskId: 't2', startedAt: new Date(), endedAt: new Date(), durationMs: 90 * 60 * 1000, interrupted: false },
    { taskId: 't3', startedAt: new Date(), endedAt: new Date(), durationMs: 30 * 60 * 1000, interrupted: true },
  ],
};

describe('computeProductivityScore', () => {
  test('returns a score in [0, 100]', () => {
    const result = computeProductivityScore(BASE_INPUT);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test('all sub-metrics are in [0, 1]', () => {
    const result = computeProductivityScore(BASE_INPUT);
    expect(result.completionRate).toBeGreaterThanOrEqual(0);
    expect(result.completionRate).toBeLessThanOrEqual(1);
    expect(result.velocityIndex).toBeGreaterThanOrEqual(0);
    expect(result.velocityIndex).toBeLessThanOrEqual(1);
    expect(result.focusDepth).toBeGreaterThanOrEqual(0);
    expect(result.focusDepth).toBeLessThanOrEqual(1);
    expect(result.consistencyScore).toBeGreaterThanOrEqual(0);
    expect(result.consistencyScore).toBeLessThanOrEqual(1);
    expect(result.overdueRatio).toBeGreaterThanOrEqual(0);
    expect(result.overdueRatio).toBeLessThanOrEqual(1);
  });

  test('perfect input scores close to 100', () => {
    const perfect: ScoringInput = {
      ...BASE_INPUT,
      tasksCompleted: 10, tasksDueInWindow: 10, tasksOverdue: 0,
      storyPointsCompleted: 20, historicalAvgStoryPoints: 20,
      activeDays: 7,
      focusSessions: [
        { taskId: 't1', startedAt: new Date(), endedAt: new Date(), durationMs: 90 * 60 * 1000, interrupted: false },
        { taskId: 't2', startedAt: new Date(), endedAt: new Date(), durationMs: 120 * 60 * 1000, interrupted: false },
      ],
    };
    const result = computeProductivityScore(perfect);
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  test('zero activity scores low', () => {
    const zero: ScoringInput = {
      ...BASE_INPUT,
      tasksCompleted: 0, tasksDueInWindow: 5, tasksOverdue: 5,
      storyPointsCompleted: 0, historicalAvgStoryPoints: 10,
      activeDays: 0, focusSessions: [],
    };
    const result = computeProductivityScore(zero);
    expect(result.score).toBeLessThan(20);
  });

  test('score includes computedAt timestamp', () => {
    const result = computeProductivityScore(BASE_INPUT);
    expect(result.computedAt).toBeInstanceOf(Date);
  });

  test.todo('interrupted sessions should contribute partial focus depth credit');

  test('weights are applied proportionally (completion rate dominates)', () => {
    const highCompletion: ScoringInput = {
      ...BASE_INPUT,
      tasksCompleted: 10, tasksDueInWindow: 10,
      storyPointsCompleted: 5, historicalAvgStoryPoints: 20, // low velocity
      activeDays: 3, focusSessions: [],
    };
    const lowCompletion: ScoringInput = {
      ...BASE_INPUT,
      tasksCompleted: 1, tasksDueInWindow: 10,
      storyPointsCompleted: 18, historicalAvgStoryPoints: 18,
      activeDays: 7, focusSessions: [],
    };
    expect(computeProductivityScore(highCompletion).score)
      .toBeGreaterThan(computeProductivityScore(lowCompletion).score);
  });
});
