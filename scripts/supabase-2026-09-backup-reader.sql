-- ============================================================
-- Weekly external backup: read-only role + export function
--
-- Level 3 of the robustness plan (28/09): a copy of the database that lives
-- OUTSIDE Supabase, produced every week by GitHub Actions in the private
-- repo ringo977/mimic-backups (GitHub-hosted runners, output encrypted with
-- age — no lab computer involved).
--
-- What this file creates:
--   * backup_export()  — SECURITY DEFINER, returns the whole lab database as
--     ONE jsonb document in the exact "backup JSON v2" format produced by
--     Admin → Backup → Download, so the file can be restored from the app
--     with the usual Restore Database. Snake_case rows, one array per table.
--   * backup_reader    — a LOGIN role that can do exactly one thing: call
--     backup_export(). No table privileges, no write, no access to auth.
--     Optional extra (only if the project allows it): BYPASSRLS + SELECT on
--     public tables, so that CI can also run a plain pg_dump.
--
-- The password is generated here (64 hex chars) and shown ONCE in the
-- result of the last SELECT. Paste it into the repository secret
-- SUPABASE_DB_URL of ringo977/mimic-backups and nowhere else:
--   postgresql://backup_reader.<project-ref>:<password>@<session pooler host>:5432/postgres
-- (host from Dashboard → Connect → Session pooler; the direct host is
-- IPv6-only and GitHub runners are IPv4.)
--
-- Run AFTER supabase-2026-09-history.sql. Idempotent: re-running keeps the
-- role and its password (the password cell is NULL on re-runs).
-- Rotate:  ALTER ROLE backup_reader PASSWORD 'new-one';   then update the secret.
-- Revoke:  DROP OWNED BY backup_reader; DROP ROLE backup_reader;
-- ============================================================

-- ------------------------------------------------------------
-- 1. Export function (same tables + format as lib/backup.ts TABLES / v2)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION backup_export()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t       text;
  body    jsonb;
  result  jsonb := '{}'::jsonb;
  tables  text[] := ARRAY['instruments', 'maintenance_logs', 'locations', 'projects', 'certifications',
                          'storage_units', 'storage_boxes', 'reagents', 'bookings', 'cryo_vials',
                          'wishlist_items', 'log_entries', 'manuals', 'absences', 'app_settings',
                          'lab_users'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.%I), ''[]''::jsonb) FROM %I x',
                   CASE WHEN t = 'app_settings' THEN 'key' ELSE 'id' END, t)
      INTO body;
    result := result || jsonb_build_object(t, body);
  END LOOP;
  RETURN jsonb_build_object('_meta', jsonb_build_object(
           'version', 2,
           'exportedAt', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
           'tables', array_length(tables, 1),
           'source', 'backup_reader (weekly CI export)'))
         || result;
END;
$$;
REVOKE ALL ON FUNCTION backup_export() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 2. Role (created once; password shown in the final SELECT)
-- ------------------------------------------------------------
-- The password is handed to the final SELECT through a transaction-local
-- setting (no table, not even a temporary one, is created).
DO $$
DECLARE
  pw text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'backup_reader') THEN
    pw := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    EXECUTE format('CREATE ROLE backup_reader LOGIN NOINHERIT NOCREATEDB NOCREATEROLE PASSWORD %L', pw);
    PERFORM set_config('backup.new_password', pw, true);
    RAISE NOTICE 'Role backup_reader created — copy the password from the result below, it is not shown again.';
  ELSE
    RAISE NOTICE 'Role backup_reader already exists — password unchanged.';
  END IF;
END $$;

ALTER ROLE backup_reader SET statement_timeout = '5min';
GRANT CONNECT ON DATABASE postgres TO backup_reader;
GRANT USAGE ON SCHEMA public TO backup_reader;
GRANT EXECUTE ON FUNCTION backup_export() TO backup_reader;

-- Optional: let the same role run pg_dump (needs to read tables past RLS).
-- Only superusers / roles that themselves have BYPASSRLS may grant it; on
-- Supabase the postgres role has it, so this normally succeeds. If not, CI
-- still gets the JSON export — pg_dump is just skipped there.
DO $$
BEGIN
  EXECUTE 'ALTER ROLE backup_reader BYPASSRLS';
  EXECUTE 'GRANT SELECT ON ALL TABLES IN SCHEMA public TO backup_reader';
  EXECUTE 'GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO backup_reader';
  RAISE NOTICE 'backup_reader can also run pg_dump (BYPASSRLS + SELECT on public).';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_dump support not granted (%): CI will produce the JSON export only.', SQLERRM;
END $$;

-- ------------------------------------------------------------
-- 3. Checks
-- ------------------------------------------------------------
-- 3a. Role attributes (expect: rolcanlogin t, rolsuper f, rolcreaterole f)
SELECT rolname, rolcanlogin, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls AS pg_dump_ok
  FROM pg_roles WHERE rolname = 'backup_reader';

-- 3b. The function can be executed by backup_reader and by nobody else
SELECT r.rolname, has_function_privilege(r.rolname, 'public.backup_export()', 'EXECUTE') AS can_export
  FROM pg_roles r WHERE r.rolname IN ('backup_reader', 'anon', 'authenticated');

-- 3c. Export smoke test — one row per table with its row count
SELECT key AS table_name, jsonb_array_length(value) AS n_rows
  FROM jsonb_each(backup_export()) WHERE key <> '_meta' ORDER BY 1;

-- 3d. PASSWORD (only on first run; empty on re-runs). Copy it now into the
--     GitLab variable — it is not stored anywhere.
SELECT nullif(current_setting('backup.new_password', true), '') AS password;
