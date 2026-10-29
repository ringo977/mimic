-- ============================================================
-- MiMic Lab Manager — affiliation "BiomimX" (29 October 2026)
-- ============================================================
-- Run in Supabase → SQL Editor AFTER supabase-2026-10-lab-assistant.sql.
-- Idempotent. Like every non-MiMic affiliation, BiomimX members have the
-- permissions of a MiMic MSc whatever their role (no server change needed:
-- lab_can v5 & co. test `affiliation = 'MiMic Lab'`, not the list).
-- Mirrors USER_AFFILIATIONS in data/lab-data.ts.

ALTER TABLE lab_users DROP CONSTRAINT IF EXISTS lab_users_affiliation_check;
ALTER TABLE lab_users ADD CONSTRAINT lab_users_affiliation_check
  CHECK (affiliation IN ('MiMic Lab', 'DEIB', 'POLIMI', 'Biomech', 'BiomimX', 'External'));

-- expect: true
SELECT pg_get_constraintdef(oid) LIKE '%BiomimX%' AS biomimx_ok
FROM pg_constraint WHERE conname = 'lab_users_affiliation_check';
