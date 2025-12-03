export interface ScoringInput {
  userId: string;
  windowStart: Date;
  windowEnd: Date;
  tasksCompleted: number;
  tasksDueInWindow: number;
  tasksOverdue: number;
  tasksTotal: number;
  storyPointsCompleted: number;
  historicalAvgStoryPoints: number; // 30-day rolling avg story points per 7-day window
  focusSessions: FocusSession[];
  activeDays: number; // days in window with at least one task_completed event
}

export interface FocusSession {
  taskId: string;
  startedAt: Date;
  endedAt: Date;
  durationMs: number;
  interrupted: boolean;
}

export interface ProductivityScore {
  score: number;
  completionRate: number;
  velocityIndex: number;
  focusDepth: number;
  consistencyScore: number;
  overdueRatio: number;
  windowStart: Date;
  windowEnd: Date;
  computedAt: Date;
}

export interface TimeSeriesBucket {
  bucket: string; // ISO date string (day or week)
  score: number;
  eventsCount: number;
  tasksCompleted: number;
}

export interface BehaviorWindow {
  userId: string;
  windowType: '7d' | '30d';
  metricKey: string;
  metricValue: number;
  computedAt: string;
}

export interface ScoreDataPoint {
  score: number;
  computedAt: Date;
  windowStart: Date;
  windowEnd: Date;
}

/**
 * Result of longitudinal regression analysis over a user's score history.
 *
 * slopePerWeek: rate of score change per week (positive = improving)
 * rSquared:     goodness-of-fit [0, 1] — how well the linear model fits the data
 * trend:        human-readable classification of the slope
 * projectedScore: extrapolated score 4 weeks from the most recent data point
 */
export interface TrendAnalysis {
  slopePerWeek: number;
  rSquared: number;
  trend: 'improving' | 'declining' | 'plateau';
  projectedScore: number;
  dataPoints: number;
  analysisWindowDays: number;
}
