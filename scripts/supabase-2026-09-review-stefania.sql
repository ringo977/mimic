-- ============================================================
-- MiMic Lab Manager — Stefania's review, sheets 2·3·4·6 (28 Sep 2026)
-- ============================================================
-- Run in Supabase → SQL Editor. Idempotent: safe to re-run.
-- Source: SBR_REVIEW-Stefania.xlsx (assets-originals/import-2026-09/).
-- Sheets 1 (consumables) and 5 (−80 vials) are still pending: nothing
-- here touches them. Sheet 7 (instruments) came back with no corrections.
--
--   §1  31 reagent boxes → storage_boxes, reagents linked by box_id
--   §2  real shelf counts of the 12 fridges/freezers/cabinets
--   §3  8 nitrogen initials → full names (2 linked to real accounts)
--   §4  owner of the 187 vials that had no initials, one answer per box
-- ============================================================

-- ------------------------------------------------------------
-- §1 Reagent boxes (sheet 2). Stefania: 29 boxes are "sfuso" (loose,
--    no fixed positions) → plain 1×1 container boxes; Box 1 and Box 2 of
--    the +4 MiMic fridge are 9×9 racks — kept 1×1 too because reagents
--    are linked to the box, not to a cell (size noted in `notes`).
--    Shelf and door of each box are unknown until sheet 1 comes back.
-- ------------------------------------------------------------
WITH spec(unit_name, label, notes) AS (VALUES
  ('Freezer −20 °C MiMic', 'Gene BOX',             'sfuso (le posizioni A01… restano nel testo location dei singoli reagenti)'),
  ('Fridge +4 °C MiMic',   'Drugs Box',            'sfuso'),
  ('Freezer −20 °C MiMic', 'GF and Cytokines Box', 'sfuso'),
  ('Fridge +4 °C MiMic',   'Box 2',                'rack 9×9 (81 posizioni) — griglia non attivata, reagenti legati al box'),
  ('Freezer −20 °C MiMic', 'Supplements Box',      'sfuso'),
  ('Freezer −20 °C EvOoC', 'Drugs Box',            'sfuso'),
  ('Freezer −20 °C MiMic', 'PCR box',              'sfuso'),
  ('Fridge +4 °C MiMic',   'Fluorescence Box',     'sfuso'),
  ('Fridge +4 °C MiMic',   'Gels & Matrix Box',    'sfuso'),
  ('Freezer −20 °C EvOoC', 'Supplements 2.0 Box',  'sfuso'),
  ('Fridge +4 °C MiMic',   'Supp.+ Assays Box',    'sfuso'),
  ('Freezer −20 °C MiMic', 'Assays Box',           'sfuso'),
  ('Fridge +4 °C MiMic',   'Box 1',                'rack 9×9 (81 posizioni) — griglia non attivata, reagenti legati al box'),
  ('Freezer −20 °C EvOoC', 'Supplements Box',      'sfuso'),
  ('Fridge +4 °C MiMic',   'Assays Box',           'sfuso'),
  ('Freezer −20 °C MiMic', 'ELISA components Box', 'sfuso'),
  ('Freezer −20 °C MiMic', 'Gels Box',             'sfuso'),
  ('Fridge +4 °C EvOoC',   'FACS Sorter Box',      'sfuso'),
  ('Freezer −20 °C EvOoC', 'Factors 2.0 Box',      'sfuso'),
  ('Freezer −20 °C MiMic', 'Fluo (others) Box',    'sfuso'),
  ('Fridge +4 °C EvOoC',   'FACS box (Training)',  'sfuso'),
  ('Fridge +4 °C MiMic',   'Gene Expression Box',  'sfuso'),
  ('Freezer −20 °C EvOoC', 'Reagents 2.0 Box',     'sfuso'),
  ('Freezer −20 °C MiMic', 'GelMA Box',            'sfuso'),
  ('Fridge +4 °C EvOoC',   'BioLegend Box 2',      'sfuso'),
  ('Fridge +4 °C EvOoC',   'Supplements Box',      'sfuso'),
  ('Freezer −20 °C EvOoC', 'Interleukins 2.0 Box', 'sfuso'),
  ('Fridge +4 °C EvOoC',   'Assays Box',           'sfuso'),
  ('Fridge +4 °C EvOoC',   'BioLegend Box 1',      'sfuso'),
  ('Freezer −20 °C EvOoC', 'Media 2.0 Box',        'sfuso'),
  ('Fridge +4 °C EvOoC',   'FACS box',             'sfuso')
)
INSERT INTO storage_boxes (id, storage_unit_id, rack, shelf, number, label, grid_rows, grid_cols, notes)
SELECT 'sb-' || su.id || '-' || regexp_replace(lower(s.label), '[^a-z0-9]+', '-', 'g'),
       su.id, NULL, NULL,
       row_number() OVER (PARTITION BY su.id ORDER BY s.label),
       s.label, 1, 1, s.notes
FROM   spec s
JOIN   storage_units su ON su.name = s.unit_name
WHERE  NOT EXISTS (SELECT 1 FROM storage_boxes b
                   WHERE b.storage_unit_id = su.id AND lower(b.label) = lower(s.label));

-- Link the reagents: location text is "<unit> · <box label>" (Gene BOX rows
-- carry "Gene BOX pos. A01"). Only rows not yet in a box.
UPDATE reagents r
SET    box_id = b.id
FROM   storage_boxes b
WHERE  r.box_id IS NULL
  AND  r.storage_unit_id = b.storage_unit_id
  AND  b.grid_rows = 1 AND b.grid_cols = 1
  AND (btrim(split_part(r.location, ' · ', 2)) = b.label
       OR split_part(r.location, ' · ', 2) LIKE b.label || ' pos.%');

-- ------------------------------------------------------------
-- §2 Shelves (sheet 6, "Ripiani reali"). 1 = top, as in the app.
--    Dewar untouched: Stefania wrote "5 scatola x 4 dewar" but the
--    nitrogen file has 6 racks × 5 boxes → to clarify with her.
-- ------------------------------------------------------------
UPDATE storage_units su
SET    num_shelves = v.n
FROM  (VALUES
  ('Fridge +4 °C MiMic',                   4),
  ('Freezer −20 °C MiMic',                 4),
  ('Fridge +4 °C EvOoC',                   4),
  ('Freezer −20 °C EvOoC',                 4),
  ('Freezer −80 °C MiMic',                 4),
  ('Freezer −80 °C EvOoC',                 5),
  ('Fridge +4 °C EvOoC (under-bench)',     2),
  ('Freezer −20 °C EvOoC (under-bench)',   2),
  ('Fridge +4 °C Cell culture room',       2),
  ('Freezer −20 °C Cell culture room',     3),
  ('Yellow Cabinet',                       3),
  ('Microfab cabinet (Office M. Rasponi)', 3)
) AS v(name, n)
WHERE  su.name = v.name
  AND  su.num_shelves IS DISTINCT FROM v.n;

-- ------------------------------------------------------------
-- §3 Nitrogen initials (sheet 3). Vials were imported with user_name =
--    the initials and user_id = Marco (u1). Alumni get their full name
--    (still owned by u1); the two people still around are linked to
--    their accounts. CMS and LDO stay as they are (nobody knows them).
-- ------------------------------------------------------------
-- Alumni / external: name only
UPDATE cryo_vials v
SET    user_name = m.full_name
FROM  (VALUES
  ('AEB', 'Andrea Enrico Bortolotti (AEB)'),
  ('DSO', 'Daniel Sousa (DSO)'),
  ('RTG', 'Rodrigo Torres Garcia (RTG)'),
  ('AMN', 'Andrea Mainardi (AMN)')
) AS m(abbr, full_name)
WHERE  v.user_name = m.abbr;

-- CTP = Caterina Pernici (BiomimX, has an account)
UPDATE cryo_vials v
SET    user_id = u.id, user_name = u.name
FROM   lab_users u
WHERE  v.user_name = 'CTP'
  AND  lower(u.name) = 'caterina pernici';

-- CAM = Camille Sauter, still in the lab but not a member: Stefania wrote
-- "(EPE)", so the vials are put under Elia Pennati's account with her name.
UPDATE cryo_vials v
SET    user_id = u.id, user_name = 'Camille Sauter (CAM, via EPE)'
FROM   lab_users u
WHERE  v.user_name = 'CAM'
  AND  lower(u.name) = 'elia pennati';

-- ------------------------------------------------------------
-- §4 Vials without initials (sheet 4): one owner per box.
--    "Stock comune" → shared stock, owned by the lab manager (Stefania)
--    so she can manage them. Boxes shared by several people: user_name
--    lists everybody, user_id = the first named. Only vials still marked
--    "Unknown" are touched, so re-running or manual edits are safe.
-- ------------------------------------------------------------
WITH spec(rack, box, shown, owner) AS (VALUES
  -- Arpege 40 (rack, box)                       user_name                                          account (lab_users.name)
  (1, 1, 'Alberto Mantegazza / Alessandro Cacioppo',               'Alberto Mantegazza'),
  (1, 2, 'Elisa Monti / Sophie Materne',                           'Elisa Monti'),
  (1, 3, 'Stock comune',                                           'Stefania Brambilla'),
  (1, 4, 'Asia Muraca (da confermare)',                            'Asia Muraca'),
  (1, 5, 'Stock comune',                                           'Stefania Brambilla'),
  (2, 1, 'Caterina Pernici / Sonia Peddio / Asia Muraca',          'Caterina Pernici'),
  (2, 2, 'Cecilia Palma',                                          'Cecilia Palma'),
  (2, 4, 'Stock comune',                                           'Stefania Brambilla'),
  (3, 1, 'Stock comune / Caterina Pernici',                        'Stefania Brambilla'),
  (3, 2, 'Elisa Monti / Stock comune',                             'Elisa Monti'),
  (3, 3, 'Stock comune',                                           'Stefania Brambilla'),
  (3, 5, 'Stock comune',                                           'Stefania Brambilla'),
  (4, 1, 'Caterina Pernici',                                       'Caterina Pernici'),
  (4, 2, 'Asia Muraca / Stock comune',                             'Asia Muraca'),
  (4, 3, 'Marco Mondini',                                          'Marco Mondini'),
  (4, 5, 'Stock comune',                                           'Stefania Brambilla'),
  (5, 1, 'Elia Pennati',                                           'Elia Pennati'),
  (5, 3, 'Stock comune',                                           'Stefania Brambilla'),
  (5, 5, 'Stock comune',                                           'Stefania Brambilla'),
  (6, 1, 'Elisa Monti / Sophie Materne',                           'Elisa Monti'),
  (6, 2, 'Caterina Pernici',                                       'Caterina Pernici'),
  (6, 3, 'Stock comune',                                           'Stefania Brambilla')
)
UPDATE cryo_vials v
SET    user_id = u.id, user_name = s.shown
FROM   spec s
JOIN   storage_units su ON su.type = 'DEWAR'
JOIN   lab_users u ON lower(u.name) = lower(s.owner)
WHERE  v.user_name = 'Unknown'
  AND  v.storage_unit_id = su.id
  AND  v.rack = s.rack
  AND  v.box  = s.box;

-- −80 °C (5th floor), box 1: shared stock
UPDATE cryo_vials v
SET    user_id = u.id, user_name = 'Stock comune'
FROM   storage_units su, lab_users u
WHERE  v.user_name = 'Unknown'
  AND  su.name = 'Freezer −80 °C MiMic'
  AND  v.storage_unit_id = su.id
  AND  lower(u.name) = 'stefania brambilla';

-- ------------------------------------------------------------
-- Checks
-- ------------------------------------------------------------
-- §1: expect 31 boxes (1×1) in the four reagent fridges/freezers and
--     516 reagents linked (−20 MiMic 241, +4 MiMic 159, −20 EvOoC 77,
--     +4 EvOoC 39). Unlinked "·" rows left: only the 45 plasticware
--     items located "Middle-Earth / Cell culture room (MiMic) · …"
--     (that is a room split, not a box).
SELECT su.name AS unit, count(b.id) AS boxes,
       (SELECT count(*) FROM reagents r WHERE r.storage_unit_id = su.id AND r.box_id IS NOT NULL) AS reagents_in_boxes
FROM   storage_units su
JOIN   storage_boxes b ON b.storage_unit_id = su.id AND b.grid_rows = 1 AND b.grid_cols = 1
GROUP  BY su.name ORDER BY su.name;

SELECT location, count(*) AS unlinked
FROM   reagents
WHERE  box_id IS NULL AND location LIKE '% · %' AND location NOT LIKE '% · Shelf #%'
GROUP  BY location ORDER BY 2 DESC;

-- §2: items sitting on a shelf the unit no longer has (expected: 7 on
--     shelf 5 of the −20 EvOoC, which now has 4 shelves → ask Stefania)
SELECT su.name, r.shelf, count(*) AS reagents
FROM   reagents r JOIN storage_units su ON su.id = r.storage_unit_id
WHERE  r.shelf IS NOT NULL AND su.num_shelves IS NOT NULL AND r.shelf > su.num_shelves
GROUP  BY 1, 2 ORDER BY 1, 2;

-- §3 + §4: who owns the vials now (expect: no 'Unknown' left; CMS 3 and
--     LDO 1 still as initials)
SELECT user_name, count(*) AS vials
FROM   cryo_vials
GROUP  BY user_name ORDER BY 2 DESC, 1;
