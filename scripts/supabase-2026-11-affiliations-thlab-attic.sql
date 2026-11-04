-- ============================================================
-- Affiliations "THLab" and "ATTiC" (04/11/2026)
-- ============================================================
-- Two more external groups, so their people are easier to recognise in
-- the Users list. Permissions: like every non-MiMic affiliation except
-- BiomimX, they count as MiMic MSc students (lab_effective_role → 'msc',
-- nothing to change there: its ELSE branch already covers them).
-- Only the CHECK constraint on lab_users.affiliation changes. Safe from
-- the SQL Editor: no row is touched, no trigger fires.
-- Client: UserAffiliation / USER_AFFILIATIONS in data/lab-data.ts.

ALTER TABLE lab_users DROP CONSTRAINT IF EXISTS lab_users_affiliation_check;
ALTER TABLE lab_users ADD CONSTRAINT lab_users_affiliation_check
  CHECK (affiliation IN ('MiMic Lab', 'DEIB', 'POLIMI', 'Biomech', 'BiomimX', 'THLab', 'ATTiC', 'External'));

-- Check — expect: check_ok = true, thlab_msc = msc, attic_msc = msc
SELECT
  (SELECT pg_get_constraintdef(oid) LIKE '%THLab%ATTiC%' FROM pg_constraint WHERE conname = 'lab_users_affiliation_check') AS check_ok,
  lab_effective_role('THLab', 'postdoc') AS thlab_msc,
  lab_effective_role('ATTiC', 'researcher') AS attic_msc;
