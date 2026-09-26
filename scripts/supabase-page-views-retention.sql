-- ============================================================
-- MiMic Lab — page_views: retention & hardening (September 2026)
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor. Idempotent.
-- Requires: supabase-site-analytics.sql (page_views + is_lab_admin).
--
-- Closes the §5.3 findings of the September 2026 assessment:
--   1. Retention: rows older than 13 months are deleted automatically
--      (declared in the cookie/privacy policy) via pg_cron; if pg_cron
--      is not available, a cleanup RPC is provided as fallback.
--   2. ts is server-side only: a trigger overwrites any client-supplied
--      timestamp (rows could be back/post-dated by anyone).
--   3. Reading raw rows is restricted to ADMINS (the Site Stats page is
--      admin-only in the app; the select policy said "members").
-- ============================================================

-- ------------------------------------------------------------
-- 1. ts always set by the server
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION page_views_force_ts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.ts := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_page_views_force_ts ON page_views;
CREATE TRIGGER trg_page_views_force_ts
  BEFORE INSERT ON page_views
  FOR EACH ROW EXECUTE FUNCTION page_views_force_ts();

-- ------------------------------------------------------------
-- 2. Raw rows readable by admins only
--    (site_stats() is SECURITY INVOKER: non-admin members will simply
--    get empty stats, and the app shows the page to admins only anyway)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "page_views_select" ON page_views;
CREATE POLICY "page_views_select" ON page_views
  FOR SELECT TO authenticated USING (is_lab_admin());

-- ------------------------------------------------------------
-- 3. Cleanup function (SECURITY DEFINER: callable by the scheduler)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION purge_old_page_views()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted integer;
BEGIN
  DELETE FROM page_views WHERE ts < now() - interval '13 months';
  GET DIAGNOSTICS deleted = ROW_COUNT;
  RETURN deleted;
END;
$$;

-- Anonymous visitors must not be able to trigger purges.
-- NOTE: functions are executable by PUBLIC by default, so revoking from
-- anon/authenticated alone is NOT enough — revoke from PUBLIC too.
REVOKE EXECUTE ON FUNCTION purge_old_page_views() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 4. Schedule: first Sunday-ish — daily at 04:10 UTC via pg_cron.
--    If the extension is unavailable, a NOTICE tells you to fall back
--    to calling purge_old_page_views() from the keep-alive workflow.
-- ------------------------------------------------------------
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  -- unschedule a previous copy of the job, then (re)create it
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'purge-old-page-views';
  PERFORM cron.schedule('purge-old-page-views', '10 4 * * *', 'SELECT purge_old_page_views();');
  RAISE NOTICE 'pg_cron job "purge-old-page-views" scheduled daily at 04:10 UTC.';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available (%). Fallback: run SELECT purge_old_page_views(); periodically (e.g. from the keep-alive GitHub Action with the service role key, or manually every few months).', SQLERRM;
END $$;

-- Verify:
--   SELECT * FROM cron.job;
--   SELECT purge_old_page_views();  -- returns number of deleted rows
