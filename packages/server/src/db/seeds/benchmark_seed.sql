-- Benchmark seed: generates realistic data for query performance measurement.
-- Inserts 10 users, ~500 tasks, and ~5,200 productivity events across 30 days.
-- Run BEFORE applying 003_indexes.sql to capture baseline EXPLAIN ANALYZE output,
-- then run again AFTER to capture the post-index execution plan.

BEGIN;

-- Seed users
INSERT INTO users (id, email, name, password_hash) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'alice@example.com',   'Alice',   'x'),
  ('a0000000-0000-0000-0000-000000000002', 'bob@example.com',     'Bob',     'x'),
  ('a0000000-0000-0000-0000-000000000003', 'carol@example.com',   'Carol',   'x'),
  ('a0000000-0000-0000-0000-000000000004', 'david@example.com',   'David',   'x'),
  ('a0000000-0000-0000-0000-000000000005', 'erin@example.com',    'Erin',    'x'),
  ('a0000000-0000-0000-0000-000000000006', 'frank@example.com',   'Frank',   'x'),
  ('a0000000-0000-0000-0000-000000000007', 'grace@example.com',   'Grace',   'x'),
  ('a0000000-0000-0000-0000-000000000008', 'henry@example.com',   'Henry',   'x'),
  ('a0000000-0000-0000-0000-000000000009', 'isla@example.com',    'Isla',    'x'),
  ('a0000000-0000-0000-0000-000000000010', 'jack@example.com',    'Jack',    'x')
ON CONFLICT (email) DO NOTHING;

-- Seed tasks (~50 per user = 500 total)
INSERT INTO tasks (user_id, title, status, priority, story_points, due_at)
SELECT
  user_id,
  'Task ' || seq || ' for user ' || user_num,
  CASE (seq % 4)
    WHEN 0 THEN 'completed'
    WHEN 1 THEN 'in_progress'
    WHEN 2 THEN 'pending'
    ELSE 'cancelled'
  END,
  (seq % 4) + 1,
  (seq % 8) + 1,
  now() - ((50 - seq) || ' days')::INTERVAL
FROM (
  SELECT
    ('a0000000-0000-0000-0000-00000000000' || user_num)::UUID AS user_id,
    user_num,
    generate_series(1, 50) AS seq
  FROM generate_series(1, 10) AS user_num
) t;

-- Seed productivity_events (~520 per user = 5,200 total across 10 users, 30 days)
-- Event type distribution mirrors real-world usage:
--   task_started/paused/resumed: high frequency
--   focus_session_tick: every 5 min during work
--   task_completed/cancelled: lower frequency
INSERT INTO productivity_events
  (user_id, device_id, event_type, payload, recorded_at, client_event_id)
SELECT
  ('a0000000-0000-0000-0000-00000000000' || user_num)::UUID,
  'device-' || user_num || '-primary',
  CASE (seq % 7)
    WHEN 0 THEN 'task_started'
    WHEN 1 THEN 'task_paused'
    WHEN 2 THEN 'task_resumed'
    WHEN 3 THEN 'task_completed'
    WHEN 4 THEN 'focus_session_tick'
    WHEN 5 THEN 'app_foregrounded'
    ELSE       'app_backgrounded'
  END,
  ('{"seq":' || seq || '}')::JSONB,
  now() - ((30 - (seq / 18)) || ' days')::INTERVAL
    + ((seq % 480) || ' minutes')::INTERVAL,
  gen_random_uuid()
FROM (
  SELECT
    generate_series(1, 520) AS seq,
    user_num
  FROM generate_series(1, 10) AS user_num
) t;

COMMIT;
