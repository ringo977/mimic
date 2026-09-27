-- ============================================================
-- MiMic Lab Manager — extra fields (September 2026)
-- Run once in Supabase → SQL Editor. Idempotent.
--
--   locations.room_code          Polimi room code (e.g. MIA0306005025a)
--   instruments.responsible_user_id  who looks after the instrument
--   reagents.lot / owner / notes     unpacked from the old "location" text
--   lab_users.certified_at       { certificationId: 'YYYY-MM-DD' } training dates
--
-- The reagents columns are only created here; the per-item values are loaded
-- by assets-originals/import-2026-09/10-reagent-fields.sql (generated).
-- ============================================================

ALTER TABLE locations   ADD COLUMN IF NOT EXISTS room_code text;
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS responsible_user_id text;
ALTER TABLE reagents    ADD COLUMN IF NOT EXISTS lot   text;
ALTER TABLE reagents    ADD COLUMN IF NOT EXISTS owner text;
ALTER TABLE reagents    ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE lab_users   ADD COLUMN IF NOT EXISTS certified_at jsonb;

-- ------------------------------------------------------------
-- 1. Room codes: the Polimi code is already inside locations.notes
--    ("Room 025a — MIA0306005025a. Microfabrication: …")
-- ------------------------------------------------------------
UPDATE locations
   SET room_code = substring(notes from 'MIA[0-9]+[a-z]?')
 WHERE room_code IS NULL
   AND notes ~ 'MIA[0-9]+';

-- Drop the code from the notes now that it has its own column, keep the room number
-- ("Room 025a — MIA0306005025a. Microfabrication…" → "Room 025a. Microfabrication…")
UPDATE locations
   SET notes = regexp_replace(notes, '\s*—\s*MIA[0-9]+[a-z]?\.', '.')
 WHERE notes ~ '—\s*MIA[0-9]+';

-- ------------------------------------------------------------
-- 2. The PDMS hood is a single hood with four time slots, not four hoods
--    (see supabase-2026-09-booking-policy.sql). Fix the stale note.
-- ------------------------------------------------------------
UPDATE locations
   SET notes = replace(notes, 'PDMS hoods #1-4 (4 spots, max 2 people at a time)',
                              'PDMS hood (bookable in four 3 h slots)')
 WHERE notes LIKE '%PDMS hoods #1-4%';

-- ------------------------------------------------------------
-- 3. Instrument responsibles (so far kept as text in the description)
-- ------------------------------------------------------------
UPDATE instruments i
   SET responsible_user_id = u.id,
       description = NULLIF(btrim(regexp_replace(i.description, 'Responsabile:[^.]*\.?', '')), '')
  FROM (VALUES
    ('Confocal microscope', 'Mattia Ballerini'),
    ('CytoFLEX',            'Stefania Brambilla'),
    ('Digital PCR',         'Stefania Brambilla'),
    ('Real-time PCR',       'Stefania Brambilla'),
    ('TECAN Plate reader',  'Stefania Brambilla')
  ) AS w(instrument, person)
  JOIN lab_users u ON u.name = w.person
 WHERE i.name = w.instrument
   AND i.responsible_user_id IS NULL;

-- ------------------------------------------------------------
-- Verification
-- ------------------------------------------------------------
SELECT i.name, u.name AS responsible
  FROM instruments i JOIN lab_users u ON u.id = i.responsible_user_id
 ORDER BY i.name;

SELECT name, room_code, notes FROM locations ORDER BY name;

SELECT count(*) FILTER (WHERE room_code IS NOT NULL) AS with_room_code,
       count(*)                                      AS locations
  FROM locations;

SELECT count(*) FILTER (WHERE lot   IS NOT NULL) AS with_lot,
       count(*) FILTER (WHERE owner IS NOT NULL) AS with_owner,
       count(*) FILTER (WHERE notes IS NOT NULL) AS with_notes,
       count(*)                                  AS reagents
  FROM reagents;
