-- ============================================================
-- MiMic Lab Manager — align lab_users CHECK constraints with the app
-- Run in Supabase → SQL Editor (project vfruyyrpriymhmelgidr).
--
-- Why: lab_users has a lab_users_role_check created before the app gained the
-- researcher / lab_manager / project_manager roles, so inserting those roles
-- fails with "violates check constraint lab_users_role_check".
-- The source of truth is UserRole in data/lab-data.ts (9 roles) plus the
-- affiliation and status unions used by the app.
-- ============================================================

-- 1. What is there now (read-only, for the record)
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM   pg_constraint
WHERE  conrelid = 'lab_users'::regclass AND contype = 'c'
ORDER  BY conname;

-- 2. Any row that would not survive the new constraints
SELECT id, name, email, role, affiliation, status
FROM   lab_users
WHERE  role NOT IN ('admin','pi','researcher','lab_manager','project_manager','postdoc','phd','msc','guest')
   OR  affiliation NOT IN ('MiMic Lab','DEIB','POLIMI','External');

-- 3. Replace the constraints (no-ops kept out of the way: each block reports
--    and moves on if rows would be rejected, so the script never half-applies)
ALTER TABLE lab_users DROP CONSTRAINT IF EXISTS lab_users_role_check;
DO $$
BEGIN
  ALTER TABLE lab_users ADD CONSTRAINT lab_users_role_check
    CHECK (role IN ('admin','pi','researcher','lab_manager','project_manager','postdoc','phd','msc','guest'));
  RAISE NOTICE 'lab_users_role_check added (9 roles).';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'lab_users_role_check NOT added: unexpected roles exist — see query 2.';
END $$;

ALTER TABLE lab_users DROP CONSTRAINT IF EXISTS lab_users_affiliation_check;
DO $$
BEGIN
  ALTER TABLE lab_users ADD CONSTRAINT lab_users_affiliation_check
    CHECK (affiliation IN ('MiMic Lab','DEIB','POLIMI','External'));
  RAISE NOTICE 'lab_users_affiliation_check added.';
EXCEPTION
  WHEN check_violation THEN RAISE NOTICE 'lab_users_affiliation_check NOT added: unexpected affiliations exist — see query 2.';
END $$;

-- lab_users_status_check is already created by supabase-user-profile-fields.sql
-- and matches the app ('active' | 'alumni') — left untouched on purpose.

-- 4. Verify
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM   pg_constraint
WHERE  conrelid = 'lab_users'::regclass AND contype = 'c'
ORDER  BY conname;
