-- ============================================================
-- Diagnostic: lab_users rows whose link to the auth account is broken
-- (04/11/2026 — an external post-doc could not save her favourites)
-- ============================================================
-- Favourites are saved with an UPDATE of the member's OWN lab_users row
-- (policy lab_users_update: id = current_lab_user_id()). No role is
-- involved: MSc, externals and BiomimX all pass. If the row is linked to
-- a stale auth account (account deleted and re-created), or is unlinked
-- and its email differs in case from the login email, current_lab_user_id()
-- is NULL: the UPDATE touches 0 rows, silently. Reads still work because
-- lab_users_select is open to every authenticated user, so the app looks
-- normal and nothing is ever saved.
--
-- Read-only. Expect 0 rows; every row listed is an account to repair.
SELECT u.name, u.role, u.affiliation, u.status, u.email,
       u.auth_user_id,
       au.id                                   AS auth_id_for_this_email,
       au.last_sign_in_at,
       CASE
         WHEN au.id IS NULL                         THEN 'no auth account with this email'
         WHEN u.auth_user_id IS NULL
          AND u.email <> lower(u.email)             THEN 'unlinked + email not lowercase (claim fails)'
         WHEN u.auth_user_id IS NULL                THEN 'unlinked (links itself at next login)'
         WHEN u.auth_user_id <> au.id               THEN 'linked to a STALE auth account'
       END                                     AS problem,
       cardinality(u.favorite_instrument_ids)  AS n_favourites
  FROM lab_users u
  LEFT JOIN auth.users au ON lower(au.email) = lower(u.email)
 WHERE u.status = 'active'
   AND (au.id IS NULL OR u.auth_user_id IS NULL OR u.auth_user_id <> au.id)
 ORDER BY u.name;

-- ------------------------------------------------------------
-- Repair (run ONLY after reading the list above): point every active row
-- at the auth account that carries its email, and lowercase the email.
-- protect_lab_user_fields blocks auth_user_id changes from the SQL Editor
-- (no JWT → not an admin), hence the trigger pause.
-- ------------------------------------------------------------
-- ALTER TABLE lab_users DISABLE TRIGGER trg_protect_lab_user_fields;
-- UPDATE lab_users u
--    SET auth_user_id = au.id, email = lower(u.email)
--   FROM auth.users au
--  WHERE lower(au.email) = lower(u.email)
--    AND u.status = 'active'
--    AND u.auth_user_id IS DISTINCT FROM au.id;
-- ALTER TABLE lab_users ENABLE TRIGGER trg_protect_lab_user_fields;
-- -- then re-run the SELECT above: expect 0 rows
