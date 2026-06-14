-- ============================================================
-- MiMic Lab Manager — Booking settings + half-hour support
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor
--
-- PREREQUISITE: run scripts/supabase-rls-policies.sql first.
-- That script creates the is_lab_admin() helper used below and
-- enables RLS on the existing tables.
-- ============================================================

-- ------------------------------------------------------------
-- 1. app_settings: small key/value (JSONB) store for lab-wide
--    configuration such as the booking working hours.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read settings (calendar needs them)
DROP POLICY IF EXISTS "app_settings_select" ON app_settings;
CREATE POLICY "app_settings_select" ON app_settings
  FOR SELECT TO authenticated USING (true);

-- Only admins/PIs can change settings
DROP POLICY IF EXISTS "app_settings_insert" ON app_settings;
CREATE POLICY "app_settings_insert" ON app_settings
  FOR INSERT TO authenticated WITH CHECK (is_lab_admin());

DROP POLICY IF EXISTS "app_settings_update" ON app_settings;
CREATE POLICY "app_settings_update" ON app_settings
  FOR UPDATE TO authenticated USING (is_lab_admin());

-- Seed the default booking settings (only if not already present)
INSERT INTO app_settings (key, value)
VALUES (
  'booking_settings',
  '{"openStartHour":7,"openEndHour":21,"workStartHour":9,"workEndHour":19,"slotMinutes":30}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 2. Allow half-hour bookings: start_hour / end_hour must be
--    fractional (9.5 = 09:30). Convert integer columns to numeric.
-- ------------------------------------------------------------
ALTER TABLE bookings ALTER COLUMN start_hour TYPE numeric(4,2) USING start_hour::numeric;
ALTER TABLE bookings ALTER COLUMN end_hour   TYPE numeric(4,2) USING end_hour::numeric;

-- ============================================================
-- DONE. Verify with:
--   SELECT * FROM app_settings;
--   SELECT column_name, data_type FROM information_schema.columns
--     WHERE table_name = 'bookings' AND column_name IN ('start_hour','end_hour');
-- ============================================================
