-- ============================================================
-- MiMic Lab Manager — "Lab Assistant" permissions (29 October 2026)
-- ============================================================
-- Run in Supabase → SQL Editor AFTER supabase-2026-10-wishlist-roles.sql.
-- Idempotent (the hood migration in §2 is a no-op the second time).
--
-- Marco's rules:
--   A. New affiliation "Biomech". Every non-MiMic member (DEIB, POLIMI,
--      Biomech, External) has the permissions of a MiMic MSc student,
--      whatever the role. The Admin flag stays an explicit override.
--   1. All the biosafety hoods need ONE certification per family:
--      'biosafety-hood-evooc' (the "EvOoC" hoods) and 'biosafety-hood'
--      (the others). Renamed everywhere: "Safety cabinet" → "Biosafety hood".
--   2. Researcher loses Database page and CSV export (app-side matrix).
--   3. Lab Manager and Project Manager get the Admin Panel / Site Stats;
--      Project Manager also manages everybody's bookings.
--   4. Microfabrication training granted by any MiMic member from PhD up.
--   5. Biological training granted by Lab Manager and up (LM, Researcher, PI, Admin).
--   6. Certifications granted only by the responsible of an instrument they
--      unlock (or PI / Admin). Responsibles have full control over the
--      bookings of their instrument.
--
-- Sections
--   §0 lab_users_affiliation_check with 'Biomech'
--   §1 instruments.certification_id (shared certification);
--      protect_instrument_fields v2
--   §2 Hoods: rename, requires_certification, two shared certifications,
--      users' certifications migrated, old per-hood certification rows removed
--   §3 lab_can v5 — non-MiMic → nothing (except the Admin flag)
--   §4 is_lab_admin v3, is_booking_manager v2 (MiMic admin/pi/lab_manager/
--      project_manager or the flag), lab_can_upload_manuals v2 (MiMic only),
--      can_access_stock v2 (MiMic only)
--   §5 lab_can_add_students v2 / lab_can_add_members v2 (MiMic only)
--   §6 enforce_booking_policy v4 (responsible = manager on own instrument,
--      shared certification, non-MiMic = msc group); bookings_update/delete v3
--   §7 Trainings / certifications granters: lab_can_grant_training(kind),
--      lab_can_grant_certification(cert), lab_is_granter();
--      protect_lab_user_fields v3; lab_users_update v3
--   §8 Checks
--
-- Mirrors data/lab-data.ts: effectiveRole(), permissionsOf(),
-- MICROFAB_TRAINER_ROLES, BIO_TRAINER_ROLES, canGrantCertification(),
-- isCertifiedFor(), Instrument.certificationId.
-- ============================================================

-- ------------------------------------------------------------
-- §0 Affiliations
-- ------------------------------------------------------------
ALTER TABLE lab_users DROP CONSTRAINT IF EXISTS lab_users_affiliation_check;
ALTER TABLE lab_users ADD CONSTRAINT lab_users_affiliation_check
  CHECK (affiliation IN ('MiMic Lab', 'DEIB', 'POLIMI', 'Biomech', 'External'));

-- ------------------------------------------------------------
-- §1 Shared certifications
-- ------------------------------------------------------------
ALTER TABLE instruments ADD COLUMN IF NOT EXISTS certification_id text;
COMMENT ON COLUMN instruments.certification_id IS
  'Certification that unlocks the instrument when requires_certification; NULL = the instrument''s own id. Several instruments may share one.';

CREATE OR REPLACE FUNCTION protect_instrument_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_lab_admin() THEN
    IF NEW.requires_certification IS DISTINCT FROM OLD.requires_certification
    OR NEW.certification_id       IS DISTINCT FROM OLD.certification_id
    OR NEW.booking_policy         IS DISTINCT FROM OLD.booking_policy
    OR NEW.responsible_user_id    IS DISTINCT FROM OLD.responsible_user_id THEN
      RAISE EXCEPTION 'Only lab admins can change the certification requirement, booking rules or responsible of an instrument';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ------------------------------------------------------------
-- §2 Biosafety hoods
-- ------------------------------------------------------------
-- 2a. Rename "Safety cabinet" → "Biosafety hood" (instruments, certifications,
--     log lines, manual titles). Case-insensitive, keeps the rest of the name.
UPDATE instruments    SET name  = regexp_replace(name,  'safety cabinet', 'Biosafety hood', 'gi') WHERE name  ~* 'safety cabinet';
UPDATE certifications SET name  = regexp_replace(name,  'safety cabinet', 'Biosafety hood', 'gi') WHERE name  ~* 'safety cabinet';
UPDATE log_entries    SET action = regexp_replace(action, 'safety cabinet', 'Biosafety hood', 'gi') WHERE action ~* 'safety cabinet';
UPDATE log_entries    SET details = regexp_replace(details, 'safety cabinet', 'Biosafety hood', 'gi') WHERE details ~* 'safety cabinet';
UPDATE manuals        SET title = regexp_replace(title, 'safety cabinet', 'Biosafety hood', 'gi') WHERE title ~* 'safety cabinet';

-- 2b. Two shared certifications
INSERT INTO certifications (id, name, description)
VALUES ('biosafety-hood-evooc', 'Biosafety hood EvOoC', 'Authorised to work in the Biosafety hoods EvOoC (one certification for all of them)'),
       ('biosafety-hood',       'Biosafety hood',       'Authorised to work in the Biosafety hoods (one certification for all of them)')
ON CONFLICT (id) DO NOTHING;

-- 2c. Every hood requires its family certification
UPDATE instruments
   SET requires_certification = true,
       certification_id = CASE WHEN name ~* 'evooc' THEN 'biosafety-hood-evooc' ELSE 'biosafety-hood' END
 WHERE name ~* 'biosafety hood';

-- 2d. Users: whoever held any hood of a family now holds the family
--     certification (earliest date kept); the per-hood ids are dropped.
--     The SQL Editor has no JWT, so the lab_users guard is paused for this block.
ALTER TABLE lab_users DISABLE TRIGGER trg_protect_lab_user_fields;
DO $$
DECLARE
  fam  record;
  u    record;
  ids  text[];
  mine text[];
  d    text;
BEGIN
  FOR fam IN SELECT unnest(ARRAY['biosafety-hood-evooc', 'biosafety-hood']) AS cert LOOP
    SELECT coalesce(array_agg(id), '{}') INTO ids FROM instruments WHERE certification_id = fam.cert;
    IF cardinality(ids) = 0 THEN CONTINUE; END IF;
    FOR u IN SELECT * FROM lab_users WHERE coalesce(certifications, '{}') && ids LOOP
      mine := ARRAY(SELECT x FROM unnest(u.certifications) x WHERE NOT (x = ANY (ids)));
      IF NOT (fam.cert = ANY (mine)) THEN mine := mine || fam.cert; END IF;
      SELECT min(value) INTO d FROM jsonb_each_text(coalesce(u.certified_at, '{}'::jsonb)) WHERE key = ANY (ids) AND value <> '';
      UPDATE lab_users
         SET certifications = mine,
             certified_at = (coalesce(certified_at, '{}'::jsonb) - ids)
                            || CASE WHEN d IS NOT NULL AND NOT (coalesce(certified_at, '{}'::jsonb) ? fam.cert)
                                    THEN jsonb_build_object(fam.cert, d) ELSE '{}'::jsonb END
       WHERE id = u.id;
    END LOOP;
    -- the old one-per-hood certification rows are no longer used
    DELETE FROM certifications WHERE id = ANY (ids);
  END LOOP;
END $$;
ALTER TABLE lab_users ENABLE TRIGGER trg_protect_lab_user_fields;

-- ------------------------------------------------------------
-- §3 lab_can v5
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION lab_can(perm text)
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
      AND CASE perm
            -- Purchase approval is a PI decision: the Admin flag does not grant it.
            WHEN 'approve_orders' THEN u.affiliation = 'MiMic Lab' AND u.role IN ('admin', 'pi')
            ELSE (
              u.is_admin = true
              -- v5: members of other affiliations count as MSc students → no lab_can permission
              OR (u.affiliation = 'MiMic Lab' AND (
                u.role IN ('admin', 'pi')
                OR CASE perm
                     WHEN 'withdraw_reagents' THEN u.role NOT IN ('msc', 'guest')
                     WHEN 'add_reagents'      THEN u.role IN ('researcher', 'lab_manager', 'project_manager', 'postdoc')
                     WHEN 'manage_cryo'       THEN u.role NOT IN ('msc', 'guest')
                     WHEN 'request_orders'    THEN u.role NOT IN ('msc', 'guest')
                     WHEN 'handle_orders'     THEN u.role = 'lab_manager'
                     ELSE false
                   END))
            )
          END
  );
$$;

-- ------------------------------------------------------------
-- §4 Admins and booking managers
-- ------------------------------------------------------------
-- Admin Panel: MiMic admin / PI / Lab Manager / Project Manager, or the Admin flag. MFA required.
CREATE OR REPLACE FUNCTION is_lab_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_aal2() AND EXISTS (
    SELECT 1 FROM lab_users
    WHERE status = 'active'
      AND (auth_user_id = auth.uid()
           OR (auth_user_id IS NULL AND email = auth.jwt() ->> 'email'))
      AND (is_admin = true
           OR (affiliation = 'MiMic Lab' AND role IN ('admin', 'pi', 'lab_manager', 'project_manager')))
  );
$$;

-- canManageAllBookings: the same set
CREATE OR REPLACE FUNCTION is_booking_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_aal2() AND EXISTS (
    SELECT 1 FROM lab_users
    WHERE status = 'active'
      AND (auth_user_id = auth.uid()
           OR (auth_user_id IS NULL AND email = auth.jwt() ->> 'email'))
      AND (is_admin = true
           OR (affiliation = 'MiMic Lab' AND role IN ('admin', 'pi', 'lab_manager', 'project_manager')))
  );
$$;

CREATE OR REPLACE FUNCTION lab_can_upload_manuals()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_lab_admin() OR EXISTS (
    SELECT 1 FROM lab_users
    WHERE status = 'active'
      AND (auth_user_id = auth.uid()
           OR (auth_user_id IS NULL AND email = auth.jwt() ->> 'email'))
      AND affiliation = 'MiMic Lab'
      AND role IN ('admin', 'pi', 'researcher', 'lab_manager', 'project_manager', 'postdoc')
  );
$$;

-- can_access_stock v2: reserved stocks open to MiMic admin/pi/lab_manager
-- (an external Lab Manager is an MSc), the Admin flag, or the responsibles.
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
           OR (u.affiliation = 'MiMic Lab' AND u.role IN ('admin', 'pi', 'lab_manager'))
           OR u.id = ANY (r.responsible_user_ids))
  );
$$;

-- ------------------------------------------------------------
-- §5 Registering members (Users → Add student / Add member)
-- ------------------------------------------------------------
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
      AND u.affiliation = 'MiMic Lab'
      AND u.role IN ('admin', 'pi', 'researcher', 'lab_manager', 'project_manager', 'postdoc', 'phd')
  );
$$;

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
           OR (u.affiliation = 'MiMic Lab' AND u.role IN ('admin', 'pi', 'lab_manager', 'project_manager')))
  );
$$;

-- ------------------------------------------------------------
-- §6 Bookings: responsibles own their instrument
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
  -- v4: non-MiMic members count as MSc students (effectiveRole in the app)
  SELECT CASE WHEN u.affiliation = 'MiMic Lab' THEN u.role ELSE 'msc' END INTO u_role FROM lab_users u WHERE u.id = NEW.user_id;
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

-- v3: the responsible changes / cancels any booking of the instrument, not only pending ones
DROP POLICY IF EXISTS "bookings_update" ON bookings;
CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE TO authenticated
  USING      (user_id = current_lab_user_id() OR is_booking_manager() OR is_instrument_responsible(instrument_id))
  WITH CHECK (user_id = current_lab_user_id() OR is_booking_manager() OR is_instrument_responsible(instrument_id));

DROP POLICY IF EXISTS "bookings_delete" ON bookings;
CREATE POLICY "bookings_delete" ON bookings
  FOR DELETE TO authenticated
  USING (user_id = current_lab_user_id() OR is_booking_manager() OR is_instrument_responsible(instrument_id));

-- ------------------------------------------------------------
-- §7 Trainings and certifications: who grants what
-- ------------------------------------------------------------
-- PI / Admin by role, or the Admin flag (MFA): they may grant anything.
CREATE OR REPLACE FUNCTION lab_is_pi_or_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_aal2() AND EXISTS (
    SELECT 1 FROM lab_users
    WHERE status = 'active'
      AND (auth_user_id = auth.uid()
           OR (auth_user_id IS NULL AND email = auth.jwt() ->> 'email'))
      AND (is_admin = true OR (affiliation = 'MiMic Lab' AND role IN ('admin', 'pi')))
  );
$$;
REVOKE ALL ON FUNCTION lab_is_pi_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lab_is_pi_or_admin() TO authenticated;

-- 'microfab': any MiMic member from PhD up · 'bio': Lab Manager and up
CREATE OR REPLACE FUNCTION lab_can_grant_training(p_kind text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT lab_is_pi_or_admin() OR EXISTS (
    SELECT 1 FROM lab_users u
    WHERE u.status = 'active'
      AND (u.auth_user_id = auth.uid()
           OR (u.auth_user_id IS NULL AND u.email = auth.jwt() ->> 'email'))
      AND u.affiliation = 'MiMic Lab'
      AND CASE p_kind
            WHEN 'microfab' THEN u.role IN ('admin', 'pi', 'researcher', 'lab_manager', 'project_manager', 'postdoc', 'phd')
            WHEN 'bio'      THEN u.role IN ('admin', 'pi', 'researcher', 'lab_manager')
            ELSE false
          END
  );
$$;
REVOKE ALL ON FUNCTION lab_can_grant_training(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lab_can_grant_training(text) TO authenticated;

-- A certification is granted by the responsible of an instrument it unlocks
CREATE OR REPLACE FUNCTION lab_can_grant_certification(p_cert_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT lab_is_pi_or_admin() OR EXISTS (
    SELECT 1 FROM instruments i
    WHERE coalesce(i.certification_id, i.id) = p_cert_id
      AND i.responsible_user_id IS NOT NULL
      AND i.responsible_user_id = current_lab_user_id()
  );
$$;
REVOKE ALL ON FUNCTION lab_can_grant_certification(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lab_can_grant_certification(text) TO authenticated;

-- Anybody who may grant something: lets the RLS policy open the row, the
-- trigger below then limits WHICH columns may change.
CREATE OR REPLACE FUNCTION lab_is_granter()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT lab_can_grant_training('microfab')
      OR EXISTS (SELECT 1 FROM instruments i WHERE i.responsible_user_id = current_lab_user_id());
$$;
REVOKE ALL ON FUNCTION lab_is_granter() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lab_is_granter() TO authenticated;

-- v3 of the lab_users guard:
--   · management fields (id, role, email, status, supervisor, …): Admin Panel only
--   · a granter touching somebody else's row may change NOTHING but the
--     training / certification columns
--   · training_microfab_*: lab_can_grant_training('microfab')
--   · training_bio_*:      lab_can_grant_training('bio')
--   · certifications / certified_at: every id added, removed or re-dated
--     must pass lab_can_grant_certification(id)
--   · nobody grants to themselves, except PI / Admin
CREATE OR REPLACE FUNCTION protect_lab_user_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  panel_admin boolean := is_lab_admin();
  full_admin  boolean := lab_is_pi_or_admin();
  me          text    := current_lab_user_id();
  train_cols  text[]  := ARRAY['training_microfab_done', 'training_microfab_date', 'training_bio_done', 'training_bio_date', 'certifications', 'certified_at'];
  cert_id     text;
  touched     text[];
BEGIN
  IF NOT panel_admin THEN
    IF NEW.id                      IS DISTINCT FROM OLD.id
    OR NEW.role                    IS DISTINCT FROM OLD.role
    OR NEW.is_admin                IS DISTINCT FROM OLD.is_admin
    OR NEW.email                   IS DISTINCT FROM OLD.email
    OR NEW.affiliation             IS DISTINCT FROM OLD.affiliation
    OR NEW.projects                IS DISTINCT FROM OLD.projects
    -- auth_user_id: the FIRST link of an unlinked row to the auth account
    -- whose email equals the row's email is legitimate (done by
    -- trg_link_lab_user_auth on any update, or by claim_lab_user() at
    -- login). Email itself stays protected, so a user cannot swap email
    -- and link elsewhere.
    OR (NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
        AND NOT (
          OLD.auth_user_id IS NULL
          AND NEW.auth_user_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM auth.users au
            WHERE au.id = NEW.auth_user_id
              AND lower(au.email) = lower(NEW.email)
          )
        ))
    OR NEW.status                  IS DISTINCT FROM OLD.status
    OR NEW.person_code             IS DISTINCT FROM OLD.person_code
    OR NEW.supervisor_id           IS DISTINCT FROM OLD.supervisor_id
    OR NEW.start_date              IS DISTINCT FROM OLD.start_date
    OR NEW.end_date                IS DISTINCT FROM OLD.end_date THEN
      RAISE EXCEPTION 'Only lab admins can change management fields (id, role, affiliation, projects, status, ...)';
    END IF;
    -- Somebody else's row: only the training / certification columns may differ
    IF NEW.id IS DISTINCT FROM me AND (to_jsonb(NEW) - train_cols) IS DISTINCT FROM (to_jsonb(OLD) - train_cols) THEN
      RAISE EXCEPTION 'You may only grant trainings or certifications on another member''s card';
    END IF;
  END IF;

  IF full_admin THEN
    RETURN NEW;
  END IF;

  -- Trainings
  IF (NEW.training_microfab_done IS DISTINCT FROM OLD.training_microfab_done
      OR NEW.training_microfab_date IS DISTINCT FROM OLD.training_microfab_date)
     AND NOT (NEW.id IS DISTINCT FROM me AND lab_can_grant_training('microfab')) THEN
    RAISE EXCEPTION 'The microfabrication training is granted by a MiMic member from PhD up (not to yourself)';
  END IF;
  IF (NEW.training_bio_done IS DISTINCT FROM OLD.training_bio_done
      OR NEW.training_bio_date IS DISTINCT FROM OLD.training_bio_date)
     AND NOT (NEW.id IS DISTINCT FROM me AND lab_can_grant_training('bio')) THEN
    RAISE EXCEPTION 'The biological training is granted by the Lab Manager, a Researcher or a PI (not to yourself)';
  END IF;

  -- Certifications: ids added or removed, plus ids whose date changed
  IF NEW.certifications IS DISTINCT FROM OLD.certifications OR NEW.certified_at IS DISTINCT FROM OLD.certified_at THEN
    SELECT coalesce(array_agg(DISTINCT x), '{}') INTO touched FROM (
      (SELECT unnest(coalesce(NEW.certifications, '{}')) AS x
       EXCEPT SELECT unnest(coalesce(OLD.certifications, '{}')))
      UNION
      (SELECT unnest(coalesce(OLD.certifications, '{}'))
       EXCEPT SELECT unnest(coalesce(NEW.certifications, '{}')))
      UNION
      SELECT key FROM jsonb_each_text(coalesce(NEW.certified_at, '{}'::jsonb)) n
       WHERE coalesce(OLD.certified_at, '{}'::jsonb) ->> key IS DISTINCT FROM value
      UNION
      SELECT key FROM jsonb_each_text(coalesce(OLD.certified_at, '{}'::jsonb)) o
       WHERE NOT (coalesce(NEW.certified_at, '{}'::jsonb) ? key)
    ) t;
    IF NEW.id IS NOT DISTINCT FROM me AND cardinality(touched) > 0 THEN
      RAISE EXCEPTION 'You cannot grant certifications to yourself';
    END IF;
    FOREACH cert_id IN ARRAY touched LOOP
      IF NOT lab_can_grant_certification(cert_id) THEN
        RAISE EXCEPTION 'Certification "%" is granted by the responsible of the instrument (or a PI / Admin)', cert_id;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_lab_user_fields ON lab_users;
CREATE TRIGGER trg_protect_lab_user_fields
  BEFORE UPDATE ON lab_users
  FOR EACH ROW EXECUTE FUNCTION protect_lab_user_fields();

-- lab_users_update v3: own row, Admin Panel, or a granter (columns limited by the trigger)
DROP POLICY IF EXISTS "lab_users_update" ON lab_users;
CREATE POLICY "lab_users_update" ON lab_users
  FOR UPDATE TO authenticated
  USING      (id = current_lab_user_id() OR is_lab_admin() OR lab_is_granter())
  WITH CHECK (id = current_lab_user_id() OR is_lab_admin() OR lab_is_granter());

-- ------------------------------------------------------------
-- §8 Checks
-- ------------------------------------------------------------
-- expect: all true
SELECT
  (SELECT pg_get_constraintdef(oid) LIKE '%Biomech%' FROM pg_constraint WHERE conname = 'lab_users_affiliation_check')      AS biomech_ok,
  (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'instruments' AND column_name = 'certification_id')) AS cert_column,
  (SELECT prosrc LIKE '%affiliation = ''MiMic Lab'' AND (%' FROM pg_proc WHERE proname = 'lab_can')                        AS lab_can_v5,
  (SELECT prosrc LIKE '%project_manager%' FROM pg_proc WHERE proname = 'is_lab_admin')                                     AS is_lab_admin_v3,
  (SELECT prosrc LIKE '%project_manager%' FROM pg_proc WHERE proname = 'is_booking_manager')                               AS booking_manager_v2,
  (SELECT prosrc LIKE '%is_instrument_responsible(NEW.instrument_id);%' FROM pg_proc WHERE proname = 'enforce_booking_policy') AS booking_policy_v4,
  (SELECT prosrc LIKE '%lab_can_grant_certification%' FROM pg_proc WHERE proname = 'protect_lab_user_fields')             AS user_guard_v3,
  (SELECT qual LIKE '%lab_is_granter%' FROM pg_policies WHERE tablename = 'lab_users' AND policyname = 'lab_users_update') AS users_update_v3;

-- The hoods after the migration (name, family certification, responsible)
SELECT i.name, i.certification_id, i.requires_certification, u.name AS responsible
FROM instruments i LEFT JOIN lab_users u ON u.id = i.responsible_user_id
WHERE i.name ~* 'biosafety hood' OR i.certification_id IS NOT NULL
ORDER BY i.name;

-- Who holds the two family certifications now
SELECT c.id, c.name, count(u.id) AS holders, string_agg(u.name, ', ' ORDER BY u.name) AS names
FROM certifications c LEFT JOIN lab_users u ON c.id = ANY (coalesce(u.certifications, '{}'))
WHERE c.id IN ('biosafety-hood-evooc', 'biosafety-hood')
GROUP BY c.id, c.name ORDER BY c.id;

-- Anything still called "safety cabinet" somewhere? (expect 0 rows)
SELECT 'instruments' AS t, name AS txt FROM instruments WHERE name ~* 'safety cabinet'
UNION ALL SELECT 'certifications', name FROM certifications WHERE name ~* 'safety cabinet'
UNION ALL SELECT 'manuals', title FROM manuals WHERE title ~* 'safety cabinet'
UNION ALL SELECT 'log_entries', left(action, 60) FROM log_entries WHERE action ~* 'safety cabinet' LIMIT 20;
