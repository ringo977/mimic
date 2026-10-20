-- ============================================================
-- Self-service onboarding of students and guests (20 Oct 2026)
-- ============================================================
-- Before: only an admin could add a lab_users row, and every auth account
-- had to be created by hand (dashboard or create-lab-accounts.mjs).
-- After:
--   1. supervisors (PI, researcher, lab manager, project manager, postdoc,
--      PhD — SUPERVISOR_ROLES in lab-data.ts) may add MSc students and
--      guests themselves (Users page → "Add student"); the row is created
--      with themselves as supervisor, no admin flag, status active.
--      PIs, lab managers and project managers (MEMBER_MANAGER_ROLES) may
--      add any role except admin/PI, choosing the supervisor ("Add member");
--   2. the person then creates their own password on the login page
--      ("Create account") quoting the e-mail AND a 6-character registration
--      code that the app showed to whoever added them. A trigger on
--      auth.users rejects any other sign-up, so opening sign-ups does not
--      open the door, and nobody can grab a colleague's address first;
--   3. lab_signup_precheck(email, code) lets the login page give a readable
--      message BEFORE the sign-up call (Supabase hides trigger errors
--      behind "Database error saving new user");
--   4. deleting a member or archiving them as alumni (Admin Panel) also
--      deletes their login account. Net effect: accounts are created and
--      removed from the app only; the Supabase dashboard is no longer
--      part of onboarding/offboarding.
--
-- DASHBOARD SETTINGS (once, by hand — Authentication → Sign In / Providers):
--   • "Allow new users to sign up": ON
--   • Email provider → "Confirm email": OFF  (the built-in mailer only
--     delivers to project team members; with confirmation on, nobody
--     else would ever receive the link). Sign-up then logs the person in
--     immediately; claim_lab_user() links the row at that first login.
--   • Password: minimum length 8 (the app enforces upper/lower/digit).
--
-- Idempotent. Run after round4b. The accounts script keeps working
-- (it creates lab_users first, so the guard lets those e-mails through).
-- ============================================================

-- ------------------------------------------------------------
-- §1 Who may add whom
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION lab_can_add_students()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_users
    WHERE id = current_lab_user_id()
      AND status = 'active'
      AND role IN ('admin', 'pi', 'researcher', 'lab_manager', 'project_manager', 'postdoc', 'phd')
  );
$$;
REVOKE EXECUTE ON FUNCTION lab_can_add_students() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION lab_can_add_students() TO authenticated;

-- Lab / project managers and PIs register any member except admins and
-- PIs (visiting PhDs, postdocs, …), with any supervisor — without needing
-- the Admin Panel. (Mirror: MEMBER_MANAGER_ROLES in lab-data.ts.)
CREATE OR REPLACE FUNCTION lab_can_add_members()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_users
    WHERE id = current_lab_user_id()
      AND status = 'active'
      AND role IN ('admin', 'pi', 'lab_manager', 'project_manager')
  );
$$;
REVOKE EXECUTE ON FUNCTION lab_can_add_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION lab_can_add_members() TO authenticated;

DROP POLICY IF EXISTS "lab_users_insert" ON lab_users;
CREATE POLICY "lab_users_insert" ON lab_users
  FOR INSERT TO authenticated
  WITH CHECK (
    is_lab_admin()
    OR (
      coalesce(is_admin, false) = false
      AND coalesce(status, 'active') = 'active'
      AND auth_user_id IS NULL
      AND (
        (lab_can_add_members() AND role NOT IN ('admin', 'pi'))
        OR
        (lab_can_add_students() AND role IN ('msc', 'guest') AND supervisor_id = current_lab_user_id())
      )
    )
  );

-- ------------------------------------------------------------
-- §2 Registration codes. Sign-ups are open and e-mail confirmation is
--    off, so the e-mail alone must not be enough: whoever registers the
--    row gets a 6-character code to pass on, and the sign-up must quote
--    it. Codes live in their own table (lab_users is readable by every
--    member) and are deleted as soon as the account is linked.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lab_signup_codes (
  user_id    text PRIMARY KEY REFERENCES lab_users(id) ON DELETE CASCADE,
  code       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE lab_signup_codes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON lab_signup_codes TO authenticated;
DROP POLICY IF EXISTS "signup_codes_select" ON lab_signup_codes;
CREATE POLICY "signup_codes_select" ON lab_signup_codes
  FOR SELECT TO authenticated
  USING (
    is_lab_admin()
    OR EXISTS (SELECT 1 FROM lab_users u WHERE u.id = user_id AND u.supervisor_id = current_lab_user_id())
  );

-- Issue a code for every new row; drop it once the account is linked.
CREATE OR REPLACE FUNCTION public.lab_issue_signup_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.auth_user_id IS NULL THEN
    INSERT INTO lab_signup_codes (user_id, code)
    VALUES (NEW.id, upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)))
    ON CONFLICT (user_id) DO NOTHING;
  ELSIF TG_OP = 'UPDATE' AND NEW.auth_user_id IS NOT NULL THEN
    DELETE FROM lab_signup_codes WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_lab_issue_signup_code ON lab_users;
CREATE TRIGGER trg_lab_issue_signup_code
  AFTER INSERT OR UPDATE OF auth_user_id ON lab_users
  FOR EACH ROW EXECUTE FUNCTION public.lab_issue_signup_code();

-- Backfill: active members who have no login account yet
INSERT INTO lab_signup_codes (user_id, code)
SELECT u.id, upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6))
FROM   lab_users u
WHERE  coalesce(u.status, 'active') = 'active'
AND    u.auth_user_id IS NULL
AND    NOT EXISTS (SELECT 1 FROM auth.users au WHERE lower(au.email) = lower(u.email))
ON CONFLICT (user_id) DO NOTHING;

-- Sign-up guard: e-mail registered AND code quoted (signUp → options.data.signup_code)
CREATE OR REPLACE FUNCTION public.lab_signup_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   public.lab_users u
    JOIN   public.lab_signup_codes c ON c.user_id = u.id
    WHERE  lower(u.email) = lower(NEW.email)
    AND    coalesce(u.status, 'active') = 'active'
    AND    upper(c.code) = upper(trim(coalesce(NEW.raw_user_meta_data ->> 'signup_code', '')))
  ) THEN
    RAISE EXCEPTION 'This e-mail is not registered in the Lab Manager, or the registration code is wrong.'
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lab_signup_guard ON auth.users;
CREATE TRIGGER trg_lab_signup_guard
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.lab_signup_guard();

-- ------------------------------------------------------------
-- §3 Pre-check for the login page (callable while signed out):
--    'ok' | 'unknown' (no such active member) | 'bad_code' | 'has_account'
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.lab_email_registered(text);
CREATE OR REPLACE FUNCTION public.lab_signup_precheck(p_email text, p_code text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM lab_users WHERE lower(email) = lower(trim(p_email)) AND coalesce(status, 'active') = 'active') THEN 'unknown'
    WHEN EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(trim(p_email))) THEN 'has_account'
    WHEN NOT EXISTS (SELECT 1 FROM lab_users u JOIN lab_signup_codes c ON c.user_id = u.id
                     WHERE lower(u.email) = lower(trim(p_email)) AND upper(c.code) = upper(trim(coalesce(p_code, '')))) THEN 'bad_code'
    ELSE 'ok'
  END;
$$;
REVOKE EXECUTE ON FUNCTION public.lab_signup_precheck(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lab_signup_precheck(text, text) TO anon, authenticated;

-- ------------------------------------------------------------
-- §4 Leaving: deleting a member, or archiving them as alumni, in the
--    Admin Panel also deletes the login account (sessions, MFA factors
--    and identities go with it — auth.users cascades). Reactivating an
--    alumnus later = set status back to active; they redo "Create account".
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lab_drop_auth_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tgt lab_users%ROWTYPE;
BEGIN
  tgt := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  IF TG_OP = 'UPDATE' AND NOT (coalesce(NEW.status, 'active') = 'alumni' AND coalesce(OLD.status, 'active') <> 'alumni') THEN
    RETURN NEW;
  END IF;
  DELETE FROM auth.users au
  WHERE  au.id = tgt.auth_user_id
     OR  (tgt.auth_user_id IS NULL AND lower(au.email) = lower(tgt.email));
  IF TG_OP = 'UPDATE' THEN
    NEW.auth_user_id := NULL;   -- the row can be claimed again if reactivated
    RETURN NEW;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_lab_drop_auth_on_delete ON lab_users;
CREATE TRIGGER trg_lab_drop_auth_on_delete
  AFTER DELETE ON lab_users
  FOR EACH ROW EXECUTE FUNCTION public.lab_drop_auth_account();

DROP TRIGGER IF EXISTS trg_lab_drop_auth_on_alumni ON lab_users;
CREATE TRIGGER trg_lab_drop_auth_on_alumni
  BEFORE UPDATE OF status ON lab_users
  FOR EACH ROW EXECUTE FUNCTION public.lab_drop_auth_account();

-- ------------------------------------------------------------
-- Checks
-- ------------------------------------------------------------
-- expect: all true
SELECT
  EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lab_users' AND policyname = 'lab_users_insert'
          AND with_check LIKE '%lab_can_add_members%')                               AS insert_policy_v3,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lab_signup_guard')            AS guard_present,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'lab_signup_precheck')               AS precheck_present,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lab_issue_signup_code')       AS codes_issued,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lab_drop_auth_on_delete')     AS drop_on_delete,
  EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_lab_drop_auth_on_alumni')     AS drop_on_alumni;
-- expect: has_account / unknown
SELECT lab_signup_precheck('marco.rasponi@polimi.it', '') AS known, lab_signup_precheck('nobody@example.org', '') AS unknown;
-- members still waiting to create their account, with the code to give them (expect 0 rows today)
SELECT u.name, u.email, c.code FROM lab_signup_codes c JOIN lab_users u ON u.id = c.user_id ORDER BY u.name;
