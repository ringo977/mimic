-- ============================================================
-- MiMic Lab Manager — Absences & presence (July 2026)
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor. Idempotent.
-- Requires: supabase-security-hardening.sql (is_lab_member/is_lab_admin).
--
-- Implements the storage for the lab absence policy
-- (docs/policy-assenze.html): leave requests with tiered approval.
-- Approval rules are computed in the app; the database guarantees
-- that only admins can approve/reject (trigger below).
-- ============================================================

CREATE TABLE IF NOT EXISTS absences (
  id            text PRIMARY KEY,
  user_id       text NOT NULL,
  user_name     text,
  type          text NOT NULL CHECK (type IN ('hours', 'day_off', 'vacation', 'smart_working', 'sick', 'trip')),
  start_date    text NOT NULL,
  end_date      text NOT NULL,
  start_hour    numeric(4,2),
  end_hour      numeric(4,2),
  notes         text,
  handover      text,
  status        text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'auto_approved', 'approved', 'rejected', 'cancelled')),
  flags         text,
  requested_at  text NOT NULL,
  decided_by    text,
  decided_at    text,
  decision_note text
);

ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "absences_select" ON absences;
DROP POLICY IF EXISTS "absences_insert" ON absences;
DROP POLICY IF EXISTS "absences_update" ON absences;
DROP POLICY IF EXISTS "absences_delete" ON absences;

-- Every member sees all absences (visibility is the point of the feature).
CREATE POLICY "absences_select" ON absences FOR SELECT TO authenticated USING (is_lab_member());
CREATE POLICY "absences_insert" ON absences FOR INSERT TO authenticated WITH CHECK (is_lab_member());
CREATE POLICY "absences_update" ON absences
  FOR UPDATE TO authenticated
  USING (
    user_id IN (SELECT id FROM lab_users WHERE email = auth.jwt() ->> 'email')
    OR is_lab_admin()
  );
CREATE POLICY "absences_delete" ON absences
  FOR DELETE TO authenticated
  USING (
    user_id IN (SELECT id FROM lab_users WHERE email = auth.jwt() ->> 'email')
    OR is_lab_admin()
  );

-- Non-admins cannot self-approve: on INSERT the status can only be
-- pending/auto_approved; on UPDATE they can only cancel (or leave
-- the status untouched while editing notes).
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
    ELSE
      IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'Only supervisors can approve or reject absences';
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

-- Default policy thresholds (editable from Admin → Absences)
INSERT INTO app_settings (key, value)
VALUES (
  'absence_settings',
  '{"autoApproveMaxDays": 2, "noticeDaysShort": 2, "swMonthlyCap": 4, "swMaxConsecutive": 1, "maxConcurrentAbsent": 3, "blackoutPeriods": []}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- Verify:
--   SELECT * FROM absences LIMIT 1;
--   SELECT value FROM app_settings WHERE key = 'absence_settings';
