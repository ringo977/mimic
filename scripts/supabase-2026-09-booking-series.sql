-- ============================================================
-- MiMic Lab — Multi-day bookings (29 September 2026, beta feedback)
-- ============================================================
-- "Some instruments should be bookable for several days in a row without one
-- booking per day (Mech stimulators, syringe pumps, the MiMic laptop)."
--
-- The booking model stays one row per day (every rule, trigger and view is
-- built on `date`). A multi-day booking is a SERIES: N rows sharing a
-- series_id, created by book_series() in one transaction — either every day
-- is accepted (RLS + enforce_booking_policy run on each row, as the caller)
-- or nothing is written. Cancelling offers "this day" or "the whole series"
-- (a plain DELETE ... WHERE series_id = …, under the usual delete policy).
--
-- Which instruments offer it is decided in Admin → Instruments → Booking
-- rules ("multiDay" flag in booking_policy) — a UI gate only: N single
-- bookings were always possible, the series just makes them one action.
--
-- Idempotent. Run after supabase-2026-09-consolidation.sql.
-- ============================================================

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS series_id text;
CREATE INDEX IF NOT EXISTS bookings_series_idx ON bookings (series_id) WHERE series_id IS NOT NULL;

CREATE OR REPLACE FUNCTION book_series(
  p_instrument_id text,
  p_dates         text[],          -- 'YYYY-MM-DD', distinct, ascending
  p_start_hour    numeric,
  p_end_hour      numeric,
  p_notes         text DEFAULT ''
)
RETURNS SETOF bookings
LANGUAGE plpgsql
SECURITY INVOKER                    -- RLS and the policy trigger apply as the caller
SET search_path = public
AS $$
DECLARE
  sid   text := 'ser-' || substr(md5(random()::text || clock_timestamp()::text), 1, 12);
  me    text := current_lab_user_id();
  name_ text;
  d     text;
  n     integer := coalesce(array_length(p_dates, 1), 0);
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not a lab member'; END IF;
  IF n = 0 OR n > 31 THEN RAISE EXCEPTION 'A series covers 1 to 31 days (got %)', n; END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(p_dates) x) <> n THEN RAISE EXCEPTION 'Duplicate dates in the series'; END IF;
  IF p_end_hour <= p_start_hour THEN RAISE EXCEPTION 'End time must be after start time'; END IF;
  SELECT name INTO name_ FROM lab_users WHERE id = me;

  FOREACH d IN ARRAY p_dates LOOP
    BEGIN
      INSERT INTO bookings (id, instrument_id, user_id, user_name, date, start_hour, end_hour, notes, created_at, series_id)
      VALUES (
        substr(md5(random()::text || d || clock_timestamp()::text), 1, 17),
        p_instrument_id, me, coalesce(name_, ''), d, p_start_hour, p_end_hour, coalesce(p_notes, ''),
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        sid
      );
    EXCEPTION WHEN OTHERS THEN
      -- Name the day that failed; the whole series is rolled back.
      RAISE EXCEPTION '%: %', d, SQLERRM USING ERRCODE = SQLSTATE;
    END;
  END LOOP;

  RETURN QUERY SELECT * FROM bookings WHERE series_id = sid ORDER BY date;
END;
$$;
REVOKE ALL ON FUNCTION book_series(text, text[], numeric, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION book_series(text, text[], numeric, numeric, text) TO authenticated;

-- Checks
SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'series_id';  -- 1 row
SELECT has_function_privilege('authenticated', 'book_series(text, text[], numeric, numeric, text)', 'EXECUTE');  -- true
