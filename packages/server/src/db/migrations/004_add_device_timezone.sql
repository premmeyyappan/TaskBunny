-- Migration 004: add device_timezone to events and behavior_windows
-- Run order: after 003
--
-- We assumed UTC throughout and did all day-boundary calculations server-side,
-- but scoring windows were coming out wrong for users in UTC-5 and earlier —
-- an event at 23:30 local time was landing in the next day's window.
-- Storing the originating device timezone so the scoring engine can localise
-- window boundaries before aggregating.
--
-- Existing rows stay NULL; the scoring engine falls back to UTC for NULL,
-- which matches the old behaviour.

ALTER TABLE productivity_events
  ADD COLUMN IF NOT EXISTS device_timezone TEXT;

-- behavior_windows rows are recomputed on each sync flush, so we can default
-- to 'UTC' here — they'll get the real value on the next flush after deploy.
ALTER TABLE behavior_windows
  ADD COLUMN IF NOT EXISTS device_timezone TEXT NOT NULL DEFAULT 'UTC';
