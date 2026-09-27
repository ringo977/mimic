-- ============================================================
-- MiMic Lab Manager — cryo storage improvements (Sep 2026)
-- Run in Supabase → SQL Editor. Idempotent: safe to re-run.
--
--   1. storage_units.rack_labels: racks are identified by colour on the real
--      unit (Arpege 40: blue, green, red, black, yellow, white), not only by
--      number. JSONB array, index 0 = rack 1, e.g.
--        [{"label":"Blue","color":"#2563EB"}, {"label":"Green","color":"#16A34A"}]
-- ============================================================

ALTER TABLE storage_units ADD COLUMN IF NOT EXISTS rack_labels jsonb;

-- Arpege 40: colours as written on the racks (from the nitrogen workbook)
UPDATE storage_units
SET    rack_labels = '[{"label":"Blue","color":"#2563EB"},
                       {"label":"Green","color":"#16A34A"},
                       {"label":"Red","color":"#DC2626"},
                       {"label":"Black","color":"#111827"},
                       {"label":"Yellow","color":"#EAB308"},
                       {"label":"White","color":"#D1D5DB"}]'::jsonb
WHERE  type = 'DEWAR' AND num_racks = 6 AND rack_labels IS NULL;

SELECT name, num_racks, rack_labels FROM storage_units WHERE rack_labels IS NOT NULL;
