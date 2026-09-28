-- ============================================================
-- Row history (audit trail + undo) and daily in-database snapshots
--
-- Decided with Marco on 28/09 (Free plan: no Supabase backups):
--   1. row_history — every UPDATE / DELETE on the lab tables stores the row
--      as it was BEFORE the change, with who and when (INSERTs are recorded
--      as an existence marker only). Cheap (only what changes), precise
--      (nothing is lost between backups), attributable. Restore functions
--      bring back one deleted row, one previous version, or a whole table
--      as it was at any instant ("point in time").
--   2. db_snapshots — once a day (pg_cron, 02:30 UTC) every table is copied
--      as one jsonb array; kept 30 days. Safety net against a script or a
--      bug wrecking a table (or the history itself). Restore = download as
--      backup JSON from Admin → Backup, then the usual Restore Database.
--   Neither protects against losing the Supabase project itself: for that,
--   keep exporting the JSON backup outside Supabase.
--
-- Run AFTER supabase-2026-09-beta-round2.sql. Idempotent.
-- Re-running keeps the existing history and snapshots.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Tables
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS row_history (
  id              bigserial PRIMARY KEY,
  table_name      text        NOT NULL,
  row_id          text        NOT NULL,
  op              text        NOT NULL CHECK (op IN ('INSERT', 'UPDATE', 'DELETE')),
  old_row         jsonb,                      -- the row BEFORE the change (NULL for INSERT)
  changed_cols    text[],                     -- UPDATE only: which columns changed
  changed_at      timestamptz NOT NULL DEFAULT now(),
  changed_by      text,                       -- lab_users.id (NULL from the SQL editor / cron)
  changed_by_name text,
  restored_at     timestamptz                 -- set when this version was restored
);
CREATE INDEX IF NOT EXISTS row_history_row_idx     ON row_history (table_name, row_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS row_history_time_idx    ON row_history (changed_at DESC);
CREATE INDEX IF NOT EXISTS row_history_deleted_idx ON row_history (changed_at DESC) WHERE op = 'DELETE' AND restored_at IS NULL;

CREATE TABLE IF NOT EXISTS db_snapshots (
  id         bigserial PRIMARY KEY,
  taken_at   timestamptz NOT NULL,
  table_name text        NOT NULL,
  n_rows     integer     NOT NULL,
  rows       jsonb       NOT NULL              -- jsonb array of the rows (TOAST-compressed)
);
CREATE INDEX IF NOT EXISTS db_snapshots_time_idx ON db_snapshots (taken_at DESC, table_name);

ALTER TABLE row_history  ENABLE ROW LEVEL SECURITY;
ALTER TABLE db_snapshots ENABLE ROW LEVEL SECURITY;

-- Members may read the history of what they work with (a vial, a reagent…);
-- people records only for admins. Nobody writes from the client: rows come
-- from the trigger (SECURITY DEFINER) and restores go through the RPCs.
DROP POLICY IF EXISTS "row_history_select" ON row_history;
CREATE POLICY "row_history_select" ON row_history
  FOR SELECT TO authenticated
  USING (is_lab_admin() OR (is_lab_member() AND table_name NOT IN ('lab_users', 'manuals')));

DROP POLICY IF EXISTS "db_snapshots_select" ON db_snapshots;
CREATE POLICY "db_snapshots_select" ON db_snapshots
  FOR SELECT TO authenticated
  USING (is_lab_admin());

REVOKE INSERT, UPDATE, DELETE ON row_history  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON db_snapshots FROM anon, authenticated;

-- ------------------------------------------------------------
-- 2. Which tables are covered (same set as the JSON backup, minus
--    log_entries — append-only, already an audit — and page_views)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION history_tables()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT ARRAY['instruments', 'maintenance_logs', 'locations', 'projects', 'certifications',
               'storage_units', 'storage_boxes', 'reagents', 'bookings', 'cryo_vials',
               'wishlist_items', 'manuals', 'absences', 'app_settings', 'lab_users'];
$$;

CREATE OR REPLACE FUNCTION history_pk(p_table text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN p_table = 'app_settings' THEN 'key' ELSE 'id' END;
$$;

-- ------------------------------------------------------------
-- 3. The recording trigger
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_row_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o        jsonb;
  n        jsonb;
  rid      text;
  cols     text[];
  me_id    text;
  me_name  text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    n   := to_jsonb(NEW);
    rid := coalesce(n ->> 'id', n ->> 'key');
  ELSE
    o   := to_jsonb(OLD);
    rid := coalesce(o ->> 'id', o ->> 'key');
  END IF;

  IF TG_OP = 'UPDATE' THEN
    n := to_jsonb(NEW);
    IF o = n THEN
      RETURN NEW;   -- rewrite with identical values: nothing to record
    END IF;
    SELECT array_agg(k ORDER BY k) INTO cols
      FROM jsonb_object_keys(o || n) k
     WHERE o -> k IS DISTINCT FROM n -> k;
  END IF;

  -- Who: the app user behind the JWT (NULL from the SQL editor or cron)
  SELECT u.id, u.name INTO me_id, me_name
    FROM lab_users u WHERE u.id = current_lab_user_id();

  INSERT INTO row_history (table_name, row_id, op, old_row, changed_cols, changed_by, changed_by_name)
  VALUES (TG_TABLE_NAME, rid, TG_OP, o, cols, me_id, coalesce(me_name, 'SQL / system'));

  RETURN coalesce(NEW, OLD);
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY history_tables() LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_row_history ON %I', t);
    EXECUTE format('CREATE TRIGGER trg_row_history AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION record_row_history()', t);
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- 4. Restore helpers (admins with MFA only; every restore is itself
--    recorded by the trigger, so it can be undone too)
-- ------------------------------------------------------------

-- Write one jsonb row into its table: INSERT if the id is absent, else
-- UPDATE. Only the columns present in the jsonb are written, so columns
-- added to the table after the version was recorded keep their current
-- value (update) or default (insert).
CREATE OR REPLACE FUNCTION history_apply_row(p_table text, p_row jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pk      text := history_pk(p_table);
  rid     text := p_row ->> history_pk(p_table);
  cols    text[];
  collist text;
  setlist text;
  found_  boolean;
BEGIN
  IF NOT (p_table = ANY (history_tables())) THEN
    RAISE EXCEPTION 'Table % is not covered by the history', p_table;
  END IF;
  IF rid IS NULL THEN
    RAISE EXCEPTION 'Row has no % value', pk;
  END IF;

  SELECT array_agg(c.column_name::text ORDER BY c.ordinal_position) INTO cols
    FROM information_schema.columns c
   WHERE c.table_schema = 'public' AND c.table_name = p_table
     AND p_row ? c.column_name::text;

  EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I WHERE %I = $1)', p_table, pk) INTO found_ USING rid;

  IF found_ THEN
    SELECT string_agg(format('%I', c), ', ') INTO setlist FROM unnest(cols) c WHERE c <> pk;
    IF setlist IS NULL THEN RETURN 'unchanged'; END IF;
    EXECUTE format(
      'UPDATE %I t SET (%s) = (SELECT %s FROM jsonb_populate_record(NULL::%I, $1)) WHERE t.%I = $2',
      p_table, setlist, setlist, p_table, pk) USING p_row, rid;
    RETURN 'updated';
  ELSE
    SELECT string_agg(format('%I', c), ', ') INTO collist FROM unnest(cols) c;
    EXECUTE format(
      'INSERT INTO %I (%s) SELECT %s FROM jsonb_populate_record(NULL::%I, $1)',
      p_table, collist, collist, p_table) USING p_row;
    RETURN 'inserted';
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION history_apply_row(text, jsonb) FROM PUBLIC, anon, authenticated;

-- Bring back the version stored in one history line: for a DELETE line the
-- row is re-created as it was; for an UPDATE line the row goes back to how
-- it was before that change (later changes are undone as well).
CREATE OR REPLACE FUNCTION history_restore_version(p_history_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h       row_history%ROWTYPE;
  result  text;
BEGIN
  IF NOT is_lab_admin() THEN
    RAISE EXCEPTION 'Only an admin (with MFA) can restore data';
  END IF;
  SELECT * INTO h FROM row_history WHERE id = p_history_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'History line % not found', p_history_id; END IF;
  IF h.op = 'INSERT' OR h.old_row IS NULL THEN
    RAISE EXCEPTION 'This line records a creation: there is no previous version to restore';
  END IF;

  result := history_apply_row(h.table_name, h.old_row);
  UPDATE row_history SET restored_at = now() WHERE id = p_history_id;

  RETURN jsonb_build_object('table', h.table_name, 'row_id', h.row_id, 'result', result);
END;
$$;
REVOKE ALL ON FUNCTION history_restore_version(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION history_restore_version(bigint) TO authenticated;

-- A whole table as it was at an instant, compared with now.
--   status: 'unchanged' | 'changed' | 'deleted' (existed then, not now)
--           | 'added' (exists now, did not exist then)
-- Existence at p_ts: the last event at or before p_ts decides (DELETE → no);
-- with no event before p_ts the row existed unless its INSERT is recorded
-- (i.e. it was created later). State at p_ts: the old_row of the first
-- UPDATE/DELETE after p_ts, else the current row.
CREATE OR REPLACE FUNCTION history_table_as_of(p_table text, p_ts timestamptz)
RETURNS TABLE (row_id text, at_ts jsonb, now_row jsonb, status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  pk text := history_pk(p_table);
BEGIN
  IF NOT is_lab_admin() THEN
    RAISE EXCEPTION 'Only an admin (with MFA) can browse the history of a whole table';
  END IF;
  IF NOT (p_table = ANY (history_tables())) THEN
    RAISE EXCEPTION 'Table % is not covered by the history', p_table;
  END IF;

  RETURN QUERY EXECUTE format($q$
    WITH cur AS (
      SELECT (t.%I)::text AS rid, to_jsonb(t) AS r FROM %I t
    ), ev AS (
      SELECT h.row_id AS rid, h.op, h.old_row, h.changed_at
        FROM row_history h WHERE h.table_name = $1
    ), ids AS (
      SELECT rid FROM cur UNION SELECT rid FROM ev
    ), last_before AS (
      SELECT DISTINCT ON (rid) rid, op FROM ev WHERE changed_at <= $2
       ORDER BY rid, changed_at DESC, op
    ), first_after AS (
      SELECT DISTINCT ON (rid) rid, old_row FROM ev
       WHERE changed_at > $2 AND op <> 'INSERT'
       ORDER BY rid, changed_at ASC
    ), has_insert AS (
      SELECT DISTINCT rid FROM ev WHERE op = 'INSERT'
    ), x AS (
      SELECT i.rid,
             CASE WHEN lb.op IS NOT NULL THEN lb.op <> 'DELETE'
                  ELSE hi.rid IS NULL END                       AS existed,
             coalesce(fa.old_row, c.r)                          AS then_row,
             c.r                                                AS now_r
        FROM ids i
        LEFT JOIN cur c          ON c.rid  = i.rid
        LEFT JOIN last_before lb ON lb.rid = i.rid
        LEFT JOIN first_after fa ON fa.rid = i.rid
        LEFT JOIN has_insert hi  ON hi.rid = i.rid
    )
    SELECT rid,
           CASE WHEN existed THEN then_row END,
           now_r,
           CASE WHEN existed AND now_r IS NULL           THEN 'deleted'
                WHEN existed AND then_row = now_r        THEN 'unchanged'
                WHEN existed                             THEN 'changed'
                WHEN now_r IS NOT NULL                   THEN 'added'
           END
      FROM x
     WHERE existed OR now_r IS NOT NULL
     ORDER BY rid
  $q$, pk, p_table) USING p_table, p_ts;
END;
$$;
REVOKE ALL ON FUNCTION history_table_as_of(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION history_table_as_of(text, timestamptz) TO authenticated;

-- Put a whole table back as it was at p_ts: deleted rows re-created,
-- changed rows reverted, rows added since removed. One transaction: if a
-- single row is refused (e.g. a booking that no longer fits), nothing
-- changes. The trigger records every step, so this too can be undone.
CREATE OR REPLACE FUNCTION history_restore_table_as_of(p_table text, p_ts timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec        record;
  n_ins      integer := 0;
  n_upd      integer := 0;
  n_del      integer := 0;
  pk         text := history_pk(p_table);
BEGIN
  IF NOT is_lab_admin() THEN
    RAISE EXCEPTION 'Only an admin (with MFA) can restore a table';
  END IF;
  IF p_table = 'lab_users' THEN
    RAISE EXCEPTION 'lab_users is restored one person at a time (a stale version could lock people out)';
  END IF;

  FOR rec IN SELECT * FROM history_table_as_of(p_table, p_ts) WHERE status <> 'unchanged' LOOP
    IF rec.status = 'added' THEN
      EXECUTE format('DELETE FROM %I WHERE %I = $1', p_table, pk) USING rec.row_id;
      n_del := n_del + 1;
    ELSIF rec.status = 'deleted' THEN
      PERFORM history_apply_row(p_table, rec.at_ts);
      n_ins := n_ins + 1;
    ELSE
      PERFORM history_apply_row(p_table, rec.at_ts);
      n_upd := n_upd + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('table', p_table, 'as_of', p_ts, 'restored', n_ins, 'reverted', n_upd, 'removed', n_del);
END;
$$;
REVOKE ALL ON FUNCTION history_restore_table_as_of(text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION history_restore_table_as_of(text, timestamptz) TO authenticated;

-- ------------------------------------------------------------
-- 5. Daily snapshot (every backup table, log_entries included) + retention
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION take_db_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ts      timestamptz := now();
  t       text;
  n       integer;
  body    jsonb;
  total   integer := 0;
  tables  text[] := history_tables() || ARRAY['log_entries'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('SELECT count(*), coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) FROM %I x', t) INTO n, body;
    INSERT INTO db_snapshots (taken_at, table_name, n_rows, rows) VALUES (ts, t, n, body);
    total := total + n;
  END LOOP;

  -- Retention: snapshots 30 days, history 400 days
  DELETE FROM db_snapshots WHERE taken_at < now() - interval '30 days';
  DELETE FROM row_history  WHERE changed_at < now() - interval '400 days';

  RETURN jsonb_build_object('taken_at', ts, 'tables', array_length(tables, 1), 'rows', total);
END;
$$;
-- Run by cron (as postgres) or through the admin wrapper below; never
-- directly by app users.
REVOKE ALL ON FUNCTION take_db_snapshot() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION take_db_snapshot_as_admin()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_lab_admin() THEN
    RAISE EXCEPTION 'Only an admin (with MFA) can take a snapshot';
  END IF;
  RETURN take_db_snapshot();
END;
$$;
REVOKE ALL ON FUNCTION take_db_snapshot_as_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION take_db_snapshot_as_admin() TO authenticated;

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'mimic-daily-snapshot';
  PERFORM cron.schedule('mimic-daily-snapshot', '30 2 * * *', 'SELECT public.take_db_snapshot();');
  RAISE NOTICE 'pg_cron job "mimic-daily-snapshot" scheduled daily at 02:30 UTC.';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available (%). Enable it in Dashboard → Database → Extensions and re-run this file, or use "Snapshot now" in Admin → Backup.', SQLERRM;
END $$;

-- First snapshot right away, so there is a baseline from day one
SELECT take_db_snapshot();

-- ------------------------------------------------------------
-- 6. Checks
-- ------------------------------------------------------------
-- 6a. One trg_row_history per covered table (expect 15 rows)
SELECT c.relname AS table_name, t.tgname
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
 WHERE t.tgname = 'trg_row_history' AND NOT t.tgisinternal
 ORDER BY c.relname;

-- 6b. Snapshot just taken: rows per table and size
SELECT table_name, n_rows, pg_size_pretty(pg_column_size(rows)::bigint) AS size
  FROM db_snapshots WHERE taken_at = (SELECT max(taken_at) FROM db_snapshots)
 ORDER BY table_name;

-- 6c. pg_cron installed? (expect true; if false enable it in Dashboard →
--     Database → Extensions and re-run this file). Then, separately:
--     SELECT jobname, schedule, active FROM cron.job WHERE jobname = 'mimic-daily-snapshot';
SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') AS pg_cron_installed;

-- 6d. Policies (expect select-only on both tables)
SELECT tablename, policyname, cmd FROM pg_policies
 WHERE tablename IN ('row_history', 'db_snapshots') ORDER BY tablename, policyname;
