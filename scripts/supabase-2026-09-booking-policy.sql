-- ============================================================
-- MiMic Lab Manager — per-instrument booking rules (Sep 2026)
-- Run in Supabase → SQL Editor. Idempotent: safe to re-run.
--
-- NOTE (28 Sep 2026): enforce_booking_policy() is redefined by
-- supabase-2026-09-fix-assessment.sql (certification check, quota lock,
-- is_booking_manager()). Run that script after this one.
--
-- Two things happen here.
--
-- 1. The PDMS hood was imported from Elemental as four instruments
--    ("PDMS Hood #1…#4"), but there is only ONE hood: those four were its four
--    3-hour time slots. They are merged back into a single "PDMS Hood".
--
-- 2. instruments.booking_policy (jsonb) carries rules the lab-wide timeline
--    cannot express: fixed slots, a weekly quota per person, and how far ahead
--    a booking may be made. Shape (every field optional):
--
--      { "slots": [{"start": 8, "end": 11}, …],   -- decimal hours
--        "maxSlotsPerWeek": 6,                    -- per person, Mon–Sun
--        "maxAdvanceDays": 14,
--        "note": "text shown in the booking form" }
--
-- The app checks these rules before saving; the trigger at the bottom enforces
-- them in the database too, so a hand-crafted request cannot get around them.
-- ============================================================

ALTER TABLE instruments ADD COLUMN IF NOT EXISTS booking_policy jsonb;

-- ------------------------------------------------------------
-- 1. Merge PDMS Hood #1…#4 into one instrument
-- ------------------------------------------------------------
DO $$
DECLARE keep text;
BEGIN
  SELECT id INTO keep FROM instruments
   WHERE name IN ('PDMS Hood #1', 'PDMS Hood') ORDER BY name LIMIT 1;

  IF keep IS NULL THEN
    RAISE NOTICE 'No PDMS hood found — nothing to merge.';
    RETURN;
  END IF;

  -- Anything already attached to #2…#4 follows the surviving row
  UPDATE bookings        SET instrument_id = keep WHERE instrument_id IN
    (SELECT id FROM instruments WHERE name IN ('PDMS Hood #2', 'PDMS Hood #3', 'PDMS Hood #4'));
  UPDATE maintenance_logs SET instrument_id = keep WHERE instrument_id IN
    (SELECT id FROM instruments WHERE name IN ('PDMS Hood #2', 'PDMS Hood #3', 'PDMS Hood #4'));
  UPDATE certifications  SET instrument_id = keep WHERE instrument_id IN
    (SELECT id FROM instruments WHERE name IN ('PDMS Hood #2', 'PDMS Hood #3', 'PDMS Hood #4'));

  DELETE FROM instruments WHERE name IN ('PDMS Hood #2', 'PDMS Hood #3', 'PDMS Hood #4');

  UPDATE instruments
     SET name = 'PDMS Hood',
         icon = '💨',
         booking_policy = jsonb_build_object(
           'slots', jsonb_build_array(
             jsonb_build_object('start', 8,  'end', 11),
             jsonb_build_object('start', 11, 'end', 14),
             jsonb_build_object('start', 14, 'end', 17),
             jsonb_build_object('start', 17, 'end', 20)),
           'maxSlotsPerWeek', 6,
           'maxAdvanceDays', 14,
           'note', 'One hood, four 3-hour slots. Up to 6 slots per person per week.')
   WHERE id = keep;
END $$;

-- ------------------------------------------------------------
-- 2. Enforce the policy server-side
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_booking_policy() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  p        jsonb;
  ok       boolean;
  used     integer;
  wk_start date;
  quota    integer;
  advance  integer;
BEGIN
  SELECT booking_policy INTO p FROM instruments WHERE id = NEW.instrument_id;
  IF p IS NULL THEN
    RETURN NEW;
  END IF;

  -- Whoever can manage everybody's bookings may override the rules. The set is
  -- spelled out here (not is_lab_admin(), which is admin/pi + MFA only) so that
  -- it matches canManageAllBookings in the app: no rule that blocks in the DB
  -- while the UI says it is fine.
  IF EXISTS (
    SELECT 1 FROM lab_users
     WHERE id = current_lab_user_id()
       AND (is_admin = true OR role IN ('admin', 'pi', 'lab_manager'))
  ) THEN
    RETURN NEW;
  END IF;

  -- Fixed slots: start/end must match one of them exactly
  IF jsonb_array_length(coalesce(p -> 'slots', '[]'::jsonb)) > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p -> 'slots') s
       WHERE (s ->> 'start')::numeric = NEW.start_hour
         AND (s ->> 'end')::numeric   = NEW.end_hour
    ) INTO ok;
    IF NOT ok THEN
      RAISE EXCEPTION 'This instrument can only be booked in its fixed slots';
    END IF;
  END IF;

  -- How far ahead a booking may start
  IF p ? 'maxAdvanceDays' THEN
    advance := (p ->> 'maxAdvanceDays')::integer;
    IF NEW.date::date > current_date + advance THEN
      RAISE EXCEPTION 'This instrument can be booked at most % days ahead', advance;
    END IF;
  END IF;

  -- Weekly quota per person (weeks run Monday–Sunday, like date_trunc)
  IF p ? 'maxSlotsPerWeek' THEN
    quota := (p ->> 'maxSlotsPerWeek')::integer;
    wk_start := date_trunc('week', NEW.date::date)::date;
    SELECT count(*) INTO used FROM bookings b
     WHERE b.instrument_id = NEW.instrument_id
       AND b.user_id = NEW.user_id
       AND b.id <> NEW.id
       AND b.date::date >= wk_start
       AND b.date::date <  wk_start + 7;
    IF used >= quota THEN
      RAISE EXCEPTION 'Weekly limit reached for this instrument (% slots per week)', quota;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bookings_enforce_policy ON bookings;
CREATE TRIGGER bookings_enforce_policy
  BEFORE INSERT OR UPDATE OF instrument_id, user_id, date, start_hour, end_hour ON bookings
  FOR EACH ROW EXECUTE FUNCTION enforce_booking_policy();

-- ------------------------------------------------------------
-- 3. Check
-- ------------------------------------------------------------
SELECT name, icon, category, jsonb_pretty(booking_policy) AS policy
FROM   instruments
WHERE  booking_policy IS NOT NULL
ORDER  BY name;

-- Should return one row, "PDMS Hood":
SELECT count(*) AS pdms_rows FROM instruments WHERE name ILIKE 'PDMS Hood%';
