-- ============================================================
-- MiMic Lab Manager — Security Hardening
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor
--
-- PREREQUISITES: scripts/supabase-rls-policies.sql and
-- scripts/supabase-booking-settings.sql must have been run first.
-- This script is IDEMPOTENT — safe to re-run.
--
-- What it fixes:
--   1. Any authenticated Supabase account (even one NOT in lab_users,
--      created via open sign-up) could read/write most tables.
--      → All policies now require lab membership via is_lab_member().
--   2. A member could self-promote (set is_admin/role on their own row).
--      → Trigger blocks changes to role/is_admin/email unless admin.
--   3. Double-bookings were only prevented client-side.
--      → DB exclusion constraint rejects overlapping bookings.
--   4. SECURITY DEFINER functions get a pinned search_path.
--
-- RECOMMENDED (manual, in the Dashboard): Authentication → Sign In /
-- Up → disable "Allow new users to sign up", since lab accounts are
-- provisioned by admins anyway.
-- ============================================================

-- ============================================================
-- 1. Helper functions (pinned search_path)
-- ============================================================
CREATE OR REPLACE FUNCTION is_lab_member()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_users
    WHERE email = auth.jwt() ->> 'email'
  );
$$;

CREATE OR REPLACE FUNCTION is_lab_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_users
    WHERE email = auth.jwt() ->> 'email'
      AND (is_admin = true OR role IN ('admin', 'pi'))
  );
$$;

-- ============================================================
-- 2. Drop all existing policies on lab tables (re-runnable)
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'lab_users','instruments','maintenance_logs','locations','projects',
        'certifications','storage_units','reagents','bookings','cryo_vials',
        'wishlist_items','log_entries','manuals','app_settings'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- 3. lab_users — members read, admins write, self-update guarded
-- ============================================================
CREATE POLICY "lab_users_select" ON lab_users
  FOR SELECT TO authenticated USING (is_lab_member());

CREATE POLICY "lab_users_insert" ON lab_users
  FOR INSERT TO authenticated WITH CHECK (is_lab_admin());

CREATE POLICY "lab_users_update" ON lab_users
  FOR UPDATE TO authenticated
  USING (email = auth.jwt() ->> 'email' OR is_lab_admin())
  WITH CHECK (email = auth.jwt() ->> 'email' OR is_lab_admin());

CREATE POLICY "lab_users_delete" ON lab_users
  FOR DELETE TO authenticated USING (is_lab_admin());

-- Anti-escalation: non-admins cannot change role / is_admin / email
-- (not even on their own row).
CREATE OR REPLACE FUNCTION protect_lab_user_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_lab_admin() THEN
    IF NEW.role     IS DISTINCT FROM OLD.role
    OR NEW.is_admin IS DISTINCT FROM OLD.is_admin
    OR NEW.email    IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'Only lab admins can change role, admin flag, or email';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_lab_user_fields ON lab_users;
CREATE TRIGGER trg_protect_lab_user_fields
  BEFORE UPDATE ON lab_users
  FOR EACH ROW EXECUTE FUNCTION protect_lab_user_fields();

-- ============================================================
-- 4. General tables — membership required everywhere
-- ============================================================
-- instruments: members read/write, admin delete
CREATE POLICY "instruments_select" ON instruments FOR SELECT TO authenticated USING (is_lab_member());
CREATE POLICY "instruments_insert" ON instruments FOR INSERT TO authenticated WITH CHECK (is_lab_member());
CREATE POLICY "instruments_update" ON instruments FOR UPDATE TO authenticated USING (is_lab_member());
CREATE POLICY "instruments_delete" ON instruments FOR DELETE TO authenticated USING (is_lab_admin());

-- maintenance_logs: members read/write, admin delete
CREATE POLICY "maintenance_logs_select" ON maintenance_logs FOR SELECT TO authenticated USING (is_lab_member());
CREATE POLICY "maintenance_logs_insert" ON maintenance_logs FOR INSERT TO authenticated WITH CHECK (is_lab_member());
CREATE POLICY "maintenance_logs_update" ON maintenance_logs FOR UPDATE TO authenticated USING (is_lab_member());
CREATE POLICY "maintenance_logs_delete" ON maintenance_logs FOR DELETE TO authenticated USING (is_lab_admin());

-- locations: members read, admin write
CREATE POLICY "locations_select" ON locations FOR SELECT TO authenticated USING (is_lab_member());
CREATE POLICY "locations_insert" ON locations FOR INSERT TO authenticated WITH CHECK (is_lab_admin());
CREATE POLICY "locations_update" ON locations FOR UPDATE TO authenticated USING (is_lab_admin());
CREATE POLICY "locations_delete" ON locations FOR DELETE TO authenticated USING (is_lab_admin());

-- projects: members read, admin write
CREATE POLICY "projects_select" ON projects FOR SELECT TO authenticated USING (is_lab_member());
CREATE POLICY "projects_insert" ON projects FOR INSERT TO authenticated WITH CHECK (is_lab_admin());
CREATE POLICY "projects_update" ON projects FOR UPDATE TO authenticated USING (is_lab_admin());
CREATE POLICY "projects_delete" ON projects FOR DELETE TO authenticated USING (is_lab_admin());

-- certifications: members read, admin write
CREATE POLICY "certifications_select" ON certifications FOR SELECT TO authenticated USING (is_lab_member());
CREATE POLICY "certifications_insert" ON certifications FOR INSERT TO authenticated WITH CHECK (is_lab_admin());
CREATE POLICY "certifications_update" ON certifications FOR UPDATE TO authenticated USING (is_lab_admin());
CREATE POLICY "certifications_delete" ON certifications FOR DELETE TO authenticated USING (is_lab_admin());

-- storage_units: members read, admin write
CREATE POLICY "storage_units_select" ON storage_units FOR SELECT TO authenticated USING (is_lab_member());
CREATE POLICY "storage_units_insert" ON storage_units FOR INSERT TO authenticated WITH CHECK (is_lab_admin());
CREATE POLICY "storage_units_update" ON storage_units FOR UPDATE TO authenticated USING (is_lab_admin());
CREATE POLICY "storage_units_delete" ON storage_units FOR DELETE TO authenticated USING (is_lab_admin());

-- reagents: members read/write (stock updates), admin delete
CREATE POLICY "reagents_select" ON reagents FOR SELECT TO authenticated USING (is_lab_member());
CREATE POLICY "reagents_insert" ON reagents FOR INSERT TO authenticated WITH CHECK (is_lab_member());
CREATE POLICY "reagents_update" ON reagents FOR UPDATE TO authenticated USING (is_lab_member());
CREATE POLICY "reagents_delete" ON reagents FOR DELETE TO authenticated USING (is_lab_admin());

-- bookings: members read/insert, own-or-admin update/delete
CREATE POLICY "bookings_select" ON bookings FOR SELECT TO authenticated USING (is_lab_member());
CREATE POLICY "bookings_insert" ON bookings FOR INSERT TO authenticated WITH CHECK (is_lab_member());
CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE TO authenticated
  USING (
    user_id IN (SELECT id FROM lab_users WHERE email = auth.jwt() ->> 'email')
    OR is_lab_admin()
  );
CREATE POLICY "bookings_delete" ON bookings
  FOR DELETE TO authenticated
  USING (
    user_id IN (SELECT id FROM lab_users WHERE email = auth.jwt() ->> 'email')
    OR is_lab_admin()
  );

-- cryo_vials: members read/write
CREATE POLICY "cryo_vials_select" ON cryo_vials FOR SELECT TO authenticated USING (is_lab_member());
CREATE POLICY "cryo_vials_insert" ON cryo_vials FOR INSERT TO authenticated WITH CHECK (is_lab_member());
CREATE POLICY "cryo_vials_update" ON cryo_vials FOR UPDATE TO authenticated USING (is_lab_member());
CREATE POLICY "cryo_vials_delete" ON cryo_vials FOR DELETE TO authenticated USING (is_lab_member());

-- wishlist_items: members read/insert/update, admin delete
CREATE POLICY "wishlist_items_select" ON wishlist_items FOR SELECT TO authenticated USING (is_lab_member());
CREATE POLICY "wishlist_items_insert" ON wishlist_items FOR INSERT TO authenticated WITH CHECK (is_lab_member());
CREATE POLICY "wishlist_items_update" ON wishlist_items FOR UPDATE TO authenticated USING (is_lab_member());
CREATE POLICY "wishlist_items_delete" ON wishlist_items FOR DELETE TO authenticated USING (is_lab_admin());

-- log_entries: members read/insert, immutable, admin delete
CREATE POLICY "log_entries_select" ON log_entries FOR SELECT TO authenticated USING (is_lab_member());
CREATE POLICY "log_entries_insert" ON log_entries FOR INSERT TO authenticated WITH CHECK (is_lab_member());
CREATE POLICY "log_entries_delete" ON log_entries FOR DELETE TO authenticated USING (is_lab_admin());

-- manuals: members read/write, admin delete
CREATE POLICY "manuals_select" ON manuals FOR SELECT TO authenticated USING (is_lab_member());
CREATE POLICY "manuals_insert" ON manuals FOR INSERT TO authenticated WITH CHECK (is_lab_member());
CREATE POLICY "manuals_update" ON manuals FOR UPDATE TO authenticated USING (is_lab_member());
CREATE POLICY "manuals_delete" ON manuals FOR DELETE TO authenticated USING (is_lab_admin());

-- app_settings: members read, admin write
CREATE POLICY "app_settings_select" ON app_settings FOR SELECT TO authenticated USING (is_lab_member());
CREATE POLICY "app_settings_insert" ON app_settings FOR INSERT TO authenticated WITH CHECK (is_lab_admin());
CREATE POLICY "app_settings_update" ON app_settings FOR UPDATE TO authenticated USING (is_lab_admin());

-- ============================================================
-- 5. Storage bucket (manuals) — membership required
-- ============================================================
DROP POLICY IF EXISTS "manuals_bucket_select" ON storage.objects;
DROP POLICY IF EXISTS "manuals_bucket_insert" ON storage.objects;
DROP POLICY IF EXISTS "manuals_bucket_update" ON storage.objects;
DROP POLICY IF EXISTS "manuals_bucket_delete" ON storage.objects;

CREATE POLICY "manuals_bucket_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'manuals' AND is_lab_member());

CREATE POLICY "manuals_bucket_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'manuals' AND is_lab_member());

CREATE POLICY "manuals_bucket_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'manuals' AND is_lab_member());

CREATE POLICY "manuals_bucket_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'manuals' AND is_lab_admin());

-- ============================================================
-- 6. Bookings: no-overlap constraint (DB-level double-booking guard)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Wrapped so that pre-existing overlapping rows don't abort the whole
-- script: if it fails you get a NOTICE and a query to find culprits.
DO $$
BEGIN
  ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
    EXCLUDE USING gist (
      instrument_id WITH =,
      date WITH =,
      numrange(start_hour, end_hour) WITH &&
    );
  RAISE NOTICE 'bookings_no_overlap constraint added.';
EXCEPTION
  WHEN duplicate_table OR duplicate_object THEN
    RAISE NOTICE 'bookings_no_overlap already exists — skipped.';
  WHEN exclusion_violation THEN
    RAISE NOTICE 'Could not add bookings_no_overlap: existing rows overlap. Find them with the query at the bottom of this script, fix them, then re-run.';
END $$;

-- ============================================================
-- DONE! Verify with:
--   SELECT tablename, policyname FROM pg_policies ORDER BY tablename;
--
-- Find overlapping bookings (if the constraint could not be added):
--   SELECT a.id, b.id, a.instrument_id, a.date,
--          a.start_hour, a.end_hour, b.start_hour, b.end_hour
--   FROM bookings a
--   JOIN bookings b ON a.id < b.id
--    AND a.instrument_id = b.instrument_id AND a.date = b.date
--    AND numrange(a.start_hour, a.end_hour) && numrange(b.start_hour, b.end_hour);
-- ============================================================
