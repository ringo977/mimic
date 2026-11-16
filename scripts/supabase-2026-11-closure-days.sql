-- ============================================================
-- MiMic Lab Manager — Politecnico closure days (Nov 2026)
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor (once; safe to re-run).
--
-- Closure days are the days on which the Politecnico is closed and
-- NOBODY CAN ENTER — unlike weekends and public holidays, when the
-- lab can still be used. On those days instruments cannot be booked.
--
--   * Stored in app_settings, key 'closures':
--       { "periods": [ { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "label": "…" }, … ] }
--     (both dates included). Edited from Admin Panel → Schedule →
--     "Politecnico closure days"; app_settings is readable by members
--     and writable by admins only (existing policies).
--   * Trigger bookings_enforce_closures refuses a booking created on,
--     moved to, or extended on a closure day.
--       - Booking managers (Lab Manager, Project Manager, PI, Admin —
--         is_booking_manager()) are exempt: authorised access.
--         The responsible of an instrument is NOT exempt.
--       - Bookings already on those days are left alone: they can be
--         cancelled, shortened, approved or annotated, not extended.
--   * Seeds the closures known today:
--       7–8 December 2026, 24 December 2026 – 6 January 2027.
--
-- The LAST statement lists the closures and every booking already
-- sitting on a closure day (to be sorted out by hand).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Label of the closure covering a day ('' when it has no
--    label), or NULL when the Politecnico is open.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION lab_closure_on(p_date text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT coalesce(c ->> 'label', '')
  FROM app_settings s,
       jsonb_array_elements(CASE WHEN jsonb_typeof(s.value -> 'periods') = 'array'
                                 THEN s.value -> 'periods' ELSE '[]'::jsonb END) c
  WHERE s.key = 'closures'
    AND p_date >= c ->> 'start'
    AND p_date <= c ->> 'end'
  ORDER BY c ->> 'start'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION lab_closure_on(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION lab_closure_on(text) TO authenticated;

-- ------------------------------------------------------------
-- 2. Trigger: no booking on a closure day
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_closure_days() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  lbl text;
BEGIN
  -- A booking that stays on its day and does not grow (notes, approval,
  -- early release) is never touched, closure or not.
  IF TG_OP = 'UPDATE'
     AND NEW.date = OLD.date
     AND NEW.start_hour >= OLD.start_hour
     AND NEW.end_hour   <= OLD.end_hour THEN
    RETURN NEW;
  END IF;

  lbl := lab_closure_on(NEW.date);
  IF lbl IS NULL OR is_booking_manager() THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'The Politecnico is closed on %: the lab cannot be accessed, so nothing can be booked',
    to_char(NEW.date::date, 'DD Mon YYYY') || CASE WHEN lbl <> '' THEN ' (' || lbl || ')' ELSE '' END;
END;
$$;

DROP TRIGGER IF EXISTS bookings_enforce_closures ON bookings;
CREATE TRIGGER bookings_enforce_closures
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION enforce_closure_days();

-- ------------------------------------------------------------
-- 3. Seed the known closures (added only when the same period
--    is not there yet; whatever was entered from the Admin Panel
--    is kept).
-- ------------------------------------------------------------
INSERT INTO app_settings (key, value)
VALUES ('closures', '{"periods": []}'::jsonb)
ON CONFLICT (key) DO NOTHING;

WITH seed(start_d, end_d, label) AS (
  VALUES ('2026-12-07', '2026-12-08', 'Sant''Ambrogio and Immacolata'),
         ('2026-12-24', '2027-01-06', 'Christmas closure')
),
cur AS (
  SELECT c
  FROM app_settings s,
       jsonb_array_elements(CASE WHEN jsonb_typeof(s.value -> 'periods') = 'array'
                                 THEN s.value -> 'periods' ELSE '[]'::jsonb END) c
  WHERE s.key = 'closures'
),
merged AS (
  SELECT c FROM cur
  UNION ALL
  SELECT jsonb_build_object('start', start_d, 'end', end_d, 'label', label)
  FROM seed
  WHERE NOT EXISTS (SELECT 1 FROM cur WHERE cur.c ->> 'start' = seed.start_d AND cur.c ->> 'end' = seed.end_d)
)
UPDATE app_settings
SET value = jsonb_build_object('periods', (SELECT coalesce(jsonb_agg(c ORDER BY c ->> 'start', c ->> 'end'), '[]'::jsonb) FROM merged)),
    updated_at = now()
WHERE key = 'closures';

-- ------------------------------------------------------------
-- 4. Check: the closures, then the bookings already on them
-- ------------------------------------------------------------
SELECT what, "when", detail
FROM (
  SELECT 1 AS ord, c ->> 'start' AS k, 0::numeric AS h,
         'closure' AS what,
         CASE WHEN c ->> 'start' = c ->> 'end' THEN c ->> 'start'
              ELSE (c ->> 'start') || ' → ' || (c ->> 'end') END AS "when",
         coalesce(c ->> 'label', '') AS detail
  FROM app_settings s, jsonb_array_elements(s.value -> 'periods') c
  WHERE s.key = 'closures'
  UNION ALL
  SELECT 2, b.date, b.start_hour,
         'booking on a closed day',
         b.date || ' '
           || lpad(floor(b.start_hour)::text, 2, '0') || ':' || lpad(round((b.start_hour - floor(b.start_hour)) * 60)::text, 2, '0') || '–'
           || lpad(floor(b.end_hour)::text, 2, '0')   || ':' || lpad(round((b.end_hour - floor(b.end_hour)) * 60)::text, 2, '0'),
         coalesce(i.name, b.instrument_id) || ' · ' || b.user_name
  FROM bookings b
  LEFT JOIN instruments i ON i.id = b.instrument_id
  WHERE lab_closure_on(b.date) IS NOT NULL
    AND b.date >= to_char((now() AT TIME ZONE 'Europe/Rome')::date, 'YYYY-MM-DD')
) x
ORDER BY ord, k, h;
