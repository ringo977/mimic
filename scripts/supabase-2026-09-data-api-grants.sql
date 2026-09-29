-- ============================================================
-- MiMic Lab — Data API grants (29 September 2026)
-- ============================================================
-- WHY: since 30 May 2026 a NEW Supabase project does not grant
-- select/insert/update/delete on public tables to anon, authenticated
-- or service_role. The Data API (what the app uses) then answers
-- "permission denied for table …" even when RLS policies are correct.
-- The production project was created before that date, so its existing
-- tables keep the old grants; this script matters for disaster recovery
-- onto a fresh project, and for tables created after 30 October 2026
-- (when the new default reaches existing projects too).
--
-- RLS stays the real access control. These grants only restore what
-- every project used to have, which is what the policies were written for.
-- Run this LAST, after supabase-2026-09-consolidation.sql, then re-check
-- that history_meta is still closed (the check at the bottom).
-- Safe to re-run, including on the current production project.
-- ============================================================

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- history.sql closes this table on purpose (no policies, not readable via the API).
REVOKE ALL ON TABLE history_meta FROM anon, authenticated;

-- Expect: lab_users readable by the app roles, history_meta not.
SELECT c.relname,
       has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select,
       has_table_privilege('anon', c.oid, 'SELECT')          AS anon_select
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relname IN ('lab_users', 'history_meta')
 ORDER BY 1;
