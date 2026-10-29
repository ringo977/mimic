-- ============================================================
-- MiMic Lab Manager — absence requests are for MiMic Lab members (29 October 2026)
-- ============================================================
-- Run in Supabase → SQL Editor AFTER supabase-2026-10-biomimx.sql. Idempotent.
--
-- Members of every other affiliation (BiomimX included, whatever their
-- effective role) see the Absences calendar but cannot file requests.
-- MiMic MSc students and guests never could (page hidden) — now the server
-- says so too. The Admin flag / Admin Panel keeps inserting for anybody.
-- Mirrors canRequestAbsences() in data/lab-data.ts.
-- ============================================================

CREATE OR REPLACE FUNCTION lab_can_request_absences()
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
      AND u.role NOT IN ('msc', 'guest')
  );
$$;
REVOKE ALL ON FUNCTION lab_can_request_absences() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lab_can_request_absences() TO authenticated;

-- absences_insert v3 (v2 in 2026-09-tighten.sql: own name or admin)
DROP POLICY IF EXISTS "absences_insert" ON absences;
CREATE POLICY "absences_insert" ON absences
  FOR INSERT TO authenticated
  WITH CHECK (
    is_lab_admin()
    OR (user_id = current_lab_user_id() AND lab_can_request_absences())
  );

-- Checks: expect true; then the members who can NOT request (externals, msc, guests)
SELECT with_check LIKE '%lab_can_request_absences%' AS absences_insert_v3
FROM pg_policies WHERE tablename = 'absences' AND policyname = 'absences_insert';

SELECT name, role, affiliation
FROM lab_users
WHERE status = 'active' AND NOT (affiliation = 'MiMic Lab' AND role NOT IN ('msc', 'guest'))
ORDER BY affiliation, name;
