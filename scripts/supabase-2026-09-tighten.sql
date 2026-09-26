-- ============================================================
-- MiMic Lab Manager — September 2026 tightening migration
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor. Idempotent.
-- Run LAST, after every other script (see supabase-schema-reference.sql).
--
-- Closes the gaps found by the September 2026 assessment (§3.3, §4.1):
--   1. lab_users.auth_user_id: identity now tied to auth.uid(), not just
--      the JWT email (email kept as fallback for unlinked rows).
--   2. Bookings / absences / log entries can only be created in one's own
--      name (admins excepted). Updates can no longer reassign user_id.
--   3. Guests cannot create bookings (server-side canBook).
--   4. Wishlist approvals restricted to approver roles via trigger.
--   5. Approved/decided absences are frozen for non-admins (only a
--      cancellation is allowed; previously dates/type were editable).
--   6. protect_lab_user_fields also guards id, affiliation, projects,
--      auth_user_id (a member could self-assign "MiMic Lab" and gain the
--      full client-side permission set, or change their own id).
--   7. Only the owner (or an admin) can delete a cryo vial.
--   8. requires_certification on instruments: admin-only via trigger.
--   9. CHECK constraints: end_hour > start_hour, current_stock >= 0.
--
-- NOTE on foreign keys: we deliberately do NOT add FKs from bookings /
-- absences / log_entries to lab_users. History rows must survive a user
-- deletion (user_name is denormalised for that), and "orphan adoption"
-- is already impossible: lab_users.id is admin-only (trigger below) and
-- inserts are bound to the caller's id by the WITH CHECK policies.
-- ============================================================

-- ============================================================
-- 1. auth_user_id on lab_users + backfill + auto-link
-- ============================================================
ALTER TABLE lab_users ADD COLUMN IF NOT EXISTS auth_user_id uuid;

-- Idempotency: on a RE-RUN the protect_lab_user_fields trigger (installed by
-- a previous run, section 3) would abort the backfill UPDATE below — in the
-- SQL editor auth.uid() is NULL, so is_lab_admin() is false. Drop it first;
-- section 3 recreates it.
DROP TRIGGER IF EXISTS trg_protect_lab_user_fields ON lab_users;

-- Backfill from auth.users by email (runs as postgres in the SQL editor)
UPDATE lab_users lu
SET auth_user_id = au.id
FROM auth.users au
WHERE lu.auth_user_id IS NULL
  AND lower(lu.email) = lower(au.email);

-- Auto-link new/updated rows to the matching auth account, if it exists.
-- (If the auth account is created later, the email fallback in the helper
-- functions keeps working until this fires on the next row update.)
CREATE OR REPLACE FUNCTION link_lab_user_auth()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.auth_user_id IS NULL THEN
    SELECT id INTO NEW.auth_user_id FROM auth.users WHERE lower(email) = lower(NEW.email) LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Fire on EVERY insert/update (not just email changes): a lab_users row
-- created before its auth account would otherwise stay email-based until an
-- admin re-saved the email. The function is a no-op once linked.
DROP TRIGGER IF EXISTS trg_link_lab_user_auth ON lab_users;
CREATE TRIGGER trg_link_lab_user_auth
  BEFORE INSERT OR UPDATE ON lab_users
  FOR EACH ROW EXECUTE FUNCTION link_lab_user_auth();

-- ============================================================
-- 2. Helper functions — auth.uid() first, email as fallback
--    (supersede the versions in supabase-user-profile-fields.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION is_lab_member()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_users
    WHERE status = 'active'
      AND (auth_user_id = auth.uid()
           OR (auth_user_id IS NULL AND email = auth.jwt() ->> 'email'))
  );
$$;

CREATE OR REPLACE FUNCTION is_lab_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_users
    WHERE status = 'active'
      AND (auth_user_id = auth.uid()
           OR (auth_user_id IS NULL AND email = auth.jwt() ->> 'email'))
      AND (is_admin = true OR role IN ('admin', 'pi'))
  );
$$;

-- lab_users.id of the caller (NULL if not an active member)
CREATE OR REPLACE FUNCTION current_lab_user_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM lab_users
  WHERE status = 'active'
    AND (auth_user_id = auth.uid()
         OR (auth_user_id IS NULL AND email = auth.jwt() ->> 'email'))
  LIMIT 1;
$$;

-- Roles that may move wishlist items through the approval workflow
-- (mirrors canApproveOrders in data/lab-data.ts)
CREATE OR REPLACE FUNCTION is_lab_approver()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_users
    WHERE status = 'active'
      AND (auth_user_id = auth.uid()
           OR (auth_user_id IS NULL AND email = auth.jwt() ->> 'email'))
      AND (is_admin = true OR role IN ('admin', 'pi', 'lab_manager', 'project_manager'))
  );
$$;

-- Server-side canBook: active member whose role is not guest
CREATE OR REPLACE FUNCTION lab_can_book()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_users
    WHERE status = 'active'
      AND (auth_user_id = auth.uid()
           OR (auth_user_id IS NULL AND email = auth.jwt() ->> 'email'))
      AND role <> 'guest'
  );
$$;

-- ============================================================
-- 3. Extended anti-escalation trigger on lab_users
--    (supersedes the version in supabase-user-profile-fields.sql)
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
    -- login). NOTE: is_lab_admin() reads auth.uid() from the caller's JWT
    -- even inside SECURITY DEFINER functions, so without this exemption
    -- non-admins could never get linked. Email itself stays protected
    -- (checked above), so a user can't swap email and link elsewhere.
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
    OR NEW.certifications          IS DISTINCT FROM OLD.certifications THEN
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
-- 4. Bookings — own name only, guests excluded, no reassignment
-- ============================================================
DROP POLICY IF EXISTS "bookings_insert" ON bookings;
CREATE POLICY "bookings_insert" ON bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    is_lab_admin()
    OR (user_id = current_lab_user_id() AND lab_can_book())
  );

DROP POLICY IF EXISTS "bookings_update" ON bookings;
CREATE POLICY "bookings_update" ON bookings
  FOR UPDATE TO authenticated
  USING (user_id = current_lab_user_id() OR is_lab_admin())
  WITH CHECK (user_id = current_lab_user_id() OR is_lab_admin());

DROP POLICY IF EXISTS "bookings_delete" ON bookings;
CREATE POLICY "bookings_delete" ON bookings
  FOR DELETE TO authenticated
  USING (user_id = current_lab_user_id() OR is_lab_admin());

-- ============================================================
-- 5. Absences — own name only, decided rows frozen for non-admins
-- ============================================================
DROP POLICY IF EXISTS "absences_insert" ON absences;
CREATE POLICY "absences_insert" ON absences
  FOR INSERT TO authenticated
  WITH CHECK (
    is_lab_admin()
    OR user_id = current_lab_user_id()
  );

DROP POLICY IF EXISTS "absences_update" ON absences;
CREATE POLICY "absences_update" ON absences
  FOR UPDATE TO authenticated
  USING (user_id = current_lab_user_id() OR is_lab_admin())
  WITH CHECK (user_id = current_lab_user_id() OR is_lab_admin());

DROP POLICY IF EXISTS "absences_delete" ON absences;
CREATE POLICY "absences_delete" ON absences
  FOR DELETE TO authenticated
  USING (user_id = current_lab_user_id() OR is_lab_admin());

-- Supersedes the version in supabase-absences.sql: besides the status
-- rules, non-admins can no longer edit the substance (dates, type, hours)
-- of a request that has already been decided/auto-approved — the only
-- allowed change is cancelling it.
CREATE OR REPLACE FUNCTION protect_absence_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_lab_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status NOT IN ('pending', 'auto_approved') THEN
        RAISE EXCEPTION 'Only supervisors can create approved/rejected absences';
      END IF;
      IF NEW.decided_by IS NOT NULL OR NEW.decision_note IS NOT NULL THEN
        RAISE EXCEPTION 'Only supervisors can set decision fields';
      END IF;
    ELSE
      IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'Only supervisors can approve or reject absences';
      END IF;
      IF OLD.status <> 'pending' THEN
        -- decided/auto-approved: freeze everything except a cancellation
        IF NEW.type       IS DISTINCT FROM OLD.type
        OR NEW.start_date  IS DISTINCT FROM OLD.start_date
        OR NEW.end_date    IS DISTINCT FROM OLD.end_date
        OR NEW.start_hour  IS DISTINCT FROM OLD.start_hour
        OR NEW.end_hour    IS DISTINCT FROM OLD.end_hour
        OR NEW.user_id     IS DISTINCT FROM OLD.user_id
        OR NEW.decided_by  IS DISTINCT FROM OLD.decided_by
        OR NEW.decided_at  IS DISTINCT FROM OLD.decided_at THEN
          RAISE EXCEPTION 'This absence has already been decided — only a cancellation is allowed. Ask a supervisor to change it.';
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_absence_status_ins ON absences;
CREATE TRIGGER trg_protect_absence_status_ins
  BEFORE INSERT ON absences
  FOR EACH ROW EXECUTE FUNCTION protect_absence_status();

DROP TRIGGER IF EXISTS trg_protect_absence_status_upd ON absences;
CREATE TRIGGER trg_protect_absence_status_upd
  BEFORE UPDATE ON absences
  FOR EACH ROW EXECUTE FUNCTION protect_absence_status();

-- ============================================================
-- 6. Log entries — written in one's own name only
-- ============================================================
DROP POLICY IF EXISTS "log_entries_insert" ON log_entries;
CREATE POLICY "log_entries_insert" ON log_entries
  FOR INSERT TO authenticated
  WITH CHECK (
    is_lab_admin()
    OR (is_lab_member() AND user_id = current_lab_user_id())
  );

-- ============================================================
-- 7. Wishlist — approval workflow restricted to approver roles
-- ============================================================
CREATE OR REPLACE FUNCTION protect_wishlist_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_lab_approver() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status IS DISTINCT FROM 'pending' OR NEW.approved_by IS NOT NULL THEN
        RAISE EXCEPTION 'New wishlist requests must start as pending';
      END IF;
    ELSE
      IF NEW.status      IS DISTINCT FROM OLD.status
      OR NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
        RAISE EXCEPTION 'Only approver roles can change the status of a wishlist item';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_wishlist_status_ins ON wishlist_items;
CREATE TRIGGER trg_protect_wishlist_status_ins
  BEFORE INSERT ON wishlist_items
  FOR EACH ROW EXECUTE FUNCTION protect_wishlist_status();

DROP TRIGGER IF EXISTS trg_protect_wishlist_status_upd ON wishlist_items;
CREATE TRIGGER trg_protect_wishlist_status_upd
  BEFORE UPDATE ON wishlist_items
  FOR EACH ROW EXECUTE FUNCTION protect_wishlist_status();

-- ============================================================
-- 8. Cryo vials — delete restricted to owner or admin
-- ============================================================
DROP POLICY IF EXISTS "cryo_vials_delete" ON cryo_vials;
CREATE POLICY "cryo_vials_delete" ON cryo_vials
  FOR DELETE TO authenticated
  USING (user_id = current_lab_user_id() OR is_lab_admin());

-- ============================================================
-- 9. Instruments — requires_certification is admin-only
-- ============================================================
CREATE OR REPLACE FUNCTION protect_instrument_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_lab_admin() THEN
    IF NEW.requires_certification IS DISTINCT FROM OLD.requires_certification THEN
      RAISE EXCEPTION 'Only lab admins can change the certification requirement of an instrument';
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
-- 10. CHECK constraints (wrapped: existing bad rows produce a NOTICE,
--     not a failed migration — fix them and re-run)
-- ============================================================
DO $$
BEGIN
  ALTER TABLE bookings ADD CONSTRAINT bookings_hours_check CHECK (end_hour > start_hour);
  RAISE NOTICE 'bookings_hours_check added.';
EXCEPTION
  WHEN duplicate_object THEN RAISE NOTICE 'bookings_hours_check already exists — skipped.';
  WHEN check_violation THEN RAISE NOTICE 'bookings_hours_check NOT added: rows with end_hour <= start_hour exist. Find them with: SELECT * FROM bookings WHERE end_hour <= start_hour;';
END $$;

DO $$
BEGIN
  ALTER TABLE reagents ADD CONSTRAINT reagents_stock_check CHECK (current_stock >= 0);
  RAISE NOTICE 'reagents_stock_check added.';
EXCEPTION
  WHEN duplicate_object THEN RAISE NOTICE 'reagents_stock_check already exists — skipped.';
  WHEN check_violation THEN RAISE NOTICE 'reagents_stock_check NOT added: rows with negative stock exist. Find them with: SELECT * FROM reagents WHERE current_stock < 0;';
END $$;

DO $$
BEGIN
  ALTER TABLE absences ADD CONSTRAINT absences_dates_check CHECK (end_date >= start_date);
  RAISE NOTICE 'absences_dates_check added.';
EXCEPTION
  WHEN duplicate_object THEN RAISE NOTICE 'absences_dates_check already exists — skipped.';
  WHEN check_violation THEN RAISE NOTICE 'absences_dates_check NOT added: rows with end_date < start_date exist.';
END $$;

-- ============================================================
-- 12. Self-link at login — claim_lab_user()
-- ============================================================
-- The backfill above and trg_link_lab_user_auth only link a lab_users row
-- when an auth account with the same email ALREADY exists. For rows created
-- before their auth account, nothing fires at login. The app calls this RPC
-- right after sign-in when it had to fall back to the email lookup.
-- Safe because it only links the row whose email equals the caller's
-- verified JWT email. protect_lab_user_fields (section 3) explicitly allows
-- this first-link case — it must, since is_lab_admin() sees the caller's
-- auth.uid() even inside SECURITY DEFINER code.
CREATE OR REPLACE FUNCTION claim_lab_user()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE lab_users
  SET auth_user_id = auth.uid()
  WHERE auth_user_id IS NULL
    AND status = 'active'
    AND lower(email) = lower(auth.jwt() ->> 'email');
$$;
REVOKE EXECUTE ON FUNCTION claim_lab_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION claim_lab_user() TO authenticated;

-- ============================================================
-- DONE! Verify with:
--   SELECT count(*) AS linked FROM lab_users WHERE auth_user_id IS NOT NULL;
--   SELECT tablename, policyname FROM pg_policies ORDER BY tablename;
--   SELECT tgname FROM pg_trigger WHERE NOT tgisinternal ORDER BY tgname;
-- ============================================================
