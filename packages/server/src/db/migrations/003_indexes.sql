-- Migration 003: Performance indexes
-- Run order: after 002
--
-- To measure the effect of these indexes:
--   bash scripts/explain-queries.sh --before
--   psql < 003_indexes.sql
--   bash scripts/explain-queries.sh --after
-- Results recorded in docs/benchmark-results.md.

-- Partial index on the 90-day hot window of productivity_events.
-- Dashboard scoring query filters on (user_id, recorded_at > now()-7d);
-- keeping the predicate to 90 days means the index stays small enough
-- to remain cache-resident under normal load.
CREATE INDEX IF NOT EXISTS idx_events_user_time
  ON productivity_events (user_id, recorded_at DESC)
  WHERE recorded_at > now() - INTERVAL '90 days';

-- Score history lookup for the trend chart.
CREATE INDEX IF NOT EXISTS idx_scores_user_computed
  ON productivity_scores (user_id, computed_at DESC);

-- Covering index on tasks for the dashboard task-list query.
-- INCLUDE columns satisfy the SELECT list without a heap fetch.
CREATE INDEX IF NOT EXISTS idx_tasks_user_status
  ON tasks (user_id, status)
  INCLUDE (title, due_at, story_points, priority, completed_at);

-- Partial idempotency index — scoped to the last 7 days to
-- avoid unbounded index growth as processed_event_ids accumulates.
CREATE INDEX IF NOT EXISTS idx_processed_events_recent
  ON processed_event_ids (client_event_id, processed_at)
  WHERE processed_at > now() - INTERVAL '7 days';

-- behavior_windows lookup for dashboard stat cards.
CREATE INDEX IF NOT EXISTS idx_behavior_windows_user_type
  ON behavior_windows (user_id, window_type, computed_at DESC);
