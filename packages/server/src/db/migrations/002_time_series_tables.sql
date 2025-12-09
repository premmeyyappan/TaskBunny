-- Migration 002: Time-series event store and behavioral analytics tables
-- Run order: after 001
--
-- Design rationale: productivity_events is the high-volume time-series table.
-- Range partitioning by month keeps partition sizes predictable and allows
-- PostgreSQL's partition pruning to skip irrelevant months in range queries.
-- behavior_windows stores pre-aggregated rolling metrics to avoid full-scan
-- aggregations on the hot path.

-- Parent table for time-series event stream.
-- Partitioned by range on recorded_at (one child partition per calendar month).
CREATE TABLE IF NOT EXISTS productivity_events (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  task_id         UUID,
  device_id       TEXT NOT NULL,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  recorded_at     TIMESTAMPTZ NOT NULL,   -- partition key — time dimension
  client_event_id UUID NOT NULL,          -- idempotency key
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (id, recorded_at)           -- partition key must be in PK
) PARTITION BY RANGE (recorded_at);

-- Seed partitions: current month ± 6 months
-- In production, a pg_cron job creates future partitions automatically.
DO $$
DECLARE
  month_start TIMESTAMPTZ;
  month_end   TIMESTAMPTZ;
  partition_name TEXT;
BEGIN
  FOR i IN -6..6 LOOP
    month_start := date_trunc('month', now() + (i || ' months')::INTERVAL);
    month_end   := month_start + INTERVAL '1 month';
    partition_name := 'productivity_events_' || to_char(month_start, 'YYYY_MM');

    IF NOT EXISTS (
      SELECT 1 FROM pg_class
      WHERE relname = partition_name
    ) THEN
      EXECUTE format(
        'CREATE TABLE %I PARTITION OF productivity_events
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, month_start, month_end
      );
    END IF;
  END LOOP;
END $$;

-- Pre-aggregated behavioral windows: updated after each sync flush.
-- Avoids expensive full-table aggregations on dashboard load.
CREATE TABLE IF NOT EXISTS behavior_windows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  window_type  TEXT NOT NULL CHECK (window_type IN ('7d', '30d')),
  metric_key   TEXT NOT NULL,    -- e.g. 'avg_completion_rate', 'p50_focus_depth'
  metric_value NUMERIC(10, 4),
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, window_type, metric_key)
);

-- Persisted productivity scores (one row per scoring run per user)
CREATE TABLE IF NOT EXISTS productivity_scores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score             NUMERIC(5, 2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  completion_rate   NUMERIC(4, 3),
  velocity_index    NUMERIC(4, 3),
  focus_depth       NUMERIC(4, 3),
  consistency_score NUMERIC(4, 3),
  overdue_ratio     NUMERIC(4, 3),
  window_start      TIMESTAMPTZ NOT NULL,
  window_end        TIMESTAMPTZ NOT NULL,
  computed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
