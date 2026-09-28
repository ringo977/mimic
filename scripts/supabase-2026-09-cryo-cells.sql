-- ============================================================
-- MiMic Lab Manager — cells per vial (Sep 2026)
-- ============================================================
-- Run in Supabase → SQL Editor. Idempotent: safe to re-run.
--
-- The nitrogen file records the cell count inside the free text of each
-- vial ("HUVECs C2519A P6 0.48 M 27/04/26 SBR", "MSOD P20 3M …",
-- "3T3 P16 950K …"). That text was imported into cryo_vials.notes. Here it
-- becomes a real column so the app can show it, search it and sort by it.
--
--   cells  numeric   absolute number of cells per vial (1.25M → 1250000)
--
-- Backfill rule: the FIRST "<number> M" or "<number> K" token in the notes
-- (comma or dot decimals, optional space before the unit, unit must end
-- the word so "P5 MPA" or "1 MBA" are not read as counts). Bare numbers
-- without a unit ("hCF AXOL d5 0.647") and flask fractions ("1/2 T75")
-- are left alone — Stefania can fill them from the app.
-- ============================================================

ALTER TABLE cryo_vials ADD COLUMN IF NOT EXISTS cells numeric;

UPDATE cryo_vials v
SET    cells = round(
         replace(m[1], ',', '.')::numeric
         * CASE WHEN upper(m[2]) = 'M' THEN 1000000 ELSE 1000 END)
FROM  (SELECT id, regexp_match(notes, '(\d+(?:[.,]\d+)?)\s*([MmKk])\y') AS m
       FROM   cryo_vials
       WHERE  cells IS NULL) x
WHERE  v.id = x.id
  AND  x.m IS NOT NULL;

-- ------------------------------------------------------------
-- Check
-- ------------------------------------------------------------
-- Expected on the 27/09 import: total 698, with_cells 577, range 0.1M – 25M
SELECT count(*)                          AS total,
       count(*) FILTER (WHERE cells IS NOT NULL) AS with_cells,
       min(cells) AS min_cells, max(cells) AS max_cells
FROM   cryo_vials;

-- Sanity: anything above 50 million or below 10 000 deserves a look
SELECT id, cell_line, cells, left(notes, 80) AS notes
FROM   cryo_vials
WHERE  cells IS NOT NULL AND (cells > 50000000 OR cells < 10000)
ORDER  BY cells;

-- Still without a count, most frequent texts (for Stefania)
SELECT split_part(notes, ' | ', 1) AS original, count(*)
FROM   cryo_vials
WHERE  cells IS NULL
GROUP  BY 1
ORDER  BY 2 DESC, 1
LIMIT  40;
