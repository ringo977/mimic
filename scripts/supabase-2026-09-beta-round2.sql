-- ============================================================
-- Beta round 2 — "missing functions" from the senior testers
--
--   1. Wishlist: the requester may delete own PENDING requests
--      (editing own items was already allowed by wishlist_items_update;
--      the status stays protected by protect_wishlist_status).
--   2. Reagents: anyone with add_reagents can now create reagents from the
--      Reagents page — make sure a non-manager cannot sneak in a
--      stock/working classification or responsibles on INSERT
--      (protect_reagent_fields covered UPDATE only).
--      Review 28/09: the edit form also let anyone with add_reagents write
--      current_stock directly (plain UPDATE → no can_access_stock, no
--      movement log). Quantities now move only through the two RPCs
--      (adjust_reagent_stock, prepare_working_solution); a direct change
--      of current_stock is refused for non-managers and, for managers,
--      recorded in log_entries as an inventory correction. The RPCs mark
--      the transaction with set_config('lab.stock_rpc') so the trigger
--      lets their internal UPDATEs through — including the derived_from_id
--      link that prepare_working_solution stores, which the trigger used to
--      refuse to non-managers (review finding #3).
--   3. Cell types → vial colours: starter list in app_settings ('cell_types'),
--      editable in Admin → Cryo. Inserted only if the key does not exist.
--
-- Run AFTER supabase-2026-09-booking-rules.sql (re-run that one first if it
-- predates 28/09: peak-capacity fix). Idempotent.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Wishlist delete
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "wishlist_items_delete" ON wishlist_items;
CREATE POLICY "wishlist_items_delete" ON wishlist_items
  FOR DELETE TO authenticated
  USING (
    is_lab_admin()
    OR (requested_by = current_lab_user_id() AND status = 'pending')
  );

-- ------------------------------------------------------------
-- 2. Reagent classification protected on INSERT too; current_stock
--    protected against direct edits (v3 of protect_reagent_fields)
-- ------------------------------------------------------------
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
      OR NEW.derived_from_id IS NOT NULL THEN
        RAISE EXCEPTION 'Only admins, the PI or a lab manager can classify a reagent as stock / working solution';
      END IF;
    ELSE
      IF NEW.kind                 IS DISTINCT FROM OLD.kind
      OR NEW.responsible_user_ids IS DISTINCT FROM OLD.responsible_user_ids
      OR NEW.derived_from_id      IS DISTINCT FROM OLD.derived_from_id THEN
        RAISE EXCEPTION 'Only admins, the PI or a lab manager can change the stock / working-solution classification of a reagent';
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

-- ------------------------------------------------------------
-- 2b. Stock RPCs mark their transaction so the trigger above lets their
--     internal UPDATEs through. Bodies identical to
--     supabase-2026-09-reagent-kind.sql (v4 / v1) plus the set_config line.
--     set_config(..., true) is transaction-local; clients cannot call it
--     through PostgREST (pg_catalog is not exposed).
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

  PERFORM set_config('lab.stock_rpc', '1', true);
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
-- 3. Starter cell types (edit freely in Admin → Cryo → Cell types)
--    Matching is whole-word (optional plural s), case-insensitive, longest alias wins.
-- ------------------------------------------------------------
INSERT INTO app_settings (key, value)
VALUES ('cell_types', '[
  {"id":"ct-chondro",  "name":"Chondrocytes",        "color":"#3b82f6", "aliases":["CH","chondro","chondrocyte"]},
  {"id":"ct-huvec",    "name":"HUVEC",               "color":"#ef4444", "aliases":["HUVECs","endothelial","EC","ECs"]},
  {"id":"ct-ipsc",     "name":"hiPSC",               "color":"#10b981", "aliases":["iPSC","iPSCs","hiPSCs","WTC-11","WTC11"]},
  {"id":"ct-ipsc-cm",  "name":"iPSC-CM",             "color":"#f97316", "aliases":["iPSC-CMs","CM","CMs","cardiomyocytes","cardiomyocyte","iCell"]},
  {"id":"ct-msc",      "name":"MSC",                 "color":"#06b6d4", "aliases":["hMSC","hMSCs","MSCs","BM-MSC","mesenchymal"]},
  {"id":"ct-fibro",    "name":"Fibroblasts",         "color":"#a855f7", "aliases":["fibroblast","fibro","HDF","NHDF","HFF","hCF","CF"]},
  {"id":"ct-syn",      "name":"Synoviocytes",        "color":"#ec4899", "aliases":["FLS","synovio","synoviocyte"]},
  {"id":"ct-myo",      "name":"Myoblasts",           "color":"#84cc16", "aliases":["myoblast","C2C12","myo"]},
  {"id":"ct-osteo",    "name":"Osteoblasts",         "color":"#f59e0b", "aliases":["osteoblast","osteo","MG-63","MG63"]},
  {"id":"ct-hek",      "name":"HEK293",              "color":"#6366f1", "aliases":["HEK","HEK-293","HEK293T","293T"]},
  {"id":"ct-mn",       "name":"Motor neurons",       "color":"#0ea5e9", "aliases":["MN","MNs","motoneurons","neurons"]},
  {"id":"ct-peri",     "name":"Pericytes",           "color":"#d946ef", "aliases":["pericyte","pericytes precursors"]}
]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 3b. Cell line names that still carry the vial count (bulk load kept
--     the first words of the note as the name). Marco, 28/09: "PEICYTES
--     PRECURSORS 700K" → Pericytes precursors, 700K is the count. Same
--     pattern on hCF and iCell rows. The original text stays in notes;
--     cells is filled only where the cryo-cells backfill left it NULL.
-- ------------------------------------------------------------
UPDATE cryo_vials SET cell_line = 'Pericytes precursors', cells = coalesce(cells, 700000)
 WHERE cell_line = 'PEICYTES PRECURSORS 700K';
UPDATE cryo_vials SET cell_line = 'hCF', cells = coalesce(cells, 400000) WHERE cell_line = 'hCF 0.4m';
UPDATE cryo_vials SET cell_line = 'hCF', cells = coalesce(cells, 450000) WHERE cell_line = 'hCF 0.45m';
UPDATE cryo_vials SET cell_line = 'hCF', cells = coalesce(cells, 518000) WHERE cell_line = 'hCF 0.518m';
UPDATE cryo_vials SET cell_line = 'iCell Cardiomyocytes2', cells = coalesce(cells, 5000000)
 WHERE cell_line = 'iCell Cardiomyocyte2, donor 1434, 5m, Lot 108657, R1017';
UPDATE cryo_vials SET cell_line = 'iCell Cardiomyocytes2', cells = coalesce(cells, 1250000)
 WHERE cell_line = 'iCell Cardiomyocyte2, donor 1434, 1.25m, Lot 108658, R1220';

-- ------------------------------------------------------------
-- 4. Checks
-- ------------------------------------------------------------
-- 4a. Policies on wishlist_items (expect delete = admin OR own pending)
SELECT policyname, cmd, qual
  FROM pg_policies
 WHERE tablename = 'wishlist_items'
 ORDER BY policyname;

-- 4b. Reagent trigger fires on INSERT and UPDATE (expect tgtype covering both)
SELECT tgname, tgenabled, pg_get_triggerdef(oid) AS definition
  FROM pg_trigger
 WHERE tgrelid = 'reagents'::regclass AND tgname = 'trg_protect_reagent_fields';

-- 4b2. Stock RPCs and trigger agree on the transaction flag (expect 3 rows, all true)
SELECT p.proname, p.prosrc LIKE '%lab.stock_rpc%' AS uses_flag, p.prosecdef AS security_definer
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('adjust_reagent_stock', 'prepare_working_solution', 'protect_reagent_fields')
 ORDER BY p.proname;

-- 4b3. Cell line names still carrying a count (expect no rows)
SELECT cell_line, count(*) FROM cryo_vials
 WHERE cell_line ~* '(^|[^a-z0-9])[0-9]+(\.[0-9]+)?\s?[km]($|[^a-z0-9])'
 GROUP BY cell_line;

-- 4c. Which stored cell line names get a colour with the starter list
--     (types with no match show as NULL → add aliases in Admin → Cryo)
WITH lines AS (
  SELECT cell_line, count(*) AS vials FROM cryo_vials GROUP BY cell_line
), types AS (
  SELECT t ->> 'name' AS type_name,
         array_append(ARRAY(SELECT jsonb_array_elements_text(t -> 'aliases')), t ->> 'name') AS keys
    FROM app_settings, jsonb_array_elements(value) t
   WHERE key = 'cell_types'
)
SELECT l.cell_line, l.vials,
       (SELECT ty.type_name FROM types ty, unnest(ty.keys) k
         WHERE lower(l.cell_line) ~ ('(^|[^a-z0-9])' || regexp_replace(lower(k), '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || 's?($|[^a-z0-9])')
         ORDER BY length(k) DESC LIMIT 1) AS matched_type
  FROM lines l
 ORDER BY matched_type NULLS FIRST, l.vials DESC;
