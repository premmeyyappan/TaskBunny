/**
 * Scoring weights must sum to 1.0.
 * Exported as a constant object so the algorithm in scoring.engine.ts
 * is fully auditable without running the server.
 */
export const SCORING_WEIGHTS = {
  COMPLETION_RATE: 0.35,
  VELOCITY_INDEX:  0.25,
  FOCUS_DEPTH:     0.20,
  CONSISTENCY:     0.15,
  OVERDUE_PENALTY: 0.05,
} as const;

// Minimum uninterrupted session duration to count as a focus session
export const FOCUS_SESSION_GAP_MS = 10 * 60 * 1000; // 10 minutes

// Sessions longer than this threshold contribute to deep work ratio
export const DEEP_WORK_THRESHOLD_MIN = 25; // minutes

// Denominator for focus depth normalization (one Pomodoro double-cycle)
export const FOCUS_DEPTH_ANCHOR_MIN = 90; // minutes

// Scoring window in days
export const SCORING_WINDOW_DAYS = 7;
