-- ============================================================
-- MiMic Lab Manager — Supabase Row-Level Security (RLS) Policies
-- ============================================================
-- Run this SQL in: Supabase Dashboard → SQL Editor
--
-- IMPORTANT: This script enables RLS on ALL lab tables and creates
-- policies that restrict access to authenticated users only.
-- The anon key alone will NOT grant any access after this.
--
-- Policy model:
--   • All tables: Authenticated users can SELECT
--   • Mutable tables: Authenticated users can INSERT/UPDATE/DELETE
--   • lab_users: Users can UPDATE only their own row (admins can do all)
--   • bookings: Users can DELETE only their own bookings (admins can do all)
--   • log_entries: INSERT only (no deletes except admin)
-- ============================================================

-- ============================================================
-- 1. Enable RLS on all tables
-- ============================================================
ALTER TABLE lab_users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_units    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reagents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cryo_vials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuals          ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 1b. Make this script re-runnable: drop any pre-existing
--     policies on these tables so the CREATE statements below
--     never abort the transaction with "already exists".
--     (Supabase SQL Editor runs everything in ONE transaction,
--     so a single duplicate would roll back the RLS enables too.)
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
        'wishlist_items','log_entries','manuals'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ============================================================
-- 2. Helper: check if current user is an admin in lab_users
-- ============================================================
CREATE OR REPLACE FUNCTION is_lab_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_users
    WHERE email = auth.jwt() ->> 'email'
      AND (is_admin = true OR role IN ('admin', 'pi'))
  );
$$;

-- ============================================================
-- 3. lab_users — restricted write access
-- ============================================================
-- Everyone authenticated can read all users (needed for booking display, etc.)
CREATE POLICY "lab_users_select" ON lab_users
  FOR SELECT TO authenticated
  USING (true);

-- Only admins can insert new users
CREATE POLICY "lab_users_insert" ON lab_users
  FOR INSERT TO authenticated
  WITH CHECK (is_lab_admin());

-- Users can update their own row; admins can update anyone
CREATE POLICY "lab_users_update" ON lab_users
  FOR UPDATE TO authenticated
  USING (
    email = auth.jwt() ->> 'email'
    OR is_lab_admin()
  );

-- Only admins can delete users
CREATE POLICY "lab_users_delete" ON lab_users
  FOR DELETE TO authenticated
  USING (is_lab_admin());

-- ============================================================
-- 4. instruments — read all, write for authenticated
-- ============================================================
CREATE POLICY "instruments_select" ON instruments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "instruments_insert" ON instruments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "instruments_update" ON instruments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "instruments_delete" ON instruments
  FOR DELETE TO authenticated USING (is_lab_admin());

-- ============================================================
-- 5. maintenance_logs
-- ============================================================
CREATE POLICY "maintenance_logs_select" ON maintenance_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "maintenance_logs_insert" ON maintenance_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "maintenance_logs_update" ON maintenance_logs
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "maintenance_logs_delete" ON maintenance_logs
  FOR DELETE TO authenticated USING (is_lab_admin());

-- ============================================================
-- 6. locations — read all, admin write
-- ============================================================
CREATE POLICY "locations_select" ON locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "locations_insert" ON locations
  FOR INSERT TO authenticated WITH CHECK (is_lab_admin());

CREATE POLICY "locations_update" ON locations
  FOR UPDATE TO authenticated USING (is_lab_admin());

CREATE POLICY "locations_delete" ON locations
  FOR DELETE TO authenticated USING (is_lab_admin());

-- ============================================================
-- 7. projects — read all, admin write
-- ============================================================
CREATE POLICY "projects_select" ON projects
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "projects_insert" ON projects
  FOR INSERT TO authenticated WITH CHECK (is_lab_admin());

CREATE POLICY "projects_update" ON projects
  FOR UPDATE TO authenticated USING (is_lab_admin());

CREATE POLICY "projects_delete" ON projects
  FOR DELETE TO authenticated USING (is_lab_admin());

-- ============================================================
-- 8. certifications — read all, admin write
-- ============================================================
CREATE POLICY "certifications_select" ON certifications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "certifications_insert" ON certifications
  FOR INSERT TO authenticated WITH CHECK (is_lab_admin());

CREATE POLICY "certifications_update" ON certifications
  FOR UPDATE TO authenticated USING (is_lab_admin());

CREATE POLICY "certifications_delete" ON certifications
  FOR DELETE TO authenticated USING (is_lab_admin());

-- ============================================================
-- 9. storage_units — read all, admin write
-- ============================================================
CREATE POLICY "storage_units_select" ON storage_units
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "storage_units_insert" ON storage_units
  FOR INSERT TO authenticated WITH CHECK (is_lab_admin());

CREATE POLICY "storage_units_update" ON storage_units
  FOR UPDATE TO authenticated USING (is_lab_admin());

CREATE POLICY "storage_units_delete" ON storage_units
  FOR DELETE TO authenticated USING (is_lab_admin());

-- ============================================================
-- 10. reagents — read all, authenticated write (for stock updates)
-- ============================================================
CREATE POLICY "reagents_select" ON reagents
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "reagents_insert" ON reagents
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "reagents_update" ON reagents
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "reagents_delete" ON reagents
  FOR DELETE TO authenticated USING (is_lab_admin());

-- ============================================================
-- 11. bookings — read all, users manage own, admins manage all
-- ============================================================
CREATE POLICY "bookings_select" ON bookings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "bookings_insert" ON bookings
  FOR INSERT TO authenticated WITH CHECK (true);

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

-- ============================================================
-- 12. cryo_vials — read all, authenticated write
-- ============================================================
CREATE POLICY "cryo_vials_select" ON cryo_vials
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "cryo_vials_insert" ON cryo_vials
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "cryo_vials_update" ON cryo_vials
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "cryo_vials_delete" ON cryo_vials
  FOR DELETE TO authenticated USING (true);

-- ============================================================
-- 13. wishlist_items — read all, authenticated insert, admin approve
-- ============================================================
CREATE POLICY "wishlist_items_select" ON wishlist_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wishlist_items_insert" ON wishlist_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "wishlist_items_update" ON wishlist_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "wishlist_items_delete" ON wishlist_items
  FOR DELETE TO authenticated USING (is_lab_admin());

-- ============================================================
-- 14. log_entries — read all, insert only (immutable audit trail)
-- ============================================================
CREATE POLICY "log_entries_select" ON log_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "log_entries_insert" ON log_entries
  FOR INSERT TO authenticated WITH CHECK (true);

-- No UPDATE policy → logs are immutable
-- Only admin can delete (for backup restore)
CREATE POLICY "log_entries_delete" ON log_entries
  FOR DELETE TO authenticated USING (is_lab_admin());

-- ============================================================
-- 15. manuals — read all, authenticated write
-- ============================================================
CREATE POLICY "manuals_select" ON manuals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "manuals_insert" ON manuals
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "manuals_update" ON manuals
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "manuals_delete" ON manuals
  FOR DELETE TO authenticated USING (is_lab_admin());

-- ============================================================
-- 16. Storage bucket policies (manuals)
-- ============================================================
-- Run these in: Supabase Dashboard → Storage → Policies
-- Or use the SQL below:

-- Drop pre-existing bucket policies first (re-runnable)
DROP POLICY IF EXISTS "manuals_bucket_select" ON storage.objects;
DROP POLICY IF EXISTS "manuals_bucket_insert" ON storage.objects;
DROP POLICY IF EXISTS "manuals_bucket_update" ON storage.objects;
DROP POLICY IF EXISTS "manuals_bucket_delete" ON storage.objects;

-- Allow authenticated users to read files
CREATE POLICY "manuals_bucket_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'manuals');

-- Allow authenticated users to upload files
CREATE POLICY "manuals_bucket_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'manuals');

-- Allow authenticated users to update files (upsert)
CREATE POLICY "manuals_bucket_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'manuals');

-- Only admin can delete files
CREATE POLICY "manuals_bucket_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'manuals' AND EXISTS (
    SELECT 1 FROM lab_users
    WHERE email = auth.jwt() ->> 'email'
      AND (is_admin = true OR role IN ('admin', 'pi'))
  ));

-- ============================================================
-- DONE! Verify with:
--   SELECT tablename, policyname FROM pg_policies ORDER BY tablename;
-- ============================================================
