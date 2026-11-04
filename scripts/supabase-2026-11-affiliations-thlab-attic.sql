-- ============================================================
-- Affiliations "Th-Lab" and "ATTiC" (04/11/2026)
-- ============================================================
-- Two more external groups, so their people are easier to recognise in
-- the Users list. Permissions: like every non-MiMic affiliation except
-- BiomimX, they count as MiMic MSc students (lab_effective_role → 'msc',
-- nothing to change there: its ELSE branch already covers them).
-- Only the CHECK constraint on lab_users.affiliation changes.
-- Re-runnable. A first version spelt it "THLab": the UPDATE below renames
-- any row saved in the meantime (protect_lab_user_fields blocks affiliation
-- changes from the SQL Editor, hence the trigger pause).
-- Client: UserAffiliation / USER_AFFILIATIONS in data/lab-data.ts.

ALTER TABLE lab_users DROP CONSTRAINT IF EXISTS lab_users_affiliation_check;

ALTER TABLE lab_users DISABLE TRIGGER trg_protect_lab_user_fields;
UPDATE lab_users SET affiliation = 'Th-Lab' WHERE affiliation = 'THLab';
ALTER TABLE lab_users ENABLE TRIGGER trg_protect_lab_user_fields;

ALTER TABLE lab_users ADD CONSTRAINT lab_users_affiliation_check
  CHECK (affiliation IN ('MiMic Lab', 'DEIB', 'POLIMI', 'Biomech', 'BiomimX', 'Th-Lab', 'ATTiC', 'External'));

-- Check — expect: check_ok = true, old_spelling_left = 0, thlab_msc = msc, attic_msc = msc
SELECT
  (SELECT pg_get_constraintdef(oid) LIKE '%Th-Lab%ATTiC%' FROM pg_constraint WHERE conname = 'lab_users_affiliation_check') AS check_ok,
  (SELECT count(*) FROM lab_users WHERE affiliation = 'THLab') AS old_spelling_left,
  lab_effective_role('Th-Lab', 'postdoc') AS thlab_msc,
  lab_effective_role('ATTiC', 'researcher') AS attic_msc;
