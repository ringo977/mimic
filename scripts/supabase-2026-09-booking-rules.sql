-- ============================================================
-- Booking rules engine — per instrument, per user group
-- (Beta round 1, senior testers' feedback)
--
--   • capacity: N seats bookable at the same time (PDMS hood = 4).
--     Replaces the bookings_no_overlap EXCLUDE constraint (1 seat only)
--     with a trigger check under an advisory lock.
--   • horizon per user group: advanceDaysByGroup {student, researcher, staff}
--     with maxAdvanceDays as the default for groups left blank.
--   • maxHoursPerDay per person per instrument (confocal = 5 h).
--   • allowInProgress: a slot already started can still be booked (app-side).
--   • extraHoursNeedApproval: bookings outside working hours are saved with
--     status = 'pending' and must be authorized by the instrument responsible
--     or a booking manager. bookings.status is new ('confirmed' | 'pending').
--
-- Run AFTER supabase-2026-09-beta-round1.sql. Idempotent.
-- The Supabase SQL editor runs the whole file in one transaction.
-- ============================================================

-- ------------------------------------------------------------
-- 1. bookings.status
-- ------------------------------------------------------------
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_status_check') THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('confirmed', 'pending'));
  END IF;
END $$;

-- ------------------------------------------------------------
-- 2. Capacity replaces the 1-seat EXCLUDE constraint
-- ------------------------------------------------------------
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_no_overlap;

-- ------------------------------------------------------------
-- 3. Helpers
-- ------------------------------------------------------------
-- Role → booking group (mirrors userGroupOf in data/lab-data.ts)
CREATE OR REPLACE FUNCTION booking_user_group(p_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_role IN ('msc', 'guest') THEN 'student'
    WHEN p_role IN ('phd', 'postdoc', 'researcher') THEN 'researcher'
    ELSE 'staff'
  END
$$;

-- Is the current user the responsible of this instrument?
CREATE OR REPLACE FUNCTION is_instrument_responsible(p_instrument_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM instruments i
     WHERE i.id = p_instrument_id
       AND i.responsible_user_id IS NOT NULL
       AND i.responsible_user_id = current_lab_user_id()
  )
$$;

-- Who may authorize (or refuse) a pending booking on this instrument
CREATE OR REPLACE FUNCTION can_approve_booking(p_instrument_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_booking_manager() OR is_instrument_responsible(p_instrument_id)
$$;

-- ------------------------------------------------------------
-- 4. Rules trigger, v3
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_booking_policy() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inst         instruments%ROWTYPE;
  p            jsonb;
  ok           boolean;
  manager      boolean;
  time_changed boolean;
  used         integer;
  cap          integer;
  wk_start     date;
  quota        integer;
  advance      integer;
  grp          text;
  u_role       text;
  max_hours    numeric;
  hours        numeric;
  bs           jsonb;
  work_start   numeric;
  work_end     numeric;
BEGIN
  SELECT * INTO inst FROM instruments WHERE id = NEW.instrument_id;
  IF NOT FOUND THEN
    RETURN NEW;   -- FK / app decide what to do with unknown instruments
  END IF;

  p       := coalesce(inst.booking_policy, '{}'::jsonb);
  manager := is_booking_manager();
  time_changed := TG_OP = 'INSERT'
    OR NEW.instrument_id <> OLD.instrument_id
    OR NEW.user_id       <> OLD.user_id
    OR NEW.date          <> OLD.date
    OR NEW.start_hour    <> OLD.start_hour
    OR NEW.end_hour      <> OLD.end_hour;

  -- Status can only be changed by an approver (instrument responsible or
  -- booking manager). Owners never send it: the server decides it below.
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
     AND NOT (manager OR is_instrument_responsible(NEW.instrument_id)) THEN
    RAISE EXCEPTION 'Only the instrument responsible or a lab manager can authorize a booking';
  END IF;

  IF NOT time_changed THEN
    RETURN NEW;   -- notes / status-only update: nothing else to check
  END IF;

  -- Capacity: applies to everybody, managers included. The advisory lock
  -- serialises bookings of the same instrument on the same day so two
  -- requests cannot both see "3 of 4 taken" and both pass.
  cap := greatest(coalesce((p ->> 'capacity')::integer, 1), 1);
  PERFORM pg_advisory_xact_lock(hashtext(NEW.instrument_id || '|' || NEW.date));
  SELECT count(*) INTO used FROM bookings b
   WHERE b.instrument_id = NEW.instrument_id
     AND b.date = NEW.date
     AND b.id <> NEW.id
     AND b.start_hour < NEW.end_hour
     AND b.end_hour   > NEW.start_hour;
  IF used >= cap THEN
    IF cap > 1 THEN
      RAISE EXCEPTION 'No seat left: all % seats are taken in that time range', cap;
    ELSE
      RAISE EXCEPTION 'Time conflict with an existing booking';
    END IF;
  END IF;

  -- Whoever can manage everybody's bookings may override the other rules
  -- (same set as canManageAllBookings in the app). Their status stays as sent.
  IF manager THEN
    RETURN NEW;
  END IF;

  -- Certification: the booked person must hold it for this instrument
  IF inst.requires_certification THEN
    SELECT NEW.instrument_id = ANY (coalesce(u.certifications, '{}'::text[]))
      INTO ok
      FROM lab_users u WHERE u.id = NEW.user_id;
    IF NOT coalesce(ok, false) THEN
      RAISE EXCEPTION 'This instrument requires a certification you do not hold';
    END IF;
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

  -- Booking horizon, per user group (falls back to maxAdvanceDays)
  SELECT u.role INTO u_role FROM lab_users u WHERE u.id = NEW.user_id;
  grp     := booking_user_group(coalesce(u_role, 'guest'));
  advance := coalesce((p -> 'advanceDaysByGroup' ->> grp)::integer, (p ->> 'maxAdvanceDays')::integer);
  IF advance IS NOT NULL AND advance >= 0 AND NEW.date::date > current_date + advance THEN
    RAISE EXCEPTION 'This instrument can be booked at most % days ahead for your role (until %)', advance, current_date + advance;
  END IF;

  -- Weekly quota per person (weeks run Monday–Sunday, like date_trunc)
  IF p ? 'maxSlotsPerWeek' AND (p ->> 'maxSlotsPerWeek')::integer > 0 THEN
    quota := (p ->> 'maxSlotsPerWeek')::integer;
    wk_start := date_trunc('week', NEW.date::date)::date;
    PERFORM pg_advisory_xact_lock(hashtext(NEW.instrument_id || '|' || NEW.user_id || '|' || wk_start::text));
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

  -- Hours per person per day
  max_hours := (p ->> 'maxHoursPerDay')::numeric;
  IF max_hours IS NOT NULL AND max_hours > 0 THEN
    SELECT coalesce(sum(b.end_hour - b.start_hour), 0) INTO hours FROM bookings b
     WHERE b.instrument_id = NEW.instrument_id
       AND b.user_id = NEW.user_id
       AND b.id <> NEW.id
       AND b.date = NEW.date;
    IF hours + (NEW.end_hour - NEW.start_hour) > max_hours THEN
      RAISE EXCEPTION 'Daily limit exceeded: max % hours per day on this instrument (% already booked)', max_hours, hours;
    END IF;
  END IF;

  -- Status: extra hours on instruments that require it start as "pending"
  IF coalesce((p ->> 'extraHoursNeedApproval')::boolean, false) THEN
    SELECT value INTO bs FROM app_settings WHERE key = 'booking_settings';
    work_start := coalesce((bs ->> 'workStartHour')::numeric, 9);
    work_end   := coalesce((bs ->> 'workEndHour')::numeric, 19);
    IF NEW.start_hour < work_start OR NEW.end_hour > work_end THEN
      NEW.status := 'pending';
    ELSE
      NEW.status := 'confirmed';
    END IF;
  ELSE
    NEW.status := 'confirmed';
  END IF;

  RETURN NEW;
END $$;

-- Fire on every insert/update: status changes must be checked too.
DROP TRIGGER IF EXISTS bookings_enforce_policy ON bookings;
CREATE TRIGGER bookings_enforce_policy
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION enforce_booking_policy();

-- ------------------------------------------------------------
-- 5. RLS: the instrument responsible may authorize / refuse pending bookings
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "bookings_update" ON bookings;
CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE TO authenticated
  USING      (user_id = current_lab_user_id() OR is_booking_manager()
              OR (status = 'pending' AND is_instrument_responsible(instrument_id)))
  WITH CHECK (user_id = current_lab_user_id() OR is_booking_manager()
              OR is_instrument_responsible(instrument_id));

DROP POLICY IF EXISTS "bookings_delete" ON bookings;
CREATE POLICY "bookings_delete" ON bookings
  FOR DELETE TO authenticated
  USING (user_id = current_lab_user_id() OR is_booking_manager()
         OR (status = 'pending' AND is_instrument_responsible(instrument_id)));

-- ------------------------------------------------------------
-- 6. Policies for the PDMS hood and the confocal
--    (protect_instrument_fields blocks booking_policy changes when there is
--    no admin session, as in the SQL editor — disable it around the update)
-- ------------------------------------------------------------
ALTER TABLE instruments DISABLE TRIGGER trg_protect_instrument_fields;

-- PDMS hood: 4 seats, 4 fixed 3-hour slots, weekly quota kept as it is
-- (default 6), horizon 7 days for students / 14 for everybody else, a slot in
-- progress can still be booked. The old "opens Friday 11:00" note goes away.
UPDATE instruments
   SET booking_policy = (coalesce(booking_policy, '{}'::jsonb) - 'maxAdvanceDays' - 'note')
     || jsonb_build_object(
          'capacity', 4,
          'advanceDaysByGroup', jsonb_build_object('student', 7, 'researcher', 14, 'staff', 14),
          'allowInProgress', true)
     || CASE WHEN coalesce(booking_policy, '{}'::jsonb) ? 'slots' THEN '{}'::jsonb
             ELSE '{"slots":[{"start":8,"end":11},{"start":11,"end":14},{"start":14,"end":17},{"start":17,"end":20}]}'::jsonb END
     || CASE WHEN coalesce(booking_policy, '{}'::jsonb) ? 'maxSlotsPerWeek' THEN '{}'::jsonb
             ELSE '{"maxSlotsPerWeek":6}'::jsonb END
 WHERE lower(name) LIKE '%pdms%';

-- Confocal: max 5 h per person per day, 14 days horizon for everybody,
-- extra hours need authorization, a slot in progress can still be booked.
UPDATE instruments
   SET booking_policy = coalesce(booking_policy, '{}'::jsonb)
     || '{"maxHoursPerDay":5,"maxAdvanceDays":14,"extraHoursNeedApproval":true,"allowInProgress":true}'::jsonb
 WHERE lower(name) LIKE '%confocal%';

ALTER TABLE instruments ENABLE TRIGGER trg_protect_instrument_fields;

-- ------------------------------------------------------------
-- 7. Checks
-- ------------------------------------------------------------
-- 7a. Which instruments got a policy (expect exactly one PDMS and one confocal row)
SELECT id, name, responsible_user_id, jsonb_pretty(booking_policy) AS booking_policy
  FROM instruments
 WHERE booking_policy IS NOT NULL
 ORDER BY name;

-- 7b. status column + no leftover EXCLUDE constraint (expect: status row, 0 exclude rows)
SELECT 'column' AS what, column_name AS name FROM information_schema.columns
 WHERE table_name = 'bookings' AND column_name = 'status'
UNION ALL
SELECT 'exclude_constraint', conname FROM pg_constraint
 WHERE conrelid = 'bookings'::regclass AND contype = 'x';

-- 7c. Existing double bookings, if any (should be none unless capacity > 1)
SELECT a.instrument_id, a.date, a.start_hour, a.end_hour, a.user_name, b.user_name AS overlaps_with
  FROM bookings a JOIN bookings b
    ON a.instrument_id = b.instrument_id AND a.date = b.date AND a.id < b.id
   AND a.start_hour < b.end_hour AND a.end_hour > b.start_hour
 ORDER BY a.date, a.start_hour;
