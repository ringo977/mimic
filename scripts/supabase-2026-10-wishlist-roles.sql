-- ============================================================
-- MiMic Lab Manager — wishlist roles (27 October 2026)
-- ============================================================
-- Run in Supabase → SQL Editor AFTER supabase-2026-10-sw-half-day.sql.
-- Idempotent.
--
-- Marco's rule: purchase requests are approved / rejected by the Principal
-- Investigators ONLY (role admin or pi). Placing the order ("Mark as
-- Ordered") and stocking the delivery are procurement work, open to the
-- Lab Manager (Stefania) as well.
--
--   §1 lab_can v4
--        'approve_orders' → role admin / pi only. The Admin flag (is_admin)
--        no longer grants it: Stefania is lab_manager + Admin flag and must
--        not approve. Everything else unchanged from v2 (round4b).
--        NEW 'handle_orders' → admin / pi / Admin flag / MiMic lab_manager.
--   §2 is_lab_order_handler() = is_aal2() AND lab_can('handle_orders')
--        (lab managers are MFA-mandatory in the app anyway).
--   §3 protect_wishlist_status v2: order handlers may move an item
--        approved → ordered and ordered → delivered; approved_by stays as
--        set by the approver. Every other status change still needs an
--        approver; new requests still start as pending.
--   §4 wishlist_items_update policy v3: handlers may update rows.
--
-- Mirrors data/lab-data.ts: canApproveOrders (admin, pi) and the new
-- canHandleOrders (admin, pi, MiMic lab_manager).
-- ============================================================

-- ------------------------------------------------------------
-- §1 lab_can v4
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
      AND CASE perm
            -- Purchase approval is a PI decision: the Admin flag does not grant it.
            WHEN 'approve_orders' THEN u.role IN ('admin', 'pi')
            ELSE (
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
                   WHEN 'handle_orders' THEN
                     u.affiliation = 'MiMic Lab' AND u.role = 'lab_manager'
                   ELSE false
                 END
            )
          END
  );
$$;

-- ------------------------------------------------------------
-- §2 is_lab_order_handler()
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_lab_order_handler()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT is_aal2() AND lab_can('handle_orders');
$$;
REVOKE ALL ON FUNCTION is_lab_order_handler() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_lab_order_handler() TO authenticated;

-- ------------------------------------------------------------
-- §3 protect_wishlist_status v2
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION protect_wishlist_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF is_lab_approver() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'pending' OR NEW.approved_by IS NOT NULL THEN
      RAISE EXCEPTION 'New wishlist requests must start as pending';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
    RAISE EXCEPTION 'Only approver roles can change who approved a wishlist item';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Procurement steps on an already approved item
    IF is_lab_order_handler()
       AND ((OLD.status = 'approved' AND NEW.status = 'ordered')
         OR (OLD.status = 'ordered'  AND NEW.status = 'delivered')) THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Only approver roles can change the status of a wishlist item';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_wishlist_status_ins ON wishlist_items;
CREATE TRIGGER trg_protect_wishlist_status_ins
  BEFORE INSERT ON wishlist_items
  FOR EACH ROW EXECUTE FUNCTION protect_wishlist_status();

DROP TRIGGER IF EXISTS trg_protect_wishlist_status_upd ON wishlist_items;
CREATE TRIGGER trg_protect_wishlist_status_upd
  BEFORE UPDATE ON wishlist_items
  FOR EACH ROW EXECUTE FUNCTION protect_wishlist_status();

-- ------------------------------------------------------------
-- §4 wishlist_items_update v3
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "wishlist_items_update" ON wishlist_items;
CREATE POLICY "wishlist_items_update" ON wishlist_items
  FOR UPDATE TO authenticated
  USING      (is_lab_approver() OR is_lab_order_handler()
              OR (lab_can('request_orders') AND requested_by = current_lab_user_id()))
  WITH CHECK (is_lab_approver() OR is_lab_order_handler()
              OR (lab_can('request_orders') AND requested_by = current_lab_user_id()));

-- ------------------------------------------------------------
-- Checks (expect true, true, true, and the list of who can do what)
-- ------------------------------------------------------------
SELECT
  (SELECT prosrc LIKE '%handle_orders%' FROM pg_proc WHERE proname = 'lab_can')                      AS lab_can_v4,
  (SELECT prosrc LIKE '%is_lab_order_handler%' FROM pg_proc WHERE proname = 'protect_wishlist_status') AS trigger_v2,
  (SELECT qual LIKE '%is_lab_order_handler%' FROM pg_policies WHERE tablename = 'wishlist_items' AND policyname = 'wishlist_items_update') AS policy_v3;

SELECT name, role, is_admin, affiliation,
       role IN ('admin', 'pi')                                                               AS can_approve,
       (is_admin OR role IN ('admin', 'pi') OR (affiliation = 'MiMic Lab' AND role = 'lab_manager')) AS can_mark_ordered
FROM lab_users
WHERE status = 'active'
  AND (is_admin OR role IN ('admin', 'pi', 'lab_manager'))
ORDER BY can_approve DESC, name;
