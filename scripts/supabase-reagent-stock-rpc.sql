-- ============================================================
-- MiMic Lab Manager — Atomic reagent stock adjustment
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor. Idempotent.
--
-- Why: the app used to read the stock, compute the new value in the
-- browser and write it back. Two people withdrawing at the same time
-- would overwrite each other (lost update). This RPC makes the
-- adjustment a single atomic UPDATE on the server, clamped between
-- 0 and max_stock.
--
-- RLS still applies (the function runs with the caller's rights),
-- so only lab members can adjust stock.
-- The app falls back to the legacy full-row write if this function
-- is not installed, so nothing breaks either way.
-- ============================================================

CREATE OR REPLACE FUNCTION adjust_reagent_stock(p_reagent_id text, p_delta numeric)
RETURNS numeric
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE reagents
  SET current_stock = LEAST(max_stock, GREATEST(0, current_stock + p_delta))
  WHERE id = p_reagent_id
  RETURNING current_stock;
$$;

GRANT EXECUTE ON FUNCTION adjust_reagent_stock(text, numeric) TO authenticated;

-- Verify with (replace the id):
--   SELECT adjust_reagent_stock('SOME_REAGENT_ID', -1);
