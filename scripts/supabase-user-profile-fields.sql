-- ============================================================
-- MiMic Lab Manager — User profile fields (July 2026)
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor. Idempotent.
--
-- Adds to lab_users:
--   status                 'active' | 'alumni' (alumni keep their history
--                          but can no longer log in)
--   person_code            codice persona Polimi
--   supervisor_id          supervisor (for MSc students and guests)
--   start_date / end_date  period in the lab
--   training_microfab_*    microfabrication training (done + date)
--   training_bio_*         biological training (done + date)
--
-- Also extends the anti-escalation trigger: the new management fields
-- (plus certifications, which gate instrument bookings) can only be
-- changed by admins — not even on one's own row.
-- ============================================================

-- Present in supabase-schema-reference.sql but missing on databases
-- created from the original schema (pre-July 2026).
ALTER TABLE lab_users ADD COLUMN IF NOT EXISTS abbreviation text;

ALTER TABLE lab_users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';
ALTER TABLE lab_users ADD COLUMN IF NOT EXISTS person_code text;
ALTER TABLE lab_users ADD COLUMN IF NOT EXISTS supervisor_id text;
ALTER TABLE lab_users ADD COLUMN IF NOT EXISTS start_date text;
ALTER TABLE lab_users ADD COLUMN IF NOT EXISTS end_date text;
ALTER TABLE lab_users ADD COLUMN IF NOT EXISTS training_microfab_done boolean NOT NULL DEFAULT false;
ALTER TABLE lab_users ADD COLUMN IF NOT EXISTS training_microfab_date text;
ALTER TABLE lab_users ADD COLUMN IF NOT EXISTS training_bio_done boolean NOT NULL DEFAULT false;
ALTER TABLE lab_users ADD COLUMN IF NOT EXISTS training_bio_date text;

-- Sanity check on status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lab_users_status_check'
  ) THEN
    ALTER TABLE lab_users ADD CONSTRAINT lab_users_status_check CHECK (status IN ('active', 'alumni'));
  END IF;
END $$;

-- ============================================================
-- Extended anti-escalation trigger
-- (replaces the version from supabase-security-hardening.sql)
-- ============================================================
CREATE OR REPLACE FUNCTION protect_lab_user_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_lab_admin() THEN
    IF NEW.role                    IS DISTINCT FROM OLD.role
    OR NEW.is_admin                IS DISTINCT FROM OLD.is_admin
    OR NEW.email                   IS DISTINCT FROM OLD.email
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
      RAISE EXCEPTION 'Only lab admins can change management fields (role, status, trainings, certifications, ...)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_lab_user_fields ON lab_users;
CREATE TRIGGER trg_protect_lab_user_fields
  BEFORE UPDATE ON lab_users
  FOR EACH ROW EXECUTE FUNCTION protect_lab_user_fields();

-- Alumni must not access the app: is_lab_member() now requires active status.
CREATE OR REPLACE FUNCTION is_lab_member()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_users
    WHERE email = auth.jwt() ->> 'email'
      AND status = 'active'
  );
$$;

-- Same for admin rights: an archived admin keeps nothing.
CREATE OR REPLACE FUNCTION is_lab_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_users
    WHERE email = auth.jwt() ->> 'email'
      AND status = 'active'
      AND (is_admin = true OR role IN ('admin', 'pi'))
  );
$$;

-- Verify:
--   SELECT column_name FROM information_schema.columns WHERE table_name = 'lab_users';
