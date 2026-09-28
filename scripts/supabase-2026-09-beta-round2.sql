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
--   3. Cell types → vial colours: starter list in app_settings ('cell_types'),
--      editable in Admin → Cryo. Inserted only if the key does not exist.
--
-- Run AFTER supabase-2026-09-booking-rules.sql. Idempotent.
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
-- 2. Reagent classification protected on INSERT too
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_reagent_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_booking_manager() THEN
    IF TG_OP = 'INSERT' THEN
      IF coalesce(NEW.kind, 'item') <> 'item'
      OR coalesce(array_length(NEW.responsible_user_ids, 1), 0) > 0
      OR NEW.derived_from_id IS NOT NULL THEN
        RAISE EXCEPTION 'Only admins, the PI or a lab manager can classify a reagent as stock / working solution';
      END IF;
    ELSIF NEW.kind                 IS DISTINCT FROM OLD.kind
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
  BEFORE INSERT OR UPDATE ON reagents
  FOR EACH ROW EXECUTE FUNCTION protect_reagent_fields();

-- ------------------------------------------------------------
-- 3. Starter cell types (edit freely in Admin → Cryo → Cell types)
--    Matching is whole-word (optional plural s), case-insensitive, longest alias wins.
-- ------------------------------------------------------------
INSERT INTO app_settings (key, value)
VALUES ('cell_types', '[
  {"id":"ct-chondro",  "name":"Chondrocytes",        "color":"#3b82f6", "aliases":["CH","chondro","chondrocyte"]},
  {"id":"ct-huvec",    "name":"HUVEC",               "color":"#ef4444", "aliases":["HUVECs","endothelial","EC","ECs"]},
  {"id":"ct-ipsc",     "name":"hiPSC",               "color":"#10b981", "aliases":["iPSC","iPSCs","hiPSCs","WTC-11","WTC11"]},
  {"id":"ct-ipsc-cm",  "name":"iPSC-CM",             "color":"#f97316", "aliases":["iPSC-CMs","CM","CMs","cardiomyocytes","cardiomyocyte"]},
  {"id":"ct-msc",      "name":"MSC",                 "color":"#06b6d4", "aliases":["hMSC","hMSCs","MSCs","BM-MSC","mesenchymal"]},
  {"id":"ct-fibro",    "name":"Fibroblasts",         "color":"#a855f7", "aliases":["fibroblast","fibro","HDF","NHDF","HFF"]},
  {"id":"ct-syn",      "name":"Synoviocytes",        "color":"#ec4899", "aliases":["FLS","synovio","synoviocyte"]},
  {"id":"ct-myo",      "name":"Myoblasts",           "color":"#84cc16", "aliases":["myoblast","C2C12","myo"]},
  {"id":"ct-osteo",    "name":"Osteoblasts",         "color":"#f59e0b", "aliases":["osteoblast","osteo","MG-63","MG63"]},
  {"id":"ct-hek",      "name":"HEK293",              "color":"#6366f1", "aliases":["HEK","HEK-293","HEK293T","293T"]},
  {"id":"ct-mn",       "name":"Motor neurons",       "color":"#0ea5e9", "aliases":["MN","MNs","motoneurons","neurons"]}
]'::jsonb)
ON CONFLICT (key) DO NOTHING;

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
