-- ============================================================
-- MiMic Lab Manager — beta feedback, round 1 (28 Sep 2026)
-- ============================================================
-- Run in Supabase → SQL Editor. Idempotent: safe to re-run.
-- Run AFTER supabase-2026-09-fix-assessment.sql and
-- supabase-2026-09-reagent-kind.sql (redefines lab_can and a cryo policy).
--
-- From the testers (Mattia, Alberto, Stefania) and Marco's decisions:
--   §1 imported reagents had max_stock = current_stock → every restock and
--      every "prepare working solution" failed ("exceeds the maximum").
--      Max becomes 0 = no limit; Stefania can set a real max where useful.
--   §2 antibodies "Box 1" / "Box 2" are the two 9×9 racks kept inside the
--      Fluorescence Box → merge into it.
--   §3 antibodies split into Primary / Secondary (as in Stefania's sheet).
--   §4 nine more stock ↔ working pairs marked "(STOCK)" in the name.
--   §5 anyone with manage_cryo may withdraw (thaw) any vial — the log
--      records who did it. Editing/moving stays owner + admin/PI.
--   §6 wishlist approval: PI and admins only (lab/project managers no more).
--   §7 verification queries for the two open questions (vial owner ids,
--      Mattia's certifications).
-- ============================================================

-- ------------------------------------------------------------
-- §1 No maximum on the imported inventory (ids rg-… come from the import)
-- ------------------------------------------------------------
UPDATE reagents
SET    max_stock = 0
WHERE  id LIKE 'rg-%'
  AND  max_stock = current_stock;

-- ------------------------------------------------------------
-- §2 Box 1 / Box 2 → Fluorescence Box (Fridge +4 °C MiMic)
-- ------------------------------------------------------------
UPDATE reagents r
SET    box_id   = f.id,
       location = su.name || ' · ' || f.label
FROM   storage_units su
JOIN   storage_boxes f ON f.storage_unit_id = su.id AND f.label = 'Fluorescence Box'
JOIN   storage_boxes b ON b.storage_unit_id = su.id AND b.label IN ('Box 1', 'Box 2')
WHERE  su.name = 'Fridge +4 °C MiMic'
  AND  r.box_id = b.id;

DELETE FROM storage_boxes b
USING  storage_units su
WHERE  b.storage_unit_id = su.id
  AND  su.name = 'Fridge +4 °C MiMic'
  AND  b.label IN ('Box 1', 'Box 2')
  AND  NOT EXISTS (SELECT 1 FROM reagents r WHERE r.box_id = b.id)
  AND  NOT EXISTS (SELECT 1 FROM cryo_vials v WHERE v.box_id = b.id);

-- ------------------------------------------------------------
-- §3 Primary / Secondary antibodies
--    Secondary = "<host> anti-<species> Ig…" or the word "Secondary".
--    Conjugated FACS antibodies (anti-human CD…) are primaries.
-- ------------------------------------------------------------
UPDATE reagents
SET    category = 'Secondary Antibodies'
WHERE  category = 'Antibodies'
  AND  name ~* '((goat|donkey|chicken|sheep|rabbit|mouse)\s+anti[- ]?(mouse|rabbit|rat|goat|chicken|guinea|human|sheep)|secondary antibody)';

UPDATE reagents
SET    category = 'Primary Antibodies'
WHERE  category = 'Antibodies';

-- ------------------------------------------------------------
-- §4 "(STOCK)" pairs — name "X (STOCK) […]" is the stock of "X […]"
--    (the classification trigger only lets managers change kind; the
--    SQL editor has no auth context, so it is paused for this step)
-- ------------------------------------------------------------
ALTER TABLE reagents DISABLE TRIGGER trg_protect_reagent_fields;

UPDATE reagents
SET    kind = 'stock'
WHERE  kind = 'item'
  AND  name LIKE '%(STOCK)%';

UPDATE reagents w
SET    kind = 'working',
       derived_from_id = coalesce(w.derived_from_id, s.id)
FROM   reagents s
WHERE  s.kind = 'stock'
  AND  s.name LIKE '%(STOCK)%'
  AND  w.id <> s.id
  AND  w.kind IN ('item', 'working')
  AND  w.name = replace(s.name, ' (STOCK)', '')
  AND  w.derived_from_id IS NULL;

ALTER TABLE reagents ENABLE TRIGGER trg_protect_reagent_fields;

-- ------------------------------------------------------------
-- §5 Thawing a vial: anyone with manage_cryo
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "cryo_vials_delete" ON cryo_vials;
CREATE POLICY "cryo_vials_delete" ON cryo_vials
  FOR DELETE TO authenticated
  USING (is_lab_admin() OR lab_can('manage_cryo'));

-- ------------------------------------------------------------
-- §6 approve_orders → PI / admin only (same body as fix-assessment
--    otherwise; the matrix in data/lab-data.ts is updated to match)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION lab_can(perm text)
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
      AND (
        u.is_admin = true
        OR u.role IN ('admin', 'pi')
        OR CASE perm
             WHEN 'withdraw_reagents' THEN
               u.role NOT IN ('msc', 'guest')
             WHEN 'add_reagents' THEN
               CASE WHEN u.affiliation = 'MiMic Lab'
                    THEN u.role IN ('researcher', 'lab_manager', 'project_manager', 'postdoc')
                    ELSE u.role = 'lab_manager' END
             WHEN 'manage_cryo' THEN
               CASE WHEN u.affiliation = 'MiMic Lab'
                    THEN u.role NOT IN ('msc', 'guest')
                    ELSE u.role IN ('researcher', 'lab_manager', 'project_manager', 'postdoc') END
             WHEN 'request_orders' THEN
               CASE WHEN u.affiliation = 'MiMic Lab'
                    THEN u.role NOT IN ('msc', 'guest')
                    ELSE u.role IN ('researcher', 'lab_manager', 'project_manager', 'postdoc') END
             WHEN 'approve_orders' THEN
               false   -- only is_admin / admin / pi (handled above)
             ELSE false
           END
      )
  );
$$;

-- ------------------------------------------------------------
-- Checks
-- ------------------------------------------------------------
-- §1: expect 0 rows with max = current among imported items
SELECT count(*) FILTER (WHERE max_stock = 0) AS no_max,
       count(*) FILTER (WHERE max_stock > 0) AS with_max
FROM   reagents;

-- §2: Fluorescence Box should now hold ~64 antibodies; Box 1/2 gone
SELECT b.label, count(r.id) AS reagents
FROM   storage_boxes b JOIN storage_units su ON su.id = b.storage_unit_id
LEFT   JOIN reagents r ON r.box_id = b.id
WHERE  su.name = 'Fridge +4 °C MiMic'
GROUP  BY b.label ORDER BY b.label;

-- §3: expect Primary ≈ 63, Secondary ≈ 29, Antibodies 0
SELECT category, count(*) FROM reagents WHERE category ILIKE '%antibod%' GROUP BY 1 ORDER BY 1;

-- §4: kinds after this round (stock ≈ 23–25, working ≈ 78)
SELECT kind, count(*) AS n, count(*) FILTER (WHERE derived_from_id IS NOT NULL) AS linked
FROM   reagents GROUP BY kind ORDER BY kind;

-- §7a: vial owners whose user_id does not match any account — if Mattia's
--      or Alberto's name shows up here, their vials point at an old id and
--      that is why they saw no "Withdraw" button
SELECT v.user_name, v.user_id, count(*) AS vials
FROM   cryo_vials v LEFT JOIN lab_users u ON u.id = v.user_id
WHERE  u.id IS NULL
GROUP  BY 1, 2 ORDER BY 3 DESC;

-- §7b: same names, current ids (to compare with the previous list)
SELECT u.name, u.id, u.role, u.auth_user_id IS NOT NULL AS logged_in_once,
       cardinality(u.certifications) AS n_certs, u.certifications
FROM   lab_users u
WHERE  u.name IN ('Mattia Ballerini', 'Alberto Mantegazza', 'Stefania Brambilla')
ORDER  BY u.name;
