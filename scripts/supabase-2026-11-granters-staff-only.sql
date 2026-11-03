-- ============================================================
-- Trainings and certifications: granted by the staff only (03/11/2026)
-- ============================================================
-- Marco: a PhD student could put / remove certifications and trainings on
-- other PhD students. From now on only Researchers, Lab Managers, Project
-- Managers, PIs (and the Admin flag) grant or revoke:
--   · the microfabrication training   (was: PhD and up)
--   · the biological training          (was: Researcher / Lab Manager and up;
--                                       Project Manager added)
--   · instrument certifications        (was: PI / Admin, or the responsible
--                                       of the instrument — a PhD or post-doc
--                                       responsible could certify others)
-- Effective role (lab_effective_role): BiomimX = PhD → cannot grant.
-- Responsibles keep full control of the BOOKINGS of their instrument.
--
-- Safe to run from the SQL Editor: only CREATE OR REPLACE FUNCTION, no row
-- is touched, no trigger fires. protect_lab_user_fields v3 and the policy
-- lab_users_update v3 call these functions, so nothing else changes.
-- Client: GRANTER_ROLES / isGranter() in data/lab-data.ts.
-- ============================================================

-- lab_can_grant_training v3 — same staff set for both kinds (p_kind kept
-- for the callers in protect_lab_user_fields; unknown kinds → false)
CREATE OR REPLACE FUNCTION lab_can_grant_training(p_kind text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p_kind IN ('microfab', 'bio') AND (
    lab_is_pi_or_admin() OR EXISTS (
      SELECT 1 FROM lab_users u, lab_effective_role(u.affiliation, u.role) AS r
      WHERE u.status = 'active'
        AND (u.auth_user_id = auth.uid()
             OR (u.auth_user_id IS NULL AND u.email = auth.jwt() ->> 'email'))
        AND r IN ('admin', 'pi', 'researcher', 'lab_manager', 'project_manager')
    )
  );
$$;
REVOKE ALL ON FUNCTION lab_can_grant_training(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lab_can_grant_training(text) TO authenticated;

-- lab_can_grant_certification v2 — staff, whatever the instrument
-- (p_cert_id kept for the caller; the responsible exception is gone)
CREATE OR REPLACE FUNCTION lab_can_grant_certification(p_cert_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p_cert_id IS NOT NULL AND lab_can_grant_training('microfab');
$$;
REVOKE ALL ON FUNCTION lab_can_grant_certification(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lab_can_grant_certification(text) TO authenticated;

-- lab_is_granter v2 — opens the lab_users row for the staff only (the
-- trigger then limits WHICH columns may change)
CREATE OR REPLACE FUNCTION lab_is_granter()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT lab_can_grant_training('microfab');
$$;
REVOKE ALL ON FUNCTION lab_is_granter() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lab_is_granter() TO authenticated;

-- ------------------------------------------------------------
-- Checks — expect: training_v3 = true, cert_v2 = true, granter_v2 = true,
-- guard_still_v3 = true, policy_still_v3 = true
-- ------------------------------------------------------------
SELECT
  (SELECT prosrc LIKE '%project_manager%' AND prosrc NOT LIKE '%''phd''%' FROM pg_proc WHERE proname = 'lab_can_grant_training')           AS training_v3,
  (SELECT prosrc NOT LIKE '%responsible_user_id%' FROM pg_proc WHERE proname = 'lab_can_grant_certification')                          AS cert_v2,
  (SELECT prosrc NOT LIKE '%responsible_user_id%' FROM pg_proc WHERE proname = 'lab_is_granter')                                       AS granter_v2,
  (SELECT prosrc LIKE '%lab_can_grant_certification%' FROM pg_proc WHERE proname = 'protect_lab_user_fields')                          AS guard_still_v3,
  (SELECT qual LIKE '%lab_is_granter%' FROM pg_policies WHERE tablename = 'lab_users' AND policyname = 'lab_users_update')              AS policy_still_v3;

-- Who can grant from now on (active members, staff by effective role or Admin flag)
SELECT u.name, u.role, u.affiliation, u.is_admin
  FROM lab_users u
 WHERE u.status = 'active'
   AND (u.is_admin OR lab_effective_role(u.affiliation, u.role) IN ('admin', 'pi', 'researcher', 'lab_manager', 'project_manager'))
 ORDER BY u.name;
