-- ============================================================
-- MiMic Lab Manager — students withdraw selected reagents (30 October 2026)
-- ============================================================
-- Run in Supabase → SQL Editor AFTER supabase-2026-10-biomimx.sql
-- (needs lab_effective_role). Idempotent.
--
-- Marco: MSc students (and members of other affiliations, who count as
-- MSc) must record their own withdrawals of a few consumables — PDMS and
-- the 3D-printing resins for sure, maybe more. Instead of opening every
-- reagent, each item gets a flag `open_to_students` that admins / PIs /
-- lab & project managers set from the reagent form ("Students may
-- withdraw"). Guests never withdraw. Stocks stay reserved to their
-- responsibles. Mirrors canWithdrawReagentFor() in data/lab-data.ts.
--
--   §1 reagents.open_to_students
--   §2 protect_reagent_fields v3 — the flag is a manager-only field
--   §3 adjust_reagent_stock v7 — withdrawal allowed on open items
--   §4 checks
-- ============================================================

-- §1
ALTER TABLE reagents ADD COLUMN IF NOT EXISTS open_to_students boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN reagents.open_to_students IS 'MSc students and other affiliations may withdraw from it (PDMS, resins…). Set by managers.';

-- §2
CREATE OR REPLACE FUNCTION protect_reagent_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  manager boolean;
  me      lab_users%ROWTYPE;
BEGIN
  -- Internal UPDATEs of the stock RPCs: they already checked roles,
  -- stock access and limits, and wrote the movement log.
  IF current_setting('lab.stock_rpc', true) = '1' THEN
    RETURN NEW;
  END IF;

  manager := is_booking_manager();

  IF NOT manager THEN
    IF TG_OP = 'INSERT' THEN
      IF coalesce(NEW.kind, 'item') <> 'item'
      OR coalesce(array_length(NEW.responsible_user_ids, 1), 0) > 0
      OR NEW.derived_from_id IS NOT NULL
      OR coalesce(NEW.open_to_students, false) THEN
        RAISE EXCEPTION 'Only admins, the PI or a lab manager can classify a reagent as stock / working solution or open it to students';
      END IF;
    ELSE
      IF NEW.kind                 IS DISTINCT FROM OLD.kind
      OR NEW.responsible_user_ids IS DISTINCT FROM OLD.responsible_user_ids
      OR NEW.derived_from_id      IS DISTINCT FROM OLD.derived_from_id
      OR NEW.open_to_students     IS DISTINCT FROM OLD.open_to_students THEN
        RAISE EXCEPTION 'Only admins, the PI or a lab manager can change the classification of a reagent or open it to students';
      END IF;
      IF NEW.current_stock IS DISTINCT FROM OLD.current_stock THEN
        RAISE EXCEPTION 'Quantities change only through Withdraw / Restock (logged movements), not by editing the reagent';
      END IF;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.current_stock IS DISTINCT FROM OLD.current_stock THEN
    -- Manager's inventory correction outside the RPCs: keep an audit line
    -- so every change of quantity is in the log, like a movement.
    SELECT * INTO me FROM lab_users WHERE id = current_lab_user_id();
    INSERT INTO log_entries (id, "timestamp", user_id, user_name, action, category, details)
    VALUES (
      lower(to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint))
        || substr(md5(random()::text || clock_timestamp()::text), 1, 9),
      to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      coalesce(me.id, ''), coalesce(me.name, 'SQL'),
      'Corrected stock of ' || NEW.name, 'reagent',
      trim(both from OLD.current_stock::text || ' → ' || NEW.current_stock::text || ' ' || coalesce(NEW.unit, ''))
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_reagent_fields ON reagents;
CREATE TRIGGER trg_protect_reagent_fields
  BEFORE INSERT OR UPDATE ON reagents
  FOR EACH ROW EXECUTE FUNCTION protect_reagent_fields();

-- §3
CREATE OR REPLACE FUNCTION adjust_reagent_stock(
  p_reagent_id text,
  p_delta      numeric,
  p_purpose    text DEFAULT NULL,
  p_project    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r        reagents%ROWTYPE;
  me       lab_users%ROWTYPE;
  nxt      numeric;
  log_id   text;
  log_ts   text;
  action   text;
  details  text;
BEGIN
  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'Quantity must be non-zero';
  END IF;

  SELECT * INTO me FROM lab_users WHERE id = current_lab_user_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a lab member';
  END IF;

  SELECT * INTO r FROM reagents WHERE id = p_reagent_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reagent not found';
  END IF;

  -- v7: items flagged open_to_students may be withdrawn by everybody but guests
  --      (MSc students, members of other affiliations) — mirrors canWithdrawReagentFor()
  IF p_delta < 0 AND NOT lab_can('withdraw_reagents')
     AND NOT (coalesce(r.open_to_students, false) AND lab_effective_role(me.affiliation, me.role) <> 'guest') THEN
    RAISE EXCEPTION 'Your role cannot withdraw this reagent';
  END IF;
  -- v6: a responsible of THIS reagent may restock it whatever the role
  IF p_delta > 0 AND NOT lab_can('add_reagents') AND NOT (me.id = ANY (coalesce(r.responsible_user_ids, '{}'::text[]))) THEN
    RAISE EXCEPTION 'Your role cannot restock reagents (only the responsibles of this item can)';
  END IF;

  IF p_delta < 0 AND NOT can_access_stock(p_reagent_id) THEN
    RAISE EXCEPTION 'This is a stock: only its responsibles (or a lab manager) can take from it';
  END IF;

  nxt := r.current_stock + p_delta;
  IF nxt < 0 THEN
    RAISE EXCEPTION 'Not enough stock: % available, % requested', r.current_stock, -p_delta;
  END IF;
  IF coalesce(r.max_stock, 0) > 0 AND nxt > r.max_stock THEN
    RAISE EXCEPTION 'Exceeds the maximum stock (%): % in stock, % requested', r.max_stock, r.current_stock, p_delta;
  END IF;

  PERFORM set_config('lab.stock_rpc', '1', true);
  UPDATE reagents SET current_stock = nxt WHERE id = p_reagent_id;

  IF p_delta < 0 THEN
    action  := 'Withdrew ' || r.name;
    details := trim(both from (-p_delta)::text || ' ' || coalesce(r.unit, ''))
               || CASE WHEN coalesce(p_purpose, '') <> '' OR coalesce(p_project, '') <> ''
                       THEN ' - ' || coalesce(p_purpose, '') || ' (' || coalesce(p_project, '') || ')'
                       ELSE '' END;
  ELSE
    action  := 'Restocked ' || r.name;
    details := trim(both from '+' || p_delta::text || ' ' || coalesce(r.unit, ''));
  END IF;

  log_id := lower(to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint))
            || substr(md5(random()::text || clock_timestamp()::text), 1, 9);
  log_ts := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  INSERT INTO log_entries (id, "timestamp", user_id, user_name, action, category, details)
  VALUES (log_id, log_ts, me.id, me.name, action, 'reagent', details);

  RETURN jsonb_build_object(
    'stock', nxt,
    'applied', p_delta,
    'log', jsonb_build_object(
      'id', log_id, 'timestamp', log_ts, 'userId', me.id, 'userName', me.name,
      'action', action, 'category', 'reagent', 'details', details)
  );
END;
$$;
REVOKE ALL ON FUNCTION adjust_reagent_stock(text, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION adjust_reagent_stock(text, numeric, text, text) TO authenticated;

-- §4 expect: all true
SELECT
  (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'reagents' AND column_name = 'open_to_students')) AS column_ok,
  (SELECT prosrc LIKE '%open_to_students%' FROM pg_proc WHERE proname = 'protect_reagent_fields')                            AS guard_v3,
  (SELECT prosrc LIKE '%open_to_students%' FROM pg_proc WHERE proname = 'adjust_reagent_stock')                              AS rpc_v7;

-- Candidates to open (nothing is changed here: tick "Students may withdraw"
-- in the reagent form, or run the UPDATE below after checking the names)
SELECT id, name, category, current_stock, unit, open_to_students
FROM reagents WHERE name ~* 'pdms|sylgard|resin' ORDER BY name;
-- UPDATE reagents SET open_to_students = true WHERE name ~* 'pdms|sylgard|resin';
