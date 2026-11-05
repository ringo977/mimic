-- ============================================================
-- Certifications: Researchers only for their own instruments (05/11/2026)
-- ============================================================
-- Marco: "perché Alberto Mantegazza può dare la certificazione di tutti gli
-- strumenti e non solo quello per cui è responsabile?" → option 1:
--   · Lab Manager / Project Manager / PI / Admin (flag or role) grant ANY
--     certification (unchanged);
--   · Researcher grants only the certifications of the instruments whose
--     responsible they are (a Researcher without instruments grants none);
--   · PhD, post-doc, MSc, externals: none (as since 03/11).
-- Trainings (microfab, bio) are untouched: whole staff incl. Researchers
-- (lab_can_grant_training v3). lab_is_granter v2 still opens the row for the
-- staff; the trigger protect_lab_user_fields v3 then calls
-- lab_can_grant_certification(cert_id) for every certification touched, so
-- this one function is the whole change.
-- Client: canGrantCertification(actor, certId, instruments) in data/lab-data.ts.
--
-- Safe to run from the SQL Editor: CREATE OR REPLACE FUNCTION only.
-- ============================================================

-- lab_can_grant_certification v3
CREATE OR REPLACE FUNCTION lab_can_grant_certification(p_cert_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p_cert_id IS NOT NULL AND (
    -- staff: any certification
    lab_is_pi_or_admin() OR EXISTS (
      SELECT 1 FROM lab_users u, lab_effective_role(u.affiliation, u.role) AS r
      WHERE u.status = 'active'
        AND (u.auth_user_id = auth.uid()
             OR (u.auth_user_id IS NULL AND u.email = auth.jwt() ->> 'email'))
        AND r IN ('admin', 'pi', 'lab_manager', 'project_manager')
    )
    -- researcher: only the certifications of the instruments they look after
    OR EXISTS (
      SELECT 1
        FROM lab_users u
        JOIN instruments i ON i.responsible_user_id = u.id
       WHERE u.status = 'active'
         AND (u.auth_user_id = auth.uid()
              OR (u.auth_user_id IS NULL AND u.email = auth.jwt() ->> 'email'))
         AND lab_effective_role(u.affiliation, u.role) = 'researcher'
         AND coalesce(i.certification_id, i.id) = p_cert_id
    )
  );
$$;
REVOKE ALL ON FUNCTION lab_can_grant_certification(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lab_can_grant_certification(text) TO authenticated;

-- ------------------------------------------------------------
-- Checks — expect: cert_v3 = true, guard_still_v3 = true, then the
-- Researchers with the certifications they may now grant
-- ------------------------------------------------------------
SELECT
  (SELECT prosrc LIKE '%responsible_user_id%' AND prosrc LIKE '%''researcher''%' AND prosrc NOT LIKE '%lab_can_grant_training%'
     FROM pg_proc WHERE proname = 'lab_can_grant_certification')                                                   AS cert_v3,
  (SELECT prosrc LIKE '%lab_can_grant_certification%' FROM pg_proc WHERE proname = 'protect_lab_user_fields')       AS guard_still_v3;

SELECT u.name, string_agg(DISTINCT coalesce(i.certification_id, i.id), ', ' ORDER BY coalesce(i.certification_id, i.id)) AS may_certify_for
  FROM lab_users u
  LEFT JOIN instruments i ON i.responsible_user_id = u.id
 WHERE u.status = 'active' AND NOT u.is_admin AND lab_effective_role(u.affiliation, u.role) = 'researcher'
 GROUP BY u.name ORDER BY u.name;
