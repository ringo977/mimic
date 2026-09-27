-- ============================================================
-- MiMic Lab Manager — storage boxes (Sep 2026)
-- Run in Supabase → SQL Editor, AFTER supabase-2026-09-cryo-storage.sql.
-- Idempotent: safe to re-run.
--
-- Why: until now a box existed only implicitly, as a number inside a rack, and
-- the whole unit shared one grid size (storage_units.grid_rows/grid_cols). That
-- cannot describe the real lab: the −80 °C freezer holds loose 9×9 boxes on
-- shelves (no racks), and reagent fridges hold named boxes ("Supplements Box",
-- "Gene BOX" 8×12) of different sizes.
--
-- Model: storage_boxes is the definition of a box (where it sits, how big it
-- is); cryo_vials keeps its physical coordinates and gains box_id. rack/box stay
-- in place as the legacy coordinates, kept in sync by the app, so nothing breaks
-- if this migration is rolled back.
-- ============================================================

CREATE TABLE IF NOT EXISTS storage_boxes (
  id              text PRIMARY KEY,
  storage_unit_id text NOT NULL,
  rack            integer,                     -- NULL: unit has no racks (shelves)
  shelf           integer,                     -- NULL: unknown / not relevant
  number          integer NOT NULL DEFAULT 1,  -- position within the rack/shelf
  label           text NOT NULL,               -- "Box 1", "Supplements Box", "Gene BOX"
  grid_rows       integer NOT NULL DEFAULT 1,
  grid_cols       integer NOT NULL DEFAULT 1,
  notes           text
);

CREATE INDEX IF NOT EXISTS storage_boxes_unit_idx ON storage_boxes (storage_unit_id);

ALTER TABLE cryo_vials ADD COLUMN IF NOT EXISTS box_id text;
ALTER TABLE reagents   ADD COLUMN IF NOT EXISTS box_id text;

CREATE INDEX IF NOT EXISTS cryo_vials_box_idx ON cryo_vials (box_id);

-- ------------------------------------------------------------
-- 1. Backfill boxes for units that already had a rack/box grid
--    (deterministic ids so re-running does not duplicate them)
-- ------------------------------------------------------------
INSERT INTO storage_boxes (id, storage_unit_id, rack, number, label, grid_rows, grid_cols)
SELECT format('sb-%s-r%s-b%s', su.id, r.rack, b.box),
       su.id, r.rack, b.box, format('Box %s', b.box),
       coalesce(su.grid_rows, 5), coalesce(su.grid_cols, 5)
FROM   storage_units su
CROSS  JOIN LATERAL generate_series(1, su.num_racks)      AS r(rack)
CROSS  JOIN LATERAL generate_series(1, su.boxes_per_rack) AS b(box)
WHERE  su.num_racks IS NOT NULL AND su.boxes_per_rack IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Point existing vials at their box
UPDATE cryo_vials v
SET    box_id = b.id
FROM   storage_boxes b
WHERE  v.box_id IS NULL
  AND  b.storage_unit_id = v.storage_unit_id
  AND  b.rack = v.rack
  AND  b.number = v.box;

-- ------------------------------------------------------------
-- 3. RLS: same rules as storage_units (everyone reads, admins write)
-- ------------------------------------------------------------
ALTER TABLE storage_boxes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storage_boxes_select" ON storage_boxes;
CREATE POLICY "storage_boxes_select" ON storage_boxes
  FOR SELECT TO authenticated USING (is_lab_member());

DROP POLICY IF EXISTS "storage_boxes_insert" ON storage_boxes;
CREATE POLICY "storage_boxes_insert" ON storage_boxes
  FOR INSERT TO authenticated WITH CHECK (is_lab_admin());

DROP POLICY IF EXISTS "storage_boxes_update" ON storage_boxes;
CREATE POLICY "storage_boxes_update" ON storage_boxes
  FOR UPDATE TO authenticated USING (is_lab_admin()) WITH CHECK (is_lab_admin());

DROP POLICY IF EXISTS "storage_boxes_delete" ON storage_boxes;
CREATE POLICY "storage_boxes_delete" ON storage_boxes
  FOR DELETE TO authenticated USING (is_lab_admin());

-- ------------------------------------------------------------
-- 4. Check
-- ------------------------------------------------------------
SELECT su.name AS unit, count(b.id) AS boxes, count(v.id) AS vials_linked
FROM   storage_units su
LEFT   JOIN storage_boxes b ON b.storage_unit_id = su.id
LEFT   JOIN cryo_vials   v ON v.box_id = b.id
GROUP  BY su.name
ORDER  BY boxes DESC;

-- Vials still without a box (should be 0 after the backfill):
SELECT count(*) AS vials_without_box FROM cryo_vials WHERE box_id IS NULL;
