-- ============================================================
-- MiMic Lab Manager — instrument types & icons (Sep 2026)
-- Run in Supabase → SQL Editor. Idempotent: safe to re-run.
--
-- Why: the CSV import wrote icon = '🔬' for every row, so all 54 instruments
-- looked like microscopes, and two families had no home of their own:
--   * Computers   — the MiMic laptop was filed under Microscopy
--   * Stimulators — every Mech unit and every Mamba was filed under Microfluidics
-- Matching is by name, exactly as loaded from 02-instruments.csv.
-- ============================================================

WITH wanted(name, category, icon) AS (VALUES
  ('PDMS Hood #1', 'Microfabrication', '💨'),
  ('PDMS Hood #2', 'Microfabrication', '💨'),
  ('PDMS Hood #3', 'Microfabrication', '💨'),
  ('PDMS Hood #4', 'Microfabrication', '💨'),
  ('Hot Plate', 'Microfabrication', '🔥'),
  ('Microscope (PDMS Lab)', 'Microscopy', '🔍'),
  ('Syringe pump M1', 'Microfluidics', '💉'),
  ('Syringe pump M2', 'Microfluidics', '💉'),
  ('Syringe pump S1', 'Microfluidics', '💉'),
  ('Syringe pump S2', 'Microfluidics', '💉'),
  ('Safety cabinet #1', 'Cell Culture', '🧫'),
  ('Safety cabinet #2', 'Cell Culture', '🧫'),
  ('Mech 01 (2-channels) - Channel #1', 'Stimulators', '🌊'),
  ('Mech 01 (2-channels) - Channel #2', 'Stimulators', '🌊'),
  ('Mech 02 (Sinusoid ACG)', 'Stimulators', '🌊'),
  ('Mech 05 (Mamba 1-channel)', 'Stimulators', '🐍'),
  ('Mech 06 (Mamba) - Channel #1', 'Stimulators', '🐍'),
  ('Mech 06 (Mamba) - Channel #2', 'Stimulators', '🐍'),
  ('Mech 06 (Mamba) - Channel #3', 'Stimulators', '🐍'),
  ('Mech 06 (Mamba) - Channel #4', 'Stimulators', '🐍'),
  ('Mech 08 (Mamba) - Channel #1', 'Stimulators', '🐍'),
  ('Mech 08 (Mamba) - Channel #2', 'Stimulators', '🐍'),
  ('Mech 08 (Mamba) - Channel #3', 'Stimulators', '🐍'),
  ('Mech 08 (Mamba) - Channel #4', 'Stimulators', '🐍'),
  ('Confocal microscope', 'Microscopy', '🔬'),
  ('CytoFLEX', 'Analysis', '📊'),
  ('Safety cabinet EvOoC #1', 'Cell Culture', '🧫'),
  ('Safety cabinet EvOoC #2', 'Cell Culture', '🧫'),
  ('Safety cabinet EvOoC #3', 'Cell Culture', '🧫'),
  ('Mech 03 (Cubic)', 'Stimulators', '⚙️'),
  ('Mech 04 (Mamba) - Channel #1', 'Stimulators', '🐍'),
  ('Mech 04 (Mamba) - Channel #2', 'Stimulators', '🐍'),
  ('Mech 04 (Mamba) - Channel #3', 'Stimulators', '🐍'),
  ('Mech 04 (Mamba) - Channel #4', 'Stimulators', '🐍'),
  ('Mech 07 (Diamond)', 'Stimulators', '💎'),
  ('Chemical fume hood', 'Cell Culture', '⚗️'),
  ('Horizontal laminar flow hood #1', 'Cell Culture', '🌀'),
  ('Horizontal laminar flow hood #2', 'Cell Culture', '🌀'),
  ('TECAN Plate reader', 'Analysis', '📋'),
  ('Analog Discovery #1', 'Analysis', '📈'),
  ('Analog Discovery #2', 'Analysis', '📈'),
  ('Bioamplifier #1', 'Analysis', '⚡'),
  ('Bioamplifier #2', 'Analysis', '⚡'),
  ('Compressed air tank', 'Microfluidics', '🧯'),
  ('uBS microscope', 'Microscopy', '🔍'),
  ('MiMic laptop', 'Computers', '💻'),
  ('Resin pot', 'Microfabrication', '⚗️'),
  ('Pressure regulator', 'Microfluidics', '🎛️'),
  ('Th Hood', 'Cell Culture', '🧫'),
  ('Th Microscope', 'Microscopy', '🔍'),
  ('Autoclave', 'Cell Culture', '♨️'),
  ('Digital PCR', 'Analysis', '🧬'),
  ('Real-time PCR', 'Analysis', '🧬'),
  ('Fluorescence microscope', 'Microscopy', '💡')
)
UPDATE instruments i
SET    category = w.category,
       icon     = w.icon
FROM   wanted w
WHERE  i.name = w.name
  AND  (i.category IS DISTINCT FROM w.category OR i.icon IS DISTINCT FROM w.icon);

-- Check: how the instruments are grouped now
SELECT category, count(*) AS n, string_agg(DISTINCT icon, ' ') AS icons
FROM   instruments GROUP BY category ORDER BY n DESC;

-- Check: full list, to spot any instrument the mapping did not cover
-- (renamed or added after 02-instruments.csv was produced)
SELECT category, icon, name FROM instruments ORDER BY category, name;
