-- ============================================================
-- MiMic Lab Manager — Fixes from the independent assessment (27 Sep 2026)
-- ============================================================
-- Run in: Supabase Dashboard → SQL Editor. Idempotent: safe to re-run.
-- Run AFTER supabase-2026-09-tighten.sql (it redefines two of its functions).
--
-- What it fixes (assessment finding in brackets):
--
--   1. lab_can(perm)  — one SQL mirror of rolePermissions /
--      externalRolePermissions in data/lab-data.ts, so the database enforces
--      the same matrix the UI shows. Until now every member (guest and MSc
--      included) could INSERT/UPDATE reagents, vials and wishlist items
--      through the API.                                            [SEC-03]
--   2. is_booking_manager() — the set behind canManageAllBookings in the
--      app (admin / pi / lab_manager / is_admin, with MFA). Used by the
--      bookings policies, so a lab manager who sees "cancel" on somebody
--      else's booking can actually do it.                          [FUN-03]
--   3. instruments: INSERT/UPDATE admin-only (only the Admin page writes
--      them); the field-protection trigger also covers booking_policy and
--      responsible_user_id, so nobody can switch the PDMS rules off.
--                                                                  [SEC-01]
--   4. cryo_vials: a member may edit only their own vials and cannot hand
--      them to somebody else; storing / withdrawing needs canManageCryo.
--                                                                  [SEC-02]
--   5. reagents: create / edit / restock need canAddReagents; withdrawing
--      goes through adjust_reagent_stock(), now SECURITY DEFINER with its own
--      permission check (canWithdrawReagents) that REJECTS a withdrawal below
--      zero instead of silently clamping. max_stock = 0 no longer pins the
--      stock at zero.                                      [SEC-03, FUN-02]
--   6. enforce_booking_policy(): certification required by the instrument is
--      now checked in the database too, not only by the calendar UI; the
--      weekly quota count takes a transaction lock so two simultaneous
--      bookings cannot both pass.                          [SEC-04, FUN-01]
--      NOTE: the quota stays PER PERSON (6 slots/week each, one merged PDMS
--      hood) — that is the lab rule; "per group" in the brief meant "over
--      the four hoods together".
--   7. lab_users: certified_at (training dates) joins the admin-only fields.
--                                                                  [FUN-03]
--
-- The UI matrix this mirrors (data/lab-data.ts). If you change one, change
-- the other.
--
--   MiMic Lab            withdraw  add/edit reagents  cryo  wishlist  book
--   admin / pi              ✓            ✓             ✓       ✓       ✓
--   researcher              ✓            ✓             ✓       ✓       ✓
--   lab_manager             ✓            ✓             ✓       ✓       ✓
--   project_manager         ✓            ✓             ✓       ✓       ✓
--   postdoc                 ✓            ✓             ✓       ✓       ✓
--   phd                     ✓            —             ✓       ✓       ✓
--   msc                     —            —             —       —       ✓
--   guest                   —            —             —       —       —
--
--   External (DEIB / POLIMI / other affiliation)
--   admin / pi              ✓            ✓             ✓       ✓       ✓
--   lab_manager             ✓            ✓             ✓       ✓       ✓
--   researcher / pm / postdoc ✓          —             ✓       ✓       ✓
--   phd                     ✓            —             —       —       ✓
--   msc                     —            —             —       —       ✓
--   guest                   —            —             —       —       —
-- ============================================================

-- ============================================================
-- 1. lab_can(perm) — the permission matrix, server side
-- ============================================================
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
      AND (
        u.is_admin = true
        OR u.role IN ('admin', 'pi')
        OR CASE perm
             WHEN 'withdraw_reagents' THEN
               u.role NOT IN ('msc', 'guest')
             WHEN 'add_reagents' THEN
               CASE WHEN u.affiliation = 'MiMic Lab'
                    THEN u.role IN ('researcher', 'lab_manager', 'project_manager', 'postdoc')
                    ELSE u.role = 'lab_manager' END
             WHEN 'manage_cryo' THEN
               CASE WHEN u.affiliation = 'MiMic Lab'
                    THEN u.role NOT IN ('msc', 'guest')
                    ELSE u.role IN ('researcher', 'lab_manager', 'project_manager', 'postdoc') END
             WHEN 'request_orders' THEN
               CASE WHEN u.affiliation = 'MiMic Lab'
                    THEN u.role NOT IN ('msc', 'guest')
                    ELSE u.role IN ('researcher', 'lab_manager', 'project_manager', 'postdoc') END
             ELSE false
           END
      )
  );
$$;

-- ============================================================
-- 2. is_booking_manager() — canManageAllBookings, server side
--    (MFA required, like is_lab_admin: the app makes TOTP mandatory for
--    admin / pi / lab_manager / is_admin)
-- ============================================================
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
      AND (is_admin = true OR role IN ('admin', 'pi', 'lab_manager'))
  );
$$;

-- ============================================================
-- 3. Instruments — written only from the Admin page
-- ============================================================
DROP POLICY IF EXISTS "instruments_insert" ON instruments;
CREATE POLICY "instruments_insert" ON instruments
  FOR INSERT TO authenticated
  WITH CHECK (is_lab_admin());

DROP POLICY IF EXISTS "instruments_update" ON instruments;
CREATE POLICY "instruments_update" ON instruments
  FOR UPDATE TO authenticated
  USING (is_lab_admin())
  WITH CHECK (is_lab_admin());

-- Belt and braces: even if the policy is ever loosened again, the rule
-- fields stay admin-only.
CREATE OR REPLACE FUNCTION protect_instrument_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_lab_admin() THEN
    IF NEW.requires_certification IS DISTINCT FROM OLD.requires_certification
    OR NEW.booking_policy         IS DISTINCT FROM OLD.booking_policy
    OR NEW.responsible_user_id    IS DISTINCT FROM OLD.responsible_user_id THEN
      RAISE EXCEPTION 'Only lab admins can change the certification requirement, booking rules or responsible of an instrument';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_instrument_fields ON instruments;
CREATE TRIGGER trg_protect_instrument_fields
  BEFORE UPDATE ON instruments
  FOR EACH ROW EXECUTE FUNCTION protect_instrument_fields();

-- ============================================================
-- 4. Cryo vials — own vials only, no reassignment
-- ============================================================
DROP POLICY IF EXISTS "cryo_vials_insert" ON cryo_vials;
CREATE POLICY "cryo_vials_insert" ON cryo_vials
  FOR INSERT TO authenticated
  WITH CHECK (
    is_lab_admin()
    OR (lab_can('manage_cryo') AND user_id = current_lab_user_id())
  );

DROP POLICY IF EXISTS "cryo_vials_update" ON cryo_vials;
CREATE POLICY "cryo_vials_update" ON cryo_vials
  FOR UPDATE TO authenticated
  USING      (is_lab_admin() OR (lab_can('manage_cryo') AND user_id = current_lab_user_id()))
  WITH CHECK (is_lab_admin() OR (lab_can('manage_cryo') AND user_id = current_lab_user_id()));

DROP POLICY IF EXISTS "cryo_vials_delete" ON cryo_vials;
CREATE POLICY "cryo_vials_delete" ON cryo_vials
  FOR DELETE TO authenticated
  USING (is_lab_admin() OR (lab_can('manage_cryo') AND user_id = current_lab_user_id()));

-- ============================================================
-- 5. Reagents — create/edit need canAddReagents; stock moves via the RPC
-- ============================================================
DROP POLICY IF EXISTS "reagents_insert" ON reagents;
CREATE POLICY "reagents_insert" ON reagents
  FOR INSERT TO authenticated
  WITH CHECK (lab_can('add_reagents'));

DROP POLICY IF EXISTS "reagents_update" ON reagents;
CREATE POLICY "reagents_update" ON reagents
  FOR UPDATE TO authenticated
  USING (lab_can('add_reagents'))
  WITH CHECK (lab_can('add_reagents'));

-- Supersedes supabase-reagent-stock-rpc.sql. SECURITY DEFINER so that a PhD
-- student (canWithdrawReagents but not canAddReagents) can still withdraw
-- even though the reagents UPDATE policy no longer lets them write the row.
CREATE OR REPLACE FUNCTION adjust_reagent_stock(p_reagent_id text, p_delta numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cur  numeric;
  mx   numeric;
  nxt  numeric;
BEGIN
  IF NOT lab_can('withdraw_reagents') THEN
    RAISE EXCEPTION 'Your role cannot change reagent stock';
  END IF;

  SELECT current_stock, max_stock INTO cur, mx
    FROM reagents WHERE id = p_reagent_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reagent not found';
  END IF;

  nxt := cur + p_delta;
  IF nxt < 0 THEN
    RAISE EXCEPTION 'Not enough stock: % available, % requested', cur, -p_delta;
  END IF;
  -- Never exceed the declared maximum, unless none is declared (0 / NULL)
  IF coalesce(mx, 0) > 0 AND nxt > mx THEN
    nxt := mx;
  END IF;

  UPDATE reagents SET current_stock = nxt WHERE id = p_reagent_id;
  RETURN nxt;
END;
$$;

REVOKE ALL ON FUNCTION adjust_reagent_stock(text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION adjust_reagent_stock(text, numeric) TO authenticated;

-- ============================================================
-- 6. Wishlist — requesting an order needs canRequestOrders
-- ============================================================
DROP POLICY IF EXISTS "wishlist_items_insert" ON wishlist_items;
CREATE POLICY "wishlist_items_insert" ON wishlist_items
  FOR INSERT TO authenticated
  WITH CHECK (lab_can('request_orders'));

-- ============================================================
-- 7. Bookings — managers may act on anybody's booking
-- ============================================================
DROP POLICY IF EXISTS "bookings_insert" ON bookings;
CREATE POLICY "bookings_insert" ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    is_booking_manager()
    OR (user_id = current_lab_user_id() AND lab_can_book())
  );

DROP POLICY IF EXISTS "bookings_update" ON bookings;
CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE TO authenticated
  USING      (user_id = current_lab_user_id() OR is_booking_manager())
  WITH CHECK (user_id = current_lab_user_id() OR is_booking_manager());

DROP POLICY IF EXISTS "bookings_delete" ON bookings;
CREATE POLICY "bookings_delete" ON bookings
  FOR DELETE TO authenticated
  USING (user_id = current_lab_user_id() OR is_booking_manager());

-- ============================================================
-- 8. Booking rules — certification enforced, quota count locked
--    (supersedes the version in supabase-2026-09-booking-policy.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_booking_policy() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inst     instruments%ROWTYPE;
  p        jsonb;
  ok       boolean;
  used     integer;
  wk_start date;
  quota    integer;
  advance  integer;
BEGIN
  SELECT * INTO inst FROM instruments WHERE id = NEW.instrument_id;
  IF NOT FOUND THEN
    RETURN NEW;   -- FK / app decide what to do with unknown instruments
  END IF;

  -- Whoever can manage everybody's bookings may override the rules
  -- (same set as canManageAllBookings in the app).
  IF is_booking_manager() THEN
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

  p := inst.booking_policy;
  IF p IS NULL THEN
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

  -- Weekly quota per person (weeks run Monday–Sunday, like date_trunc).
  -- The advisory lock serialises concurrent bookings of the same person on
  -- the same instrument in the same week, so two requests cannot both see
  -- "5 used" and both pass.
  IF p ? 'maxSlotsPerWeek' THEN
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

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bookings_enforce_policy ON bookings;
CREATE TRIGGER bookings_enforce_policy
  BEFORE INSERT OR UPDATE OF instrument_id, user_id, date, start_hour, end_hour ON bookings
  FOR EACH ROW EXECUTE FUNCTION enforce_booking_policy();

-- ============================================================
-- 9. lab_users — training dates are admin-only too
--    (supersedes the version in supabase-2026-09-tighten.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION protect_lab_user_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_lab_admin() THEN
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
    OR NEW.end_date                IS DISTINCT FROM OLD.end_date
    OR NEW.training_microfab_done  IS DISTINCT FROM OLD.training_microfab_done
    OR NEW.training_microfab_date  IS DISTINCT FROM OLD.training_microfab_date
    OR NEW.training_bio_done       IS DISTINCT FROM OLD.training_bio_done
    OR NEW.training_bio_date       IS DISTINCT FROM OLD.training_bio_date
    OR NEW.certifications          IS DISTINCT FROM OLD.certifications
    OR NEW.certified_at            IS DISTINCT FROM OLD.certified_at THEN
      RAISE EXCEPTION 'Only lab admins can change management fields (id, role, affiliation, projects, status, trainings, certifications, ...)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_lab_user_fields ON lab_users;
CREATE TRIGGER trg_protect_lab_user_fields
  BEFORE UPDATE ON lab_users
  FOR EACH ROW EXECUTE FUNCTION protect_lab_user_fields();

-- ============================================================
-- 10. Check — every policy touched above, as the database now has it
-- ============================================================
SELECT tablename, policyname, cmd,
       coalesce(qual, '—')       AS using_expr,
       coalesce(with_check, '—') AS check_expr
FROM   pg_policies
WHERE  schemaname = 'public'
  AND  tablename IN ('instruments', 'cryo_vials', 'reagents', 'wishlist_items', 'bookings')
ORDER  BY tablename, cmd, policyname;

-- Expected: 5 functions, all SECURITY DEFINER with search_path set
SELECT p.proname, p.prosecdef AS security_definer, p.proconfig
FROM   pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE  n.nspname = 'public'
  AND  p.proname IN ('lab_can', 'is_booking_manager', 'adjust_reagent_stock',
                     'enforce_booking_policy', 'protect_instrument_fields', 'protect_lab_user_fields')
ORDER  BY p.proname;
