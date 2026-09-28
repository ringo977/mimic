-- ============================================================
-- MiMic Lab Manager — stock vs working solution (Sep 2026)
-- ============================================================
-- Run in Supabase → SQL Editor. Idempotent: safe to re-run.
-- Run AFTER supabase-2026-09-fix-assessment.sql (redefines its stock RPC).
--
-- The lab keeps two forms of many reagents: the STOCK (powder or
-- concentrated solution, often at −80 °C, looked after by one or two
-- people) and the WORKING SOLUTION prepared from it (aliquots at −20 °C,
-- used by everybody). Until now both were plain rows. This adds:
--
--   reagents.kind                  'stock' | 'working' | 'item'   (default item)
--   reagents.derived_from_id       working solution → its stock
--   reagents.responsible_user_ids  stock → lab_users.id[] of the people in charge
--
-- Access rule (enforced here, mirrored by canAccessStock() in the app):
-- only the responsibles, admins, the PI and lab managers may TAKE from a
-- stock. Everybody still sees it. Restocking follows canAddReagents as before.
--
-- Backfill from the imported inventory: rows whose name says "aliquot(s)"
-- are working solutions; a non-aliquot row sharing the catalogue number of
-- an aliquot row is its stock, and the pair is linked. Everything else stays
-- "item" for Stefania to classify from Admin.
--
-- New RPC prepare_working_solution(): take from the stock and top up the
-- working solution in ONE transaction, one log line.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Columns
-- ------------------------------------------------------------
ALTER TABLE reagents ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'item';
ALTER TABLE reagents ADD COLUMN IF NOT EXISTS derived_from_id text;
ALTER TABLE reagents ADD COLUMN IF NOT EXISTS responsible_user_ids text[] NOT NULL DEFAULT '{}'::text[];

DO $$ BEGIN
  ALTER TABLE reagents ADD CONSTRAINT reagents_kind_check CHECK (kind IN ('stock', 'working', 'item'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE reagents ADD CONSTRAINT reagents_derived_from_fkey
    FOREIGN KEY (derived_from_id) REFERENCES reagents(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS reagents_derived_from_idx ON reagents (derived_from_id);

-- ------------------------------------------------------------
-- 2. Backfill (only rows still 'item', so re-running never undoes edits)
-- ------------------------------------------------------------
UPDATE reagents
SET    kind = 'working'
WHERE  kind = 'item'
  AND  name ~* '\maliquot';

-- A stock is a non-aliquot row with the same catalogue number as a working
-- solution (catalogue numbers are per product, so this is reliable).
UPDATE reagents r
SET    kind = 'stock'
WHERE  r.kind = 'item'
  AND  btrim(r.catalog_number) <> ''
  AND  EXISTS (SELECT 1 FROM reagents w
               WHERE  w.kind = 'working'
                 AND  w.catalog_number = r.catalog_number
                 AND  w.id <> r.id);

-- Link each working solution to its stock when there is exactly one
UPDATE reagents w
SET    derived_from_id = s.id
FROM  (SELECT catalog_number, min(id) AS id
       FROM   reagents
       WHERE  kind = 'stock' AND btrim(catalog_number) <> ''
       GROUP  BY catalog_number
       HAVING count(*) = 1) s
WHERE  w.kind = 'working'
  AND  w.derived_from_id IS NULL
  AND  w.catalog_number = s.catalog_number;

-- ------------------------------------------------------------
-- 3. Who may take from a stock
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_access_stock(p_reagent_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   reagents r
    JOIN   lab_users u ON u.id = current_lab_user_id()
    WHERE  r.id = p_reagent_id
      AND (r.kind <> 'stock'
           OR u.is_admin = true
           OR u.role IN ('admin', 'pi', 'lab_manager')
           OR u.id = ANY (r.responsible_user_ids))
  );
$$;

-- Classification and responsibles are management fields: admin/PI/lab
-- manager only (same set that manages everybody's bookings).
CREATE OR REPLACE FUNCTION protect_reagent_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_booking_manager() THEN
    IF NEW.kind                 IS DISTINCT FROM OLD.kind
    OR NEW.responsible_user_ids IS DISTINCT FROM OLD.responsible_user_ids
    OR NEW.derived_from_id      IS DISTINCT FROM OLD.derived_from_id THEN
      RAISE EXCEPTION 'Only admins, the PI or a lab manager can change the stock / working-solution classification of a reagent';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_reagent_fields ON reagents;
CREATE TRIGGER trg_protect_reagent_fields
  BEFORE UPDATE ON reagents
  FOR EACH ROW EXECUTE FUNCTION protect_reagent_fields();

-- ------------------------------------------------------------
-- 4. Stock RPC v4 — same as v3 plus the stock access check
--    (supersedes the version in supabase-2026-09-fix-assessment.sql)
-- ------------------------------------------------------------
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

  IF p_delta < 0 AND NOT lab_can('withdraw_reagents') THEN
    RAISE EXCEPTION 'Your role cannot withdraw reagents';
  END IF;
  IF p_delta > 0 AND NOT lab_can('add_reagents') THEN
    RAISE EXCEPTION 'Your role cannot restock reagents';
  END IF;

  SELECT * INTO r FROM reagents WHERE id = p_reagent_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reagent not found';
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

-- ------------------------------------------------------------
-- 5. Prepare a working solution: −stock, +working, one transaction
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION prepare_working_solution(
  p_stock_id     text,
  p_stock_taken  numeric,
  p_working_id   text,
  p_working_made numeric,
  p_notes        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  st       reagents%ROWTYPE;
  ws       reagents%ROWTYPE;
  me       lab_users%ROWTYPE;
  st_next  numeric;
  ws_next  numeric;
  log_id   text;
  log_ts   text;
  details  text;
BEGIN
  IF coalesce(p_stock_taken, 0) <= 0 OR coalesce(p_working_made, 0) <= 0 THEN
    RAISE EXCEPTION 'Quantities must be positive';
  END IF;
  IF p_stock_id = p_working_id THEN
    RAISE EXCEPTION 'Stock and working solution must be different items';
  END IF;

  SELECT * INTO me FROM lab_users WHERE id = current_lab_user_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a lab member';
  END IF;
  -- Preparing = taking from the stock + restocking the working solution
  IF NOT lab_can('withdraw_reagents') OR NOT lab_can('add_reagents') THEN
    RAISE EXCEPTION 'Your role cannot prepare working solutions';
  END IF;

  -- Lock both rows in a fixed order to avoid deadlocks between two preparers
  SELECT * INTO st FROM reagents WHERE id = least(p_stock_id, p_working_id) FOR UPDATE;
  SELECT * INTO ws FROM reagents WHERE id = greatest(p_stock_id, p_working_id) FOR UPDATE;
  SELECT * INTO st FROM reagents WHERE id = p_stock_id;
  SELECT * INTO ws FROM reagents WHERE id = p_working_id;
  IF st.id IS NULL OR ws.id IS NULL THEN
    RAISE EXCEPTION 'Stock or working solution not found';
  END IF;
  IF st.kind <> 'stock' THEN
    RAISE EXCEPTION '% is not classified as a stock', st.name;
  END IF;
  IF ws.kind <> 'working' THEN
    RAISE EXCEPTION '% is not classified as a working solution', ws.name;
  END IF;
  IF NOT can_access_stock(st.id) THEN
    RAISE EXCEPTION 'This is a stock: only its responsibles (or a lab manager) can take from it';
  END IF;

  st_next := st.current_stock - p_stock_taken;
  IF st_next < 0 THEN
    RAISE EXCEPTION 'Not enough stock: % available, % requested', st.current_stock, p_stock_taken;
  END IF;
  ws_next := ws.current_stock + p_working_made;
  IF coalesce(ws.max_stock, 0) > 0 AND ws_next > ws.max_stock THEN
    RAISE EXCEPTION 'Exceeds the maximum of %: % in stock, % added', ws.name, ws.current_stock, p_working_made;
  END IF;

  UPDATE reagents SET current_stock = st_next WHERE id = st.id;
  UPDATE reagents SET current_stock = ws_next,
                      derived_from_id = coalesce(derived_from_id, st.id)   -- remember the link
                  WHERE id = ws.id;

  details := '−' || p_stock_taken::text || ' ' || coalesce(st.unit, '') || ' ' || st.name
             || ' → +' || p_working_made::text || ' ' || coalesce(ws.unit, '') || ' ' || ws.name
             || CASE WHEN coalesce(p_notes, '') <> '' THEN ' - ' || p_notes ELSE '' END;

  log_id := lower(to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint))
            || substr(md5(random()::text || clock_timestamp()::text), 1, 9);
  log_ts := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  INSERT INTO log_entries (id, "timestamp", user_id, user_name, action, category, details)
  VALUES (log_id, log_ts, me.id, me.name, 'Prepared working solution ' || ws.name, 'reagent', details);

  RETURN jsonb_build_object(
    'stock', st_next,
    'working', ws_next,
    'log', jsonb_build_object(
      'id', log_id, 'timestamp', log_ts, 'userId', me.id, 'userName', me.name,
      'action', 'Prepared working solution ' || ws.name, 'category', 'reagent', 'details', details)
  );
END;
$$;

REVOKE ALL ON FUNCTION prepare_working_solution(text, numeric, text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION prepare_working_solution(text, numeric, text, numeric, text) TO authenticated;

-- ------------------------------------------------------------
-- 6. Check
-- ------------------------------------------------------------
-- Expected on the 27/09 import: working ≈ 69, stock ≈ 14–16, linked ≈ 14
SELECT kind, count(*) AS n,
       count(*) FILTER (WHERE derived_from_id IS NOT NULL) AS linked,
       count(*) FILTER (WHERE cardinality(responsible_user_ids) > 0) AS with_responsibles
FROM   reagents
GROUP  BY kind
ORDER  BY kind;

-- The pairs, for Stefania to confirm
SELECT s.name AS stock, s.location AS stock_location,
       w.name AS working_solution, w.location AS ws_location, w.catalog_number
FROM   reagents w JOIN reagents s ON s.id = w.derived_from_id
ORDER  BY s.name;

-- Working solutions still without a stock
SELECT name, catalog_number, location
FROM   reagents
WHERE  kind = 'working' AND derived_from_id IS NULL
ORDER  BY name;
