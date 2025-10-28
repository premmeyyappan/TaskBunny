-- Migration 001: Core schema
-- Run order: first

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  status       TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority     SMALLINT NOT NULL DEFAULT 2
    CHECK (priority BETWEEN 1 AND 4),
  story_points SMALLINT,
  due_at       TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  vector_clock JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency guard: prevents duplicate event processing on retry/replay
CREATE TABLE IF NOT EXISTS processed_event_ids (
  client_event_id UUID PRIMARY KEY,
  user_id         UUID NOT NULL,
  processed_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync state: tracks last known vector clock per (user, device) pair
CREATE TABLE IF NOT EXISTS sync_vectors (
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id      TEXT NOT NULL,
  vector_clock   JSONB NOT NULL DEFAULT '{}',
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);
