-- ============================================================
-- Consolidation round after the 29/09 external assessment
--
-- Five concrete gaps, all reproduced by the reviewer with synthetic data:
--   1. history_restore_version could restore an admin's OWN lab_users row to
--      an older version (old role → privileges lost). Now refused; and a
--      restored lab_users row never overwrites auth_user_id.
--   2. Approving orders went through is_lab_approver() → lab_can(...) with
--      no aal2 check, so a password-only session (no second factor) could
--      approve, while every other admin action required MFA. Now aal2.
--   3. cryo_vials had no uniqueness on the position: two people (or a
--      restore) could put two vials in the same slot. Now two partial
--      unique indexes (box_id / legacy coordinates). Existing duplicates
--      abort this script with the list of slots to fix first.
--   4. Absence auto-approval was decided by the client only; the server
--      accepted status = 'auto_approved' blindly. Now the trigger re-checks
--      the lab rules (absence_auto_approve_ok) and downgrades to 'pending'
--      with a flag when they are not met.
--   5. The JSON restore ran table by table from the browser and could stop
--      half-way. restore_backup(jsonb) does the whole thing in ONE
--      transaction on the server (upserts in dependency order, stale rows
--      removed in reverse order, caller's own account untouched).
--
-- Run AFTER supabase-2026-09-backup-reader.sql. Idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- 1. History: never restore your own profile; keep the auth link
-- ------------------------------------------------------------
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

  IF h.table_name = 'lab_users' THEN
    IF h.row_id = current_lab_user_id() THEN
      RAISE EXCEPTION 'You cannot restore your own profile from the history (an older version could remove your admin rights). Ask another admin.';
    END IF;
    -- The link to the auth account is never part of a restore: an old value
    -- could point to a deleted account and lock the person out.
    h.old_row := h.old_row - 'auth_user_id';
  END IF;

  result := history_apply_row(h.table_name, h.old_row);
  UPDATE row_history SET restored_at = now() WHERE id = p_history_id;

  RETURN jsonb_build_object('table', h.table_name, 'row_id', h.row_id, 'result', result);
END;
$$;
REVOKE ALL ON FUNCTION history_restore_version(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION history_restore_version(bigint) TO authenticated;

-- ------------------------------------------------------------
-- 2. Order approval requires the second factor, like every admin action
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_lab_approver()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_aal2() AND lab_can('approve_orders');
$$;

-- ------------------------------------------------------------
-- 3. One vial per slot
-- ------------------------------------------------------------
DO $$
DECLARE
  dup text;
BEGIN
  SELECT string_agg(slot || ' (' || n || ' vials)', '; ') INTO dup
    FROM (
      SELECT 'box ' || v.box_id || ' ' || chr(65 + v.row) || (v.col + 1) AS slot, count(*) AS n
        FROM cryo_vials v WHERE v.box_id IS NOT NULL
       GROUP BY v.box_id, v.row, v.col HAVING count(*) > 1
      UNION ALL
      SELECT v.storage_unit_id || ' R' || v.rack || ' B' || v.box || ' ' || chr(65 + v.row) || (v.col + 1), count(*)
        FROM cryo_vials v WHERE v.box_id IS NULL
       GROUP BY v.storage_unit_id, v.rack, v.box, v.row, v.col HAVING count(*) > 1
    ) d;
  IF dup IS NOT NULL THEN
    RAISE EXCEPTION 'cryo_vials: some slots hold more than one vial — move them first, then re-run: %', dup;
  END IF;
END $$;

-- DEFERRABLE exclusion constraints instead of partial unique indexes (29/09
-- follow-up): a restore that puts an old vial into a slot currently held by
-- a vial not in the backup, or swaps two vials, must not fail row by row.
-- restore_backup() runs SET CONSTRAINTS ALL DEFERRED so slots are checked
-- once at commit, on the final state. Every other write is still checked
-- immediately (INITIALLY IMMEDIATE). Partial unique indexes cannot be
-- deferred; EXCLUDE supports both WHERE and DEFERRABLE.
DROP INDEX IF EXISTS cryo_vials_slot_box_uidx;
DROP INDEX IF EXISTS cryo_vials_slot_legacy_uidx;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cryo_vials_slot_box_excl') THEN
    ALTER TABLE cryo_vials ADD CONSTRAINT cryo_vials_slot_box_excl
      EXCLUDE USING btree (box_id WITH =, "row" WITH =, col WITH =)
      WHERE (box_id IS NOT NULL) DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cryo_vials_slot_legacy_excl') THEN
    ALTER TABLE cryo_vials ADD CONSTRAINT cryo_vials_slot_legacy_excl
      EXCLUDE USING btree (storage_unit_id WITH =, rack WITH =, box WITH =, "row" WITH =, col WITH =)
      WHERE (box_id IS NULL) DEFERRABLE INITIALLY IMMEDIATE;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 4. Absences: the server re-applies the auto-approval rules
--    (port of evaluateAbsenceRequest in data/lab-data.ts; "today" is the
--    lab's local date, as in the browser)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION absence_auto_approve_ok(p_id text, p_user_id text, p_type text, p_start text, p_end text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  s            jsonb;
  today        date := (now() AT TIME ZONE 'Europe/Rome')::date;
  d_start      date;
  d_end        date;
  days         integer;
  notice       integer;
  cur          date;
  n_abs        integer;
  max_days     integer;
  notice_short integer;
  sw_cap       integer;
  sw_consec    integer;
  max_conc     integer;
  prev_work    date;
  next_work    date;
  deadline     date;
  m            text;
  used         integer;
  requested    integer;
BEGIN
  IF p_type = 'sick' THEN RETURN true; END IF;         -- recorded, never approved
  IF p_type = 'vacation' THEN RETURN false; END IF;    -- always a supervisor's call
  BEGIN
    d_start := p_start::date; d_end := p_end::date;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  IF d_end < d_start THEN RETURN false; END IF;

  SELECT value INTO s FROM app_settings WHERE key = 'absence_settings';
  s            := coalesce(s, '{}'::jsonb);
  max_days     := coalesce((s ->> 'autoApproveMaxDays')::integer, 2);
  notice_short := coalesce((s ->> 'noticeDaysShort')::integer, 2);
  sw_cap       := coalesce((s ->> 'swMonthlyCap')::integer, 4);
  sw_consec    := coalesce((s ->> 'swMaxConsecutive')::integer, 1);
  max_conc     := coalesce((s ->> 'maxConcurrentAbsent')::integer, 3);

  -- Restricted periods block every type but sick leave
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(s -> 'blackoutPeriods', '[]'::jsonb)) b
              WHERE p_start <= (b ->> 'end') AND p_end >= (b ->> 'start')) THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO days FROM generate_series(d_start, d_end, '1 day') g WHERE extract(isodow FROM g) < 6;

  -- Too many people already away on one of the days (full-day types, not SW)
  IF p_type IN ('day_off', 'trip') THEN
    FOR cur IN SELECT g::date FROM generate_series(d_start, d_end, '1 day') g WHERE extract(isodow FROM g) < 6 LOOP
      SELECT count(DISTINCT a.user_id) INTO n_abs
        FROM absences a
       WHERE a.id <> p_id AND a.user_id <> p_user_id
         AND a.status IN ('pending', 'auto_approved', 'approved')
         AND a.type IN ('day_off', 'vacation', 'sick', 'trip')
         AND a.start_date <= cur::text AND a.end_date >= cur::text;
      IF n_abs + 1 > max_conc THEN RETURN false; END IF;
    END LOOP;
  END IF;

  IF p_type IN ('hours', 'trip') THEN RETURN true; END IF;

  IF p_type = 'day_off' THEN
    IF days > max_days THEN RETURN false; END IF;
    IF d_start <= today THEN
      notice := 0;
    ELSE
      SELECT count(*) INTO notice FROM generate_series(today + 1, d_start - 1, '1 day') g WHERE extract(isodow FROM g) < 6;
    END IF;
    RETURN notice >= notice_short;
  END IF;

  IF p_type = 'smart_working' THEN
    IF days > sw_consec THEN RETURN false; END IF;
    prev_work := d_start - 1; WHILE extract(isodow FROM prev_work) >= 6 LOOP prev_work := prev_work - 1; END LOOP;
    next_work := d_end + 1;   WHILE extract(isodow FROM next_work) >= 6 LOOP next_work := next_work + 1; END LOOP;
    IF EXISTS (SELECT 1 FROM absences a
                WHERE a.id <> p_id AND a.user_id = p_user_id AND a.type = 'smart_working'
                  AND a.status IN ('pending', 'auto_approved', 'approved')
                  AND (a.end_date = prev_work::text OR a.start_date = next_work::text)) THEN
      RETURN false;
    END IF;
    FOR m IN SELECT DISTINCT x FROM unnest(ARRAY[to_char(d_start, 'YYYY-MM'), to_char(d_end, 'YYYY-MM')]) x LOOP
      SELECT count(*) INTO used
        FROM absences a, generate_series(a.start_date::date, a.end_date::date, '1 day') g
       WHERE a.id <> p_id AND a.user_id = p_user_id AND a.type = 'smart_working'
         AND a.status IN ('pending', 'auto_approved', 'approved')
         AND to_char(g, 'YYYY-MM') = m AND extract(isodow FROM g) < 6;
      SELECT count(*) INTO requested
        FROM generate_series(d_start, d_end, '1 day') g
       WHERE to_char(g, 'YYYY-MM') = m AND extract(isodow FROM g) < 6;
      IF used + requested > sw_cap THEN RETURN false; END IF;
    END LOOP;
    -- Planned by the Friday of the previous week
    deadline := d_start - ((extract(isodow FROM d_start)::integer - 1) + 3);
    RETURN today <= deadline;
  END IF;

  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION absence_auto_approve_ok(text, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- Supersedes the version in supabase-2026-09-tighten.sql: same rules plus
-- the server-side check of 'auto_approved' on INSERT by non-admins.
CREATE OR REPLACE FUNCTION protect_absence_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_lab_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status NOT IN ('pending', 'auto_approved') THEN
        RAISE EXCEPTION 'Only supervisors can create approved/rejected absences';
      END IF;
      IF NEW.decided_by IS NOT NULL OR NEW.decision_note IS NOT NULL THEN
        RAISE EXCEPTION 'Only supervisors can set decision fields';
      END IF;
      IF NEW.status = 'auto_approved'
         AND NOT absence_auto_approve_ok(NEW.id, NEW.user_id, NEW.type, NEW.start_date, NEW.end_date) THEN
        NEW.status := 'pending';
        NEW.flags  := concat_ws(' | ', nullif(NEW.flags, ''), 'Server check: this request needs supervisor approval.');
      END IF;
    ELSE
      IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'Only supervisors can approve or reject absences';
      END IF;
      IF OLD.status <> 'pending' THEN
        IF NEW.type       IS DISTINCT FROM OLD.type
        OR NEW.start_date  IS DISTINCT FROM OLD.start_date
        OR NEW.end_date    IS DISTINCT FROM OLD.end_date
        OR NEW.start_hour  IS DISTINCT FROM OLD.start_hour
        OR NEW.end_hour    IS DISTINCT FROM OLD.end_hour
        OR NEW.user_id     IS DISTINCT FROM OLD.user_id
        OR NEW.decided_by  IS DISTINCT FROM OLD.decided_by
        OR NEW.decided_at  IS DISTINCT FROM OLD.decided_at THEN
          RAISE EXCEPTION 'This absence has already been decided — only a cancellation is allowed. Ask a supervisor to change it.';
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
-- (triggers trg_protect_absence_status_ins/_upd already point to this function)

-- ------------------------------------------------------------
-- 5. Atomic restore of a backup JSON v2 (Admin → Backup → Restore Database)
-- ------------------------------------------------------------
-- Same semantics as the old browser-side restore, in one transaction:
--   * every row of the file is upserted, parents before children;
--   * rows not in the file are removed (never for lab_users / app_settings),
--     children before parents;
--   * the caller's own lab_users row is left alone and auth_user_id is never
--     written (the trigger re-links accounts on insert);
--   * protective reagent trigger bypassed via the lab.stock_rpc flag (a
--     restore is a deliberate admin action, not a stock movement).
-- If any row is refused, nothing at all changes.
CREATE OR REPLACE FUNCTION restore_backup(p_backup jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tables    text[] := ARRAY['instruments', 'maintenance_logs', 'locations', 'projects', 'certifications',
                            'storage_units', 'storage_boxes', 'reagents', 'bookings', 'cryo_vials',
                            'wishlist_items', 'log_entries', 'manuals', 'absences', 'app_settings',
                            'lab_users'];
  t         text;
  pk        text;
  rows_     jsonb;
  cols      text[];
  collist   text;
  setlist   text;
  ids       text[];
  n         integer;
  me        text := current_lab_user_id();
  my_email  text := lower(coalesce(auth.jwt() ->> 'email', ''));
  my_auth   text := coalesce(auth.uid()::text, '');
  upserted  jsonb := '{}'::jsonb;
  removed   jsonb := '{}'::jsonb;
BEGIN
  IF NOT is_lab_admin() THEN
    RAISE EXCEPTION 'Only an admin (with MFA) can restore a backup';
  END IF;
  IF jsonb_typeof(p_backup) <> 'object' OR (p_backup #>> '{_meta,version}') IS DISTINCT FROM '2' THEN
    RAISE EXCEPTION 'Not a MiMic backup JSON v2';
  END IF;
  FOREACH t IN ARRAY tables LOOP
    IF jsonb_typeof(p_backup -> t) IS DISTINCT FROM 'array' THEN
      RAISE EXCEPTION 'Not a full backup: table % is missing', t;
    END IF;
  END LOOP;

  PERFORM set_config('lab.stock_rpc', '1', true);
  -- Slot constraints (cryo_vials_slot_*_excl) are checked at commit, on the
  -- final state: an occupied slot freed by phase 2, or two vials swapping
  -- places, would otherwise abort the upsert row by row.
  SET CONSTRAINTS ALL DEFERRED;

  -- Phase 1: upserts, parents first
  FOREACH t IN ARRAY tables LOOP
    pk    := CASE WHEN t = 'app_settings' THEN 'key' ELSE 'id' END;
    rows_ := p_backup -> t;

    IF t = 'lab_users' THEN
      SELECT coalesce(jsonb_agg(r - 'auth_user_id'), '[]'::jsonb) INTO rows_
        FROM jsonb_array_elements(rows_) r
       WHERE NOT (r ->> 'id' = me
                  OR lower(coalesce(r ->> 'email', '')) = my_email AND my_email <> ''
                  OR coalesce(r ->> 'auth_user_id', '') = my_auth AND my_auth <> '');
    END IF;

    IF jsonb_array_length(rows_) = 0 THEN
      upserted := upserted || jsonb_build_object(t, 0);
      CONTINUE;
    END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(rows_) r WHERE (r ->> pk) IS NULL) THEN
      RAISE EXCEPTION 'Table %: a row has no % value', t, pk;
    END IF;

    SELECT array_agg(c.column_name::text ORDER BY c.ordinal_position) INTO cols
      FROM information_schema.columns c
     WHERE c.table_schema = 'public' AND c.table_name = t
       AND c.column_name::text IN (SELECT DISTINCT k FROM jsonb_array_elements(rows_) r, jsonb_object_keys(r) k);
    SELECT string_agg(format('%I', c), ', ') INTO collist FROM unnest(cols) c;
    SELECT string_agg(format('%I = EXCLUDED.%I', c, c), ', ') INTO setlist FROM unnest(cols) c WHERE c <> pk;

    EXECUTE format(
      'INSERT INTO %I (%s) SELECT %s FROM jsonb_populate_recordset(NULL::%I, $1) ON CONFLICT (%I) DO %s',
      t, collist, collist, t, pk,
      CASE WHEN setlist IS NULL THEN 'NOTHING' ELSE 'UPDATE SET ' || setlist END)
      USING rows_;
    GET DIAGNOSTICS n = ROW_COUNT;
    upserted := upserted || jsonb_build_object(t, n);
  END LOOP;

  -- Phase 2: stale rows, children first
  FOR i IN REVERSE array_length(tables, 1)..1 LOOP
    t := tables[i];
    IF t IN ('lab_users', 'app_settings') THEN CONTINUE; END IF;
    pk := 'id';
    SELECT coalesce(array_agg(r ->> pk), ARRAY[]::text[]) INTO ids FROM jsonb_array_elements(p_backup -> t) r;
    EXECUTE format('DELETE FROM %I WHERE %I <> ALL ($1)', t, pk) USING ids;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN removed := removed || jsonb_build_object(t, n); END IF;
  END LOOP;

  RETURN jsonb_build_object('upserted', upserted, 'removed', removed);
END;
$$;
REVOKE ALL ON FUNCTION restore_backup(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION restore_backup(jsonb) TO authenticated;

-- ------------------------------------------------------------
-- 6. Checks
-- ------------------------------------------------------------
-- 6a. is_lab_approver now mentions is_aal2 (expect true)
SELECT prosrc LIKE '%is_aal2()%' AS approver_needs_mfa FROM pg_proc WHERE proname = 'is_lab_approver';

-- 6b. Slot constraints: expect 2 rows, both deferrable, and no leftover index
SELECT conname, condeferrable FROM pg_constraint WHERE conname LIKE 'cryo_vials_slot_%_excl';
SELECT indexname AS leftover_index FROM pg_indexes WHERE tablename = 'cryo_vials' AND indexname LIKE 'cryo_vials_slot_%_uidx';

-- 6c. Server-side absence check wired in (expect true)
SELECT prosrc LIKE '%absence_auto_approve_ok%' AS absence_check FROM pg_proc WHERE proname = 'protect_absence_status';

-- 6d. Functions callable by the app (expect restore_backup, history_restore_version = true)
SELECT p.proname, has_function_privilege('authenticated', p.oid, 'EXECUTE') AS app_can_call
  FROM pg_proc p WHERE p.proname IN ('restore_backup', 'history_restore_version', 'absence_auto_approve_ok')
 ORDER BY 1;
