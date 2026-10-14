-- ============================================================
-- MiMic Lab Manager — beta-tester round 4 (14 October 2026)
-- ============================================================
-- Feedback of ARA / FVO / SPE / VAN ("MiMic Lab Manager Debugging.docx").
-- Run in Supabase → SQL Editor. Idempotent: safe to re-run.
-- Run AFTER supabase-2026-09-booking-series.sql and
-- supabase-2026-09-data-api-grants.sql (it redefines book_series,
-- lab_can, absence_auto_approve_ok and adjust_reagent_stock).
--
--   §1 (WITHDRAWN the same day, see supabase-2026-10-beta-round4b.sql) —
--      a lab_can v3 that gave external PhDs cryo + wishlist. Marco chose to
--      keep the matrix as it was and registered the three testers with
--      affiliation "MiMic Lab" instead. The section below is kept only as a
--      no-op comment so this file stays idempotent in the DR order.
--   §2 book_series v2 — hours PER DAY: a continuous booking starts at the
--      chosen hour on the first day, covers the whole bookable day in
--      between and ends at the chosen hour on the last day. The app sends
--      three parallel arrays (dates, start hours, end hours); "same hours
--      every day" is just the arrays with repeated values.
--   §3 absence_auto_approve_ok v2 — days off booked one at a time no
--      longer slip under autoApproveMaxDays: the request is counted
--      together with the user's adjacent days off / vacation (weekends do
--      not break the chain), as the app does in evaluateAbsenceRequest.
--   §4 adjust_reagent_stock v6 — the responsibles of a reagent may RESTOCK
--      it even when their role has no canAddReagents (PDMS kits looked
--      after by a PhD: "add batches on arrival, subtract a kit when
--      opened"). Responsibles can now be set on any kind, not only stocks.
--   §5 lab_users.favorite_instrument_ids — personal favourites (star on
--      the instrument cards, "Favourites" filter on Home and Instruments).
--      Own-row column, not a management field: no trigger change needed.
-- ============================================================

-- ------------------------------------------------------------
-- §1 — withdrawn. lab_can stays at v2 (supabase-2026-09-beta-round1.sql);
--      supabase-2026-10-beta-round4b.sql re-asserts it on databases where
--      the first version of this file had already been run.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- §2 book_series v2 — one (start, end) per day
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS book_series(text, text[], numeric, numeric, text);

CREATE OR REPLACE FUNCTION book_series(
  p_instrument_id text,
  p_dates         text[],          -- 'YYYY-MM-DD', distinct, ascending
  p_start_hours   numeric[],       -- same length as p_dates
  p_end_hours     numeric[],       -- same length as p_dates
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
  i     integer;
  n     integer := coalesce(array_length(p_dates, 1), 0);
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not a lab member'; END IF;
  IF n = 0 OR n > 31 THEN RAISE EXCEPTION 'A series covers 1 to 31 days (got %)', n; END IF;
  IF coalesce(array_length(p_start_hours, 1), 0) <> n OR coalesce(array_length(p_end_hours, 1), 0) <> n THEN
    RAISE EXCEPTION 'One start and one end hour per day are required';
  END IF;
  IF (SELECT count(DISTINCT x) FROM unnest(p_dates) x) <> n THEN RAISE EXCEPTION 'Duplicate dates in the series'; END IF;
  SELECT name INTO name_ FROM lab_users WHERE id = me;

  FOR i IN 1..n LOOP
    IF p_end_hours[i] <= p_start_hours[i] THEN
      RAISE EXCEPTION '%: end time must be after start time', p_dates[i];
    END IF;
    BEGIN
      INSERT INTO bookings (id, instrument_id, user_id, user_name, date, start_hour, end_hour, notes, created_at, series_id)
      VALUES (
        substr(md5(random()::text || p_dates[i] || clock_timestamp()::text), 1, 17),
        p_instrument_id, me, coalesce(name_, ''), p_dates[i], p_start_hours[i], p_end_hours[i], coalesce(p_notes, ''),
        to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        sid
      );
    EXCEPTION WHEN OTHERS THEN
      -- Name the day that failed; the whole series is rolled back.
      RAISE EXCEPTION '%: %', p_dates[i], SQLERRM USING ERRCODE = SQLSTATE;
    END;
  END LOOP;

  RETURN QUERY SELECT * FROM bookings WHERE series_id = sid ORDER BY date;
END;
$$;
REVOKE ALL ON FUNCTION book_series(text, text[], numeric[], numeric[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION book_series(text, text[], numeric[], numeric[], text) TO authenticated;

-- ------------------------------------------------------------
-- §3 absence_auto_approve_ok v2 — day off counted with adjacent leave
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION absence_auto_approve_ok(p_id text, p_user_id text, p_type text, p_start text, p_end text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  s            jsonb;
  today        date := (now() AT TIME ZONE 'Europe/Rome')::date;
  d_start      date;
  d_end        date;
  b_start      date;      -- the request + adjacent own leave, as one block
  b_end        date;
  x            date;
  days         integer;
  notice       integer;
  cur          date;
  n_abs        integer;
  max_days     integer;
  notice_short integer;
  sw_cap       integer;
  sw_consec    integer;
  max_conc     integer;
  prev_work    date;
  next_work    date;
  deadline     date;
  m            text;
  used         integer;
  requested    integer;
BEGIN
  IF p_type = 'sick' THEN RETURN true; END IF;         -- recorded, never approved
  IF p_type = 'vacation' THEN RETURN false; END IF;    -- always a supervisor's call
  BEGIN
    d_start := p_start::date; d_end := p_end::date;
  EXCEPTION WHEN OTHERS THEN
    RETURN false;
  END;
  IF d_end < d_start THEN RETURN false; END IF;

  SELECT value INTO s FROM app_settings WHERE key = 'absence_settings';
  s            := coalesce(s, '{}'::jsonb);
  max_days     := coalesce((s ->> 'autoApproveMaxDays')::integer, 2);
  notice_short := coalesce((s ->> 'noticeDaysShort')::integer, 2);
  sw_cap       := coalesce((s ->> 'swMonthlyCap')::integer, 4);
  sw_consec    := coalesce((s ->> 'swMaxConsecutive')::integer, 1);
  max_conc     := coalesce((s ->> 'maxConcurrentAbsent')::integer, 3);

  -- Restricted periods block every type but sick leave
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(s -> 'blackoutPeriods', '[]'::jsonb)) b
              WHERE p_start <= (b ->> 'end') AND p_end >= (b ->> 'start')) THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO days FROM generate_series(d_start, d_end, '1 day') g WHERE extract(isodow FROM g) < 6;

  -- Too many people already away on one of the days (full-day types, not SW)
  IF p_type IN ('day_off', 'trip') THEN
    FOR cur IN SELECT g::date FROM generate_series(d_start, d_end, '1 day') g WHERE extract(isodow FROM g) < 6 LOOP
      SELECT count(DISTINCT a.user_id) INTO n_abs
        FROM absences a
       WHERE a.id <> p_id AND a.user_id <> p_user_id
         AND a.status IN ('pending', 'auto_approved', 'approved')
         AND a.type IN ('day_off', 'vacation', 'sick', 'trip')
         AND a.start_date <= cur::text AND a.end_date >= cur::text;
      IF n_abs + 1 > max_conc THEN RETURN false; END IF;
    END LOOP;
  END IF;

  IF p_type IN ('hours', 'trip') THEN RETURN true; END IF;

  IF p_type = 'day_off' THEN
    -- v2: chain the request with the user's own leave right before / after
    -- it (day off or vacation, weekends skipped), so N single-day requests
    -- in a row are judged like one request of N days.
    b_start := d_start; b_end := d_end;
    LOOP
      prev_work := b_start - 1; WHILE extract(isodow FROM prev_work) >= 6 LOOP prev_work := prev_work - 1; END LOOP;
      SELECT min(a.start_date::date) INTO x FROM absences a
       WHERE a.id <> p_id AND a.user_id = p_user_id AND a.type IN ('day_off', 'vacation')
         AND a.status IN ('pending', 'auto_approved', 'approved')
         AND a.start_date::date <= prev_work AND a.end_date::date >= prev_work;
      EXIT WHEN x IS NULL OR x >= b_start;
      b_start := x;
    END LOOP;
    LOOP
      next_work := b_end + 1; WHILE extract(isodow FROM next_work) >= 6 LOOP next_work := next_work + 1; END LOOP;
      SELECT max(a.end_date::date) INTO x FROM absences a
       WHERE a.id <> p_id AND a.user_id = p_user_id AND a.type IN ('day_off', 'vacation')
         AND a.status IN ('pending', 'auto_approved', 'approved')
         AND a.start_date::date <= next_work AND a.end_date::date >= next_work;
      EXIT WHEN x IS NULL OR x <= b_end;
      b_end := x;
    END LOOP;
    SELECT count(*) INTO days FROM generate_series(b_start, b_end, '1 day') g WHERE extract(isodow FROM g) < 6;
    IF days > max_days THEN RETURN false; END IF;
    IF d_start <= today THEN
      notice := 0;
    ELSE
      SELECT count(*) INTO notice FROM generate_series(today + 1, d_start - 1, '1 day') g WHERE extract(isodow FROM g) < 6;
    END IF;
    RETURN notice >= notice_short;
  END IF;

  IF p_type = 'smart_working' THEN
    IF days > sw_consec THEN RETURN false; END IF;
    prev_work := d_start - 1; WHILE extract(isodow FROM prev_work) >= 6 LOOP prev_work := prev_work - 1; END LOOP;
    next_work := d_end + 1;   WHILE extract(isodow FROM next_work) >= 6 LOOP next_work := next_work + 1; END LOOP;
    IF EXISTS (SELECT 1 FROM absences a
                WHERE a.id <> p_id AND a.user_id = p_user_id AND a.type = 'smart_working'
                  AND a.status IN ('pending', 'auto_approved', 'approved')
                  AND (a.end_date = prev_work::text OR a.start_date = next_work::text)) THEN
      RETURN false;
    END IF;
    FOR m IN SELECT DISTINCT x2 FROM unnest(ARRAY[to_char(d_start, 'YYYY-MM'), to_char(d_end, 'YYYY-MM')]) x2 LOOP
      SELECT count(*) INTO used
        FROM absences a, generate_series(a.start_date::date, a.end_date::date, '1 day') g
       WHERE a.id <> p_id AND a.user_id = p_user_id AND a.type = 'smart_working'
         AND a.status IN ('pending', 'auto_approved', 'approved')
         AND to_char(g, 'YYYY-MM') = m AND extract(isodow FROM g) < 6;
      SELECT count(*) INTO requested
        FROM generate_series(d_start, d_end, '1 day') g
       WHERE to_char(g, 'YYYY-MM') = m AND extract(isodow FROM g) < 6;
      IF used + requested > sw_cap THEN RETURN false; END IF;
    END LOOP;
    -- Planned by the Friday of the previous week
    deadline := d_start - ((extract(isodow FROM d_start)::integer - 1) + 3);
    RETURN today <= deadline;
  END IF;

  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION absence_auto_approve_ok(text, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- §4 adjust_reagent_stock v6 — responsibles may restock
--    (same body as beta-round2 v5 otherwise)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION adjust_reagent_stock(
  p_reagent_id text,
  p_delta      numeric,
  p_purpose    text DEFAULT NULL,
  p_project    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r        reagents%ROWTYPE;
  me       lab_users%ROWTYPE;
  nxt      numeric;
  log_id   text;
  log_ts   text;
  action   text;
  details  text;
BEGIN
  IF p_delta IS NULL OR p_delta = 0 THEN
    RAISE EXCEPTION 'Quantity must be non-zero';
  END IF;

  SELECT * INTO me FROM lab_users WHERE id = current_lab_user_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not a lab member';
  END IF;

  SELECT * INTO r FROM reagents WHERE id = p_reagent_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reagent not found';
  END IF;

  IF p_delta < 0 AND NOT lab_can('withdraw_reagents') THEN
    RAISE EXCEPTION 'Your role cannot withdraw reagents';
  END IF;
  -- v6: a responsible of THIS reagent may restock it whatever the role
  IF p_delta > 0 AND NOT lab_can('add_reagents') AND NOT (me.id = ANY (coalesce(r.responsible_user_ids, '{}'::text[]))) THEN
    RAISE EXCEPTION 'Your role cannot restock reagents (only the responsibles of this item can)';
  END IF;

  IF p_delta < 0 AND NOT can_access_stock(p_reagent_id) THEN
    RAISE EXCEPTION 'This is a stock: only its responsibles (or a lab manager) can take from it';
  END IF;

  nxt := r.current_stock + p_delta;
  IF nxt < 0 THEN
    RAISE EXCEPTION 'Not enough stock: % available, % requested', r.current_stock, -p_delta;
  END IF;
  IF coalesce(r.max_stock, 0) > 0 AND nxt > r.max_stock THEN
    RAISE EXCEPTION 'Exceeds the maximum stock (%): % in stock, % requested', r.max_stock, r.current_stock, p_delta;
  END IF;

  PERFORM set_config('lab.stock_rpc', '1', true);
  UPDATE reagents SET current_stock = nxt WHERE id = p_reagent_id;

  IF p_delta < 0 THEN
    action  := 'Withdrew ' || r.name;
    details := trim(both from (-p_delta)::text || ' ' || coalesce(r.unit, ''))
               || CASE WHEN coalesce(p_purpose, '') <> '' OR coalesce(p_project, '') <> ''
                       THEN ' - ' || coalesce(p_purpose, '') || ' (' || coalesce(p_project, '') || ')'
                       ELSE '' END;
  ELSE
    action  := 'Restocked ' || r.name;
    details := trim(both from '+' || p_delta::text || ' ' || coalesce(r.unit, ''));
  END IF;

  log_id := lower(to_hex((extract(epoch from clock_timestamp()) * 1000)::bigint))
            || substr(md5(random()::text || clock_timestamp()::text), 1, 9);
  log_ts := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');

  INSERT INTO log_entries (id, "timestamp", user_id, user_name, action, category, details)
  VALUES (log_id, log_ts, me.id, me.name, action, 'reagent', details);

  RETURN jsonb_build_object(
    'stock', nxt,
    'applied', p_delta,
    'log', jsonb_build_object(
      'id', log_id, 'timestamp', log_ts, 'userId', me.id, 'userName', me.name,
      'action', action, 'category', 'reagent', 'details', details)
  );
END;
$$;
REVOKE ALL ON FUNCTION adjust_reagent_stock(text, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION adjust_reagent_stock(text, numeric, text, text) TO authenticated;

-- ------------------------------------------------------------
-- §5 Personal favourite instruments
-- ------------------------------------------------------------
ALTER TABLE lab_users ADD COLUMN IF NOT EXISTS favorite_instrument_ids text[] NOT NULL DEFAULT '{}'::text[];

-- ------------------------------------------------------------
-- Checks
-- ------------------------------------------------------------
-- §1 withdrawn: lab_can must NOT carry the v3 marker → false
SELECT prosrc LIKE '%v3: external PhD too%' AS lab_can_v3_present FROM pg_proc WHERE proname = 'lab_can';
-- §2: exactly one book_series, with numeric[] hours → 1 row
SELECT oid::regprocedure AS book_series_signature FROM pg_proc WHERE proname = 'book_series';
-- §3: new chaining code present → true
SELECT prosrc LIKE '%b_start%' AS absence_v2 FROM pg_proc WHERE proname = 'absence_auto_approve_ok';
-- §4: responsibles may restock → true
SELECT prosrc LIKE '%responsible_user_ids%' AS restock_v6 FROM pg_proc WHERE proname = 'adjust_reagent_stock';
-- §5: column exists → 1 row
SELECT column_name FROM information_schema.columns WHERE table_name = 'lab_users' AND column_name = 'favorite_instrument_ids';
