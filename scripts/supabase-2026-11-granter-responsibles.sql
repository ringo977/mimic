-- ============================================================
-- Certifications by instrument responsibles: open the row too (16/11/2026)
-- ============================================================
-- Marco: Mattia Ballerini (Post-Doc, responsible of the confocal) grants the
-- confocal certification, the card shows it, but after a reload it is gone;
-- when an Admin does it, it stays.
--
-- Cause: two gates, only one was opened on 05/11.
--   1. policy lab_users_update v3: the row is writable by its owner, the
--      Admin Panel, or lab_is_granter();
--   2. trigger protect_lab_user_fields v3: which columns / certifications.
-- supabase-2026-11-cert-responsibles-own-instruments.sql let Post-Docs and
-- Researchers through gate 2 (lab_can_grant_certification v4) but
-- lab_is_granter was still v2 = staff only (03/11), so for a Post-Doc gate 1
-- stayed shut: the UPDATE matched 0 rows, WITHOUT an error, and the app
-- believed it had saved. (Researchers were not affected: they are staff.)
--
-- Fix: lab_is_granter v3 = staff, or a Post-Doc / Researcher who is the
-- responsible of at least one instrument. Nothing else changes: the trigger
-- still limits them to the certifications of their own instruments, no
-- trainings, no other column, not on themselves.
-- Client: updateLabUser now reports an update that touched no row.
--
-- Safe to run from the SQL Editor: CREATE OR REPLACE FUNCTION only.
-- ============================================================

CREATE OR REPLACE FUNCTION lab_is_granter()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT lab_can_grant_training('microfab')
      OR EXISTS (
        SELECT 1
          FROM lab_users u
          JOIN instruments i ON i.responsible_user_id = u.id
         WHERE u.status = 'active'
           AND (u.auth_user_id = auth.uid()
                OR (u.auth_user_id IS NULL AND u.email = auth.jwt() ->> 'email'))
           AND lab_effective_role(u.affiliation, u.role) IN ('postdoc', 'researcher')
      );
$$;
REVOKE ALL ON FUNCTION lab_is_granter() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lab_is_granter() TO authenticated;

-- ------------------------------------------------------------
-- Checks — expect: granter_v3 = true, cert_v4 = true, guard_v3 = true,
-- policy_v3 = true; then the Post-Docs for whom the row is now open, with
-- the instruments they may certify for (Mattia Ballerini → confocal)
-- ------------------------------------------------------------
SELECT
  (SELECT prosrc LIKE '%responsible_user_id%' AND prosrc LIKE '%lab_can_grant_training%' FROM pg_proc WHERE proname = 'lab_is_granter')      AS granter_v3,
  (SELECT prosrc LIKE '%responsible_user_id%' AND prosrc LIKE '%''postdoc'', ''researcher''%' FROM pg_proc WHERE proname = 'lab_can_grant_certification') AS cert_v4,
  (SELECT prosrc LIKE '%lab_can_grant_certification%' FROM pg_proc WHERE proname = 'protect_lab_user_fields')                             AS guard_v3,
  (SELECT qual LIKE '%lab_is_granter%' FROM pg_policies WHERE tablename = 'lab_users' AND policyname = 'lab_users_update')                 AS policy_v3;

SELECT u.name, u.role, u.affiliation, string_agg(i.name, ', ' ORDER BY i.name) AS may_certify_for
  FROM lab_users u
  JOIN instruments i ON i.responsible_user_id = u.id
 WHERE u.status = 'active' AND lab_effective_role(u.affiliation, u.role) = 'postdoc'
 GROUP BY u.name, u.role, u.affiliation ORDER BY u.name;
