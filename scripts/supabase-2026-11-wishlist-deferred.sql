-- ============================================================
-- Wishlist: "ask for more info" (deferred) + Other project (06/11/2026)
-- ============================================================
-- Follow-up of supabase-2026-11-wishlist-motivation.sql (run that first).
-- Marco: besides approve and reject, the PI can send a request back with
-- a question. New status 'deferred' with the PI's text in pi_comment; the
-- requester edits the request to answer and saving puts it back to
-- 'pending'. Deferred requests are out of the approval queue (and out of
-- the e-mail recap, which counts pending only).
--
-- "Other…" projects are plain text in wishlist_items.project: no change.
--
-- protect_wishlist_status v3: as v2, plus
--   · the requester may move their own row deferred → pending;
--   · only approver roles may write pi_comment.
-- ============================================================

ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS pi_comment text NOT NULL DEFAULT '';
COMMENT ON COLUMN wishlist_items.pi_comment IS 'The PI''s question when status = deferred (approver roles only)';

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
    IF NEW.status IS DISTINCT FROM 'pending' OR NEW.approved_by IS NOT NULL OR coalesce(NEW.pi_comment, '') <> '' THEN
      RAISE EXCEPTION 'New wishlist requests must start as pending';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
    RAISE EXCEPTION 'Only approver roles can change who approved a wishlist item';
  END IF;
  IF NEW.pi_comment IS DISTINCT FROM OLD.pi_comment THEN
    RAISE EXCEPTION 'Only approver roles can write the PI comment on a wishlist item';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- Procurement steps on an already approved item
    IF is_lab_order_handler()
       AND ((OLD.status = 'approved' AND NEW.status = 'ordered')
         OR (OLD.status = 'ordered'  AND NEW.status = 'delivered')) THEN
      RETURN NEW;
    END IF;
    -- The requester answers the PI's question: back in the queue
    IF OLD.status = 'deferred' AND NEW.status = 'pending' AND OLD.requested_by = current_lab_user_id() THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Only approver roles can change the status of a wishlist item';
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers already exist (2026-10-wishlist-roles.sql §3); CREATE OR REPLACE keeps them bound.

-- ------------------------------------------------------------
-- Checks — expect: column_ok = true, trigger_v3 = true, triggers = 2
-- ------------------------------------------------------------
SELECT (SELECT count(*) = 1 FROM information_schema.columns WHERE table_name = 'wishlist_items' AND column_name = 'pi_comment') AS column_ok,
       position('deferred' IN pg_get_functiondef('protect_wishlist_status()'::regprocedure)) > 0 AS trigger_v3,
       (SELECT count(*) FROM pg_trigger WHERE tgrelid = 'wishlist_items'::regclass AND tgname LIKE 'trg_protect_wishlist_status%') AS triggers;
