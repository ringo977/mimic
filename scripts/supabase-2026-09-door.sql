-- ============================================================
-- MiMic Lab Manager — door side for double-door units (September 2026)
-- Run once in Supabase → SQL Editor. Idempotent.
--
-- The Fridge +4 °C MiMic (−80 room) has two doors with separate shelves,
-- so "Shelf 1" alone is ambiguous there. Boxes and reagents get a
-- door side; a reagent inherits its box's side when its own is NULL.
-- Only meaningful where storage_units.num_doors > 1; the app hides the
-- field elsewhere.
-- ============================================================

ALTER TABLE storage_boxes ADD COLUMN IF NOT EXISTS door text;
ALTER TABLE reagents      ADD COLUMN IF NOT EXISTS door text;

DO $$
BEGIN
  ALTER TABLE storage_boxes ADD CONSTRAINT storage_boxes_door_check CHECK (door IN ('left', 'right'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE reagents ADD CONSTRAINT reagents_door_check CHECK (door IN ('left', 'right'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Verification: double-door units and how much of their content has a side
SELECT su.name, su.num_doors,
       count(r.id)                                   AS items,
       count(r.id) FILTER (WHERE r.door IS NOT NULL) AS with_door
  FROM storage_units su
  LEFT JOIN reagents r ON r.storage_unit_id = su.id
 WHERE su.num_doors > 1
 GROUP BY su.name, su.num_doors;
