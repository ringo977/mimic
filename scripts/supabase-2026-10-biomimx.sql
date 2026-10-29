-- ============================================================
-- MiMic Lab Manager — affiliation "BiomimX" (29 October 2026)
-- ============================================================
-- Run in Supabase → SQL Editor AFTER supabase-2026-10-lab-assistant.sql.
-- Idempotent.
--
-- Part A (already run by Marco on 29/10, harmless to repeat): BiomimX in the
--   affiliation CHECK.
-- Part B: BiomimX members have the permissions of a MiMic PhD, whatever
--   their title. The "effective role" is now one SQL function,
--   lab_effective_role(affiliation, role):
--     MiMic Lab → the role · BiomimX → 'phd' · anything else → 'msc'
--   and every permission function reads it instead of testing
--   affiliation = 'MiMic Lab'. Versions: lab_can v6, is_lab_admin v4,
--   is_booking_manager v3, lab_can_upload_manuals v3, can_access_stock v3,
--   lab_can_add_students v3, lab_can_add_members v3, lab_is_pi_or_admin v2,
--   lab_can_grant_training v2, enforce_booking_policy v5.
-- Mirrors effectiveRole() in data/lab-data.ts.
-- ============================================================

-- ---------- A. CHECK ----------
ALTER TABLE lab_users DROP CONSTRAINT IF EXISTS lab_users_affiliation_check;
ALTER TABLE lab_users ADD CONSTRAINT lab_users_affiliation_check
  CHECK (affiliation IN ('MiMic Lab', 'DEIB', 'POLIMI', 'Biomech', 'BiomimX', 'External'));

-- ---------- B. Effective role ----------
CREATE OR REPLACE FUNCTION lab_effective_role(p_affiliation text, p_role text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_affiliation
           WHEN 'MiMic Lab' THEN p_role
           WHEN 'BiomimX'   THEN 'phd'
           ELSE 'msc'
         END;
$$;
REVOKE ALL ON FUNCTION lab_effective_role(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lab_effective_role(text, text) TO authenticated;

-- lab_can v6
CREATE OR REPLACE FUNCTION lab_can(perm text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_users u, lab_effective_role(u.affiliation, u.role) AS r
    WHERE u.status = 'active'
      AND (u.auth_user_id = auth.uid()
           OR (u.auth_user_id IS NULL AND u.email = auth.jwt() ->> 'email'))
      AND CASE perm
            -- Purchase approval is a PI decision: the Admin flag does not grant it.
            WHEN 'approve_orders' THEN r IN ('admin', 'pi')
            ELSE (
              u.is_admin = true
              OR r IN ('admin', 'pi')
              OR CASE perm
                   WHEN 'withdraw_reagents' THEN r NOT IN ('msc', 'guest')
                   WHEN 'add_reagents'      THEN r IN ('researcher', 'lab_manager', 'project_manager', 'postdoc')
                   WHEN 'manage_cryo'       THEN r NOT IN ('msc', 'guest')
                   WHEN 'request_orders'    THEN r NOT IN ('msc', 'guest')
                   WHEN 'handle_orders'     THEN r = 'lab_manager'
                   ELSE false
                 END
            )
          END
  );
$$;

-- is_lab_admin v4 — Admin Panel (MFA)
CREATE OR REPLACE FUNCTION is_lab_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_aal2() AND EXISTS (
    SELECT 1 FROM lab_users u
    WHERE u.status = 'active'
      AND (u.auth_user_id = auth.uid()
           OR (u.auth_user_id IS NULL AND u.email = auth.jwt() ->> 'email'))
      AND (u.is_admin = true
           OR lab_effective_role(u.affiliation, u.role) IN ('admin', 'pi', 'lab_manager', 'project_manager'))
  );
$$;

-- is_booking_manager v3 — canManageAllBookings
CREATE OR REPLACE FUNCTION is_booking_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_aal2() AND EXISTS (
    SELECT 1 FROM lab_users u
    WHERE u.status = 'active'
      AND (u.auth_user_id = auth.uid()
           OR (u.auth_user_id IS NULL AND u.email = auth.jwt() ->> 'email'))
      AND (u.is_admin = true
           OR lab_effective_role(u.affiliation, u.role) IN ('admin', 'pi', 'lab_manager', 'project_manager'))
  );
$$;

-- lab_can_upload_manuals v3
CREATE OR REPLACE FUNCTION lab_can_upload_manuals()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_lab_admin() OR EXISTS (
    SELECT 1 FROM lab_users u
    WHERE u.status = 'active'
      AND (u.auth_user_id = auth.uid()
           OR (u.auth_user_id IS NULL AND u.email = auth.jwt() ->> 'email'))
      AND lab_effective_role(u.affiliation, u.role) IN ('admin', 'pi', 'researcher', 'lab_manager', 'project_manager', 'postdoc')
  );
$$;

-- can_access_stock v3 — reserved stocks
CREATE OR REPLACE FUNCTION can_access_stock(p_reagent_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   reagents r
    JOIN   lab_users u ON u.id = current_lab_user_id()
    WHERE  r.id = p_reagent_id
      AND (r.kind <> 'stock'
           OR u.is_admin = true
           OR lab_effective_role(u.affiliation, u.role) IN ('admin', 'pi', 'lab_manager')
           OR u.id = ANY (r.responsible_user_ids))
  );
$$;

-- lab_can_add_students v3 — PhD and up (BiomimX included)
CREATE OR REPLACE FUNCTION lab_can_add_students()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_users u
    WHERE u.status = 'active'
      AND (u.auth_user_id = auth.uid()
           OR (u.auth_user_id IS NULL AND u.email = auth.jwt() ->> 'email'))
      AND lab_effective_role(u.affiliation, u.role) IN ('admin', 'pi', 'researcher', 'lab_manager', 'project_manager', 'postdoc', 'phd')
  );
$$;

-- lab_can_add_members v3
CREATE OR REPLACE FUNCTION lab_can_add_members()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_users u
    WHERE u.status = 'active'
      AND (u.auth_user_id = auth.uid()
           OR (u.auth_user_id IS NULL AND u.email = auth.jwt() ->> 'email'))
      AND (u.is_admin = true
           OR lab_effective_role(u.affiliation, u.role) IN ('admin', 'pi', 'lab_manager', 'project_manager'))
  );
$$;

-- lab_is_pi_or_admin v2
CREATE OR REPLACE FUNCTION lab_is_pi_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_aal2() AND EXISTS (
    SELECT 1 FROM lab_users u
    WHERE u.status = 'active'
      AND (u.auth_user_id = auth.uid()
           OR (u.auth_user_id IS NULL AND u.email = auth.jwt() ->> 'email'))
      AND (u.is_admin = true OR lab_effective_role(u.affiliation, u.role) IN ('admin', 'pi'))
  );
$$;

-- lab_can_grant_training v2 — 'microfab': PhD and up (BiomimX included) · 'bio': Lab Manager and up
CREATE OR REPLACE FUNCTION lab_can_grant_training(p_kind text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT lab_is_pi_or_admin() OR EXISTS (
    SELECT 1 FROM lab_users u, lab_effective_role(u.affiliation, u.role) AS r
    WHERE u.status = 'active'
      AND (u.auth_user_id = auth.uid()
           OR (u.auth_user_id IS NULL AND u.email = auth.jwt() ->> 'email'))
      AND CASE p_kind
            WHEN 'microfab' THEN r IN ('admin', 'pi', 'researcher', 'lab_manager', 'project_manager', 'postdoc', 'phd')
            WHEN 'bio'      THEN r IN ('admin', 'pi', 'researcher', 'lab_manager')
            ELSE false
          END
  );
$$;

-- enforce_booking_policy v5: booking horizon group from the effective role
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
  -- v4: the responsible of the instrument manages its bookings like a booking manager
  manager := is_booking_manager() OR is_instrument_responsible(NEW.instrument_id);
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
  -- Seats in use = PEAK number of bookings running at the same instant
  -- inside the new range, not the number of bookings that intersect it
  -- (with 2 seats, 8–9 and 9–10 leave a seat free for a new 8–10). The
  -- peak is reached at the new start or at the start of an overlapping row.
  SELECT coalesce(max(n), 0) INTO used
    FROM (
      SELECT count(*) AS n
        FROM (
          SELECT NEW.start_hour AS t
          UNION
          SELECT b.start_hour FROM bookings b
           WHERE b.instrument_id = NEW.instrument_id AND b.date = NEW.date AND b.id <> NEW.id
             AND b.start_hour > NEW.start_hour AND b.start_hour < NEW.end_hour
        ) pts
        JOIN bookings o
          ON o.instrument_id = NEW.instrument_id AND o.date = NEW.date AND o.id <> NEW.id
         AND o.start_hour <= pts.t AND o.end_hour > pts.t
       GROUP BY pts.t
    ) peaks;
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
    -- v4: the certification may be shared by several instruments (certification_id)
    SELECT coalesce(inst.certification_id, inst.id) = ANY (coalesce(u.certifications, '{}'::text[]))
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
  -- v5: effective role (BiomimX = phd, other non-MiMic = msc)
  SELECT lab_effective_role(u.affiliation, u.role) INTO u_role FROM lab_users u WHERE u.id = NEW.user_id;
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

-- ---------- Checks (expect: all true, then one row per BiomimX member) ----------
SELECT
  (SELECT pg_get_constraintdef(oid) LIKE '%BiomimX%' FROM pg_constraint WHERE conname = 'lab_users_affiliation_check') AS biomimx_ok,
  (SELECT count(*) = 9 FROM pg_proc WHERE proname IN ('lab_can', 'is_lab_admin', 'is_booking_manager', 'lab_can_upload_manuals', 'can_access_stock',
      'lab_can_add_students', 'lab_can_add_members', 'lab_is_pi_or_admin', 'lab_can_grant_training') AND prosrc LIKE '%lab_effective_role%') AS nine_functions_ok,
  (SELECT prosrc LIKE '%lab_effective_role%' FROM pg_proc WHERE proname = 'enforce_booking_policy') AS booking_policy_v5,
  lab_effective_role('BiomimX', 'researcher') = 'phd' AND lab_effective_role('DEIB', 'researcher') = 'msc' AND lab_effective_role('MiMic Lab', 'researcher') = 'researcher' AS mapping_ok;

SELECT name, role, affiliation, lab_effective_role(affiliation, role) AS effective_role, status
FROM lab_users WHERE affiliation = 'BiomimX' ORDER BY name;
