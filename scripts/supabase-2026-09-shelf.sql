-- ============================================================
-- MiMic Lab Manager — reagents.shelf (September 2026)
-- Run once in Supabase → SQL Editor. Idempotent.
--
-- Shelf a reagent sits on inside its fridge/freezer/cabinet.
-- Convention: 1 = top shelf (as in Stefania's stock workbook).
-- A reagent inside a box inherits the box's shelf (storage_boxes.shelf)
-- when its own value is NULL; the app resolves that at read time.
-- ============================================================

ALTER TABLE reagents ADD COLUMN IF NOT EXISTS shelf integer;

-- 1. Backfill from the free-text sub-location left by the bulk load
--    ("Fridge +4 °C MiMic · Shelf #1", "Freezer −20 °C MiMic · Shelf #4 · …")
UPDATE reagents
   SET shelf = (regexp_match(location, 'shelf\s*#?\s*(\d+)', 'i'))[1]::integer
 WHERE shelf IS NULL
   AND storage_unit_id IS NOT NULL
   AND location ~* 'shelf\s*#?\s*\d+';

-- 2. Reagents already linked to a box that has a shelf
UPDATE reagents r
   SET shelf = b.shelf
  FROM storage_boxes b
 WHERE r.box_id = b.id
   AND r.shelf IS NULL
   AND b.shelf IS NOT NULL;

-- ------------------------------------------------------------
-- Verification
-- ------------------------------------------------------------
SELECT su.name AS storage_unit, r.shelf, count(*) AS items
  FROM reagents r JOIN storage_units su ON su.id = r.storage_unit_id
 WHERE r.shelf IS NOT NULL
 GROUP BY su.name, r.shelf
 ORDER BY su.name, r.shelf;

-- Shelf numbers larger than the unit's declared shelf count → fix num_shelves
SELECT su.name, su.num_shelves, max(r.shelf) AS max_shelf_used
  FROM reagents r JOIN storage_units su ON su.id = r.storage_unit_id
 WHERE r.shelf IS NOT NULL
 GROUP BY su.name, su.num_shelves
HAVING max(r.shelf) > coalesce(su.num_shelves, 0);
