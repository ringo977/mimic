-- ============================================================
-- Half-day smart working (22 Oct 2026)
-- ============================================================
-- A smart-working request may now cover a morning or an afternoon only.
-- Encoding: type = 'smart_working', start_date = end_date, start_hour /
-- end_hour set (09–13 morning, 14–18 afternoon; the same two columns the
-- "hours" type already uses). A half day counts 0.5 towards the monthly
-- smart-working cap; everything else (max consecutive days, adjacency,
-- Friday deadline) is unchanged.
--
-- absence_auto_approve_ok gains the start_hour argument (v3) and the
-- protect_absence_status trigger passes it. Mirror: evaluateAbsenceRequest
-- and absenceWorkingDays() in data/lab-data.ts.
-- Idempotent. Run after self-signup.sql.
-- ============================================================

DROP FUNCTION IF EXISTS absence_auto_approve_ok(text, text, text, text, text);

CREATE OR REPLACE FUNCTION absence_auto_approve_ok(
  p_id text, p_user_id text, p_type text, p_start text, p_end text, p_start_hour numeric DEFAULT NULL
)
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
  used         numeric;
  requested    numeric;
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
    -- Chain the request with the user's own leave right before / after it
    -- (day off or vacation, weekends skipped), so N single-day requests in
    -- a row are judged like one request of N days.
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
    -- v3: a half day (start_hour set) weighs 0.5 on the monthly cap
    FOR m IN SELECT DISTINCT x2 FROM unnest(ARRAY[to_char(d_start, 'YYYY-MM'), to_char(d_end, 'YYYY-MM')]) x2 LOOP
      SELECT coalesce(sum(CASE WHEN a.start_hour IS NOT NULL THEN 0.5 ELSE 1 END), 0) INTO used
        FROM absences a, generate_series(a.start_date::date, a.end_date::date, '1 day') g
       WHERE a.id <> p_id AND a.user_id = p_user_id AND a.type = 'smart_working'
         AND a.status IN ('pending', 'auto_approved', 'approved')
         AND to_char(g, 'YYYY-MM') = m AND extract(isodow FROM g) < 6;
      SELECT count(*) * (CASE WHEN p_start_hour IS NOT NULL THEN 0.5 ELSE 1 END) INTO requested
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
REVOKE ALL ON FUNCTION absence_auto_approve_ok(text, text, text, text, text, numeric) FROM PUBLIC, anon, authenticated;

-- Same trigger body as consolidation §4, passing start_hour
CREATE OR REPLACE FUNCTION protect_absence_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_lab_admin() THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status NOT IN ('pending', 'auto_approved') THEN
        RAISE EXCEPTION 'Only supervisors can create approved/rejected absences';
      END IF;
      IF NEW.decided_by IS NOT NULL OR NEW.decision_note IS NOT NULL THEN
        RAISE EXCEPTION 'Only supervisors can set decision fields';
      END IF;
      IF NEW.status = 'auto_approved'
         AND NOT absence_auto_approve_ok(NEW.id, NEW.user_id, NEW.type, NEW.start_date, NEW.end_date, NEW.start_hour) THEN
        NEW.status := 'pending';
        NEW.flags  := concat_ws(' | ', nullif(NEW.flags, ''), 'Server check: this request needs supervisor approval.');
      END IF;
    ELSE
      IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'cancelled' THEN
        RAISE EXCEPTION 'Only supervisors can approve or reject absences';
      END IF;
      IF OLD.status <> 'pending' THEN
        IF NEW.type       IS DISTINCT FROM OLD.type
        OR NEW.start_date  IS DISTINCT FROM OLD.start_date
        OR NEW.end_date    IS DISTINCT FROM OLD.end_date
        OR NEW.start_hour  IS DISTINCT FROM OLD.start_hour
        OR NEW.end_hour    IS DISTINCT FROM OLD.end_hour
        OR NEW.user_id     IS DISTINCT FROM OLD.user_id
        OR NEW.decided_by  IS DISTINCT FROM OLD.decided_by
        OR NEW.decided_at  IS DISTINCT FROM OLD.decided_at THEN
          RAISE EXCEPTION 'This absence has already been decided — only a cancellation is allowed. Ask a supervisor to change it.';
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Checks (expect: v3 true · old_signature_gone true · trigger_passes_hour true)
SELECT
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'absence_auto_approve_ok' AND pronargs = 6)        AS v3,
  NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'absence_auto_approve_ok' AND pronargs = 5)    AS old_signature_gone,
  (SELECT prosrc LIKE '%NEW.end_date, NEW.start_hour)%' FROM pg_proc WHERE proname = 'protect_absence_status') AS trigger_passes_hour;
