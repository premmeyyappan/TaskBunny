/**
 * Longitudinal trend analysis over a user's productivity score history.
 *
 * Uses ordinary least-squares (OLS) linear regression to model the trajectory
 * of scores over time.  The x-axis is elapsed days from the first data point;
 * the y-axis is the score [0, 100].
 *
 * Outputs:
 *   slopePerWeek   — score change per 7 days (positive = improving)
 *   rSquared       — coefficient of determination [0, 1]
 *   trend          — 'improving' | 'declining' | 'plateau'
 *   projectedScore — OLS extrapolation 4 weeks beyond the last data point
 */

import type { ScoreDataPoint, TrendAnalysis } from '@taskbunny/shared';

/** Minimum data points required for a meaningful regression. */
const MIN_DATA_POINTS = 3;

/** Slope thresholds (points per week) for trend classification. */
const IMPROVING_THRESHOLD =  0.5;
const DECLINING_THRESHOLD = -0.5;

/** Projection horizon: 4 weeks beyond the last observation. */
const PROJECTION_WEEKS = 4;

export function computeTrendAnalysis(
  scores: ScoreDataPoint[],
  analysisWindowDays: number
): TrendAnalysis {
  if (scores.length < MIN_DATA_POINTS) {
    // Not enough history — return a neutral, low-confidence result
    const lastScore = scores.at(-1)?.score ?? 50;
    return {
      slopePerWeek:       0,
      rSquared:           0,
      trend:              'plateau',
      projectedScore:     lastScore,
      dataPoints:         scores.length,
      analysisWindowDays,
    };
  }

  const origin = new Date(scores[0].computedAt).getTime();

  // Build (x, y) pairs where x = elapsed days from first observation
  const points = scores.map((s) => ({
    x: (new Date(s.computedAt).getTime() - origin) / (1000 * 60 * 60 * 24),
    y: s.score,
  }));

  const { slope, intercept, rSquared } = linearRegression(points);

  // Convert slope from points/day → points/week
  const slopePerWeek = slope * 7;

  // Project 4 weeks past the last observation
  const lastX = points.at(-1)!.x;
  const projectionX = lastX + PROJECTION_WEEKS * 7;
  const rawProjected = intercept + slope * projectionX;
  const projectedScore = Math.round(Math.max(0, Math.min(100, rawProjected)));

  const trend = classifyTrend(slopePerWeek);

  return {
    slopePerWeek: Math.round(slopePerWeek * 100) / 100,
    rSquared:     Math.round(rSquared     * 1000) / 1000,
    trend,
    projectedScore,
    dataPoints:         scores.length,
    analysisWindowDays,
  };
}

// ---------------------------------------------------------------------------
// OLS helpers
// ---------------------------------------------------------------------------

interface RegressionResult {
  slope:     number;
  intercept: number;
  rSquared:  number;
}

function linearRegression(
  points: Array<{ x: number; y: number }>
): RegressionResult {
  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

  for (const { x, y } of points) {
    sumX  += x;
    sumY  += y;
    sumXY += x * y;
    sumX2 += x * x;
  }

  const meanX = sumX / n;
  const meanY = sumY / n;

  const denominator = sumX2 - n * meanX * meanX;
  if (denominator === 0) {
    // All observations at the same x (degenerate case)
    return { slope: 0, intercept: meanY, rSquared: 0 };
  }

  const slope     = (sumXY - n * meanX * meanY) / denominator;
  const intercept = meanY - slope * meanX;

  // Compute R²
  let ssTot = 0, ssRes = 0;
  for (const { x, y } of points) {
    ssTot += (y - meanY) ** 2;
    ssRes += (y - (intercept + slope * x)) ** 2;
  }
  const rSquared = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return { slope, intercept, rSquared };
}

function classifyTrend(slopePerWeek: number): TrendAnalysis['trend'] {
  if (slopePerWeek >=  IMPROVING_THRESHOLD) return 'improving';
  if (slopePerWeek <= DECLINING_THRESHOLD)  return 'declining';
  return 'plateau';
}
