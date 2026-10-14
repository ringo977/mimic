-- ============================================================
-- MiMic Lab Manager — beta round 4b (14 October 2026, same day)
-- ============================================================
-- Run in Supabase → SQL Editor AFTER supabase-2026-10-beta-round4.sql.
-- Idempotent.
--
--   §1 lab_can back to v2. The first run of beta-round4 installed a v3 that
--      gave DEIB / POLIMI / External PhDs cryo + wishlist. Marco kept the
--      original matrix (external PhDs: no cryo, no wishlist) and registered
--      the three testers as "MiMic Lab" instead. Body identical to
--      supabase-2026-09-beta-round1.sql §6.
--   §2 record_row_history: a change that touches ONLY
--      lab_users.favorite_instrument_ids is not recorded. Clicking a star is
--      a personal preference, not something to restore from History; every
--      click was writing a row_history line.
-- ============================================================

-- ------------------------------------------------------------
-- §1 lab_can v2 (re-asserted)
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
-- §2 record_row_history v2 — ignore favourites-only updates
--    (same as supabase-2026-09-history.sql §3 otherwise)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION record_row_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o        jsonb;
  n        jsonb;
  rid      text;
  cols     text[];
  me_id    text;
  me_name  text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    n   := to_jsonb(NEW);
    rid := coalesce(n ->> 'id', n ->> 'key');
  ELSE
    o   := to_jsonb(OLD);
    rid := coalesce(o ->> 'id', o ->> 'key');
  END IF;

  IF TG_OP = 'UPDATE' THEN
    n := to_jsonb(NEW);
    IF o = n THEN
      RETURN NEW;   -- rewrite with identical values: nothing to record
    END IF;
    SELECT array_agg(k ORDER BY k) INTO cols
      FROM jsonb_object_keys(o || n) k
     WHERE o -> k IS DISTINCT FROM n -> k;
    -- v2: a star toggled on the Instruments page is not history
    IF TG_TABLE_NAME = 'lab_users' AND cols = ARRAY['favorite_instrument_ids']::text[] THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Who: the app user behind the JWT (NULL from the SQL editor or cron)
  SELECT u.id, u.name INTO me_id, me_name
    FROM lab_users u WHERE u.id = current_lab_user_id();

  INSERT INTO row_history (table_name, row_id, op, old_row, changed_cols, changed_by, changed_by_name)
  VALUES (TG_TABLE_NAME, rid, TG_OP, o, cols, me_id, coalesce(me_name, 'SQL / system'));

  RETURN coalesce(NEW, OLD);
END;
$$;

-- Optional tidy-up: drop the favourites-only lines already recorded today
DELETE FROM row_history
 WHERE table_name = 'lab_users' AND op = 'UPDATE'
   AND changed_cols = ARRAY['favorite_instrument_ids']::text[];

-- ------------------------------------------------------------
-- Checks
-- ------------------------------------------------------------
-- §1: v2 body back → true / false
SELECT prosrc LIKE '%ELSE u.role IN (''researcher'', ''lab_manager'', ''project_manager'', ''postdoc'') END%' AS lab_can_v2,
       prosrc LIKE '%v3: external PhD too%' AS lab_can_v3_present
  FROM pg_proc WHERE proname = 'lab_can';
-- §2: exclusion in place → true
SELECT prosrc LIKE '%favorite_instrument_ids%' AS history_skips_favourites FROM pg_proc WHERE proname = 'record_row_history';
