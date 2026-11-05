-- ============================================================
-- MiMic Lab Manager — e-mail recap three times a day (05/11/2026)
-- ============================================================
-- Marco: "notifiche via email, a 7, 13 e 19, un recap, senza spam".
-- Everything runs inside Postgres: pg_cron fires every hour, the function
-- checks the Rome hour, builds one message per recipient and posts it to
-- Brevo (transactional e-mail API) through pg_net. No Edge Function, nothing on the static site.
--
-- Recipients (active, with an e-mail, not opted out):
--   · managers — Admin flag, or effective role admin / pi / lab_manager /
--     project_manager — get everything;
--   · the responsible of an instrument gets the part about that instrument;
--   · the responsible of a reagent (stock) gets its movements and low-stock alert.
-- Rhythm: managers and instrument responsibles 3×/day (07, 13, 19, every day);
-- people who are only reagent responsibles ONE mail/day, at 07:00, Monday to
-- Friday, covering everything since the previous working day's mail.
-- An e-mail goes out only when there is something to say.
--
-- Content, by slot (Europe/Rome):
--   07  bookings of today, extra-hours requests waiting for you, pending
--       absences / purchases (PI), movements of the stock since 19:00,
--       reagents under their alert threshold, new members
--   13  bookings of this afternoon + what happened since 07:00
--   19  bookings of tomorrow + what happened since 13:00
--
-- ONE-TIME SETUP (Marco, SQL Editor) — the API key never leaves Supabase:
--   SELECT vault.create_secret('xkeysib-…', 'brevo_api_key', 'Brevo API key for the Lab Manager digest');
-- Sender: mimiclab.polimi@gmail.com, verified on Brevo (Settings → Senders →
-- Add a sender → 6-digit code). Brevo was chosen because it needs no DNS
-- record: Polimi's DNS is not ours, and polimi.it has DMARC p=quarantine, so
-- a @polimi.it sender from any third-party service would land in spam.
-- Replies go to reply_to (Marco). "only_to" (optional allowlist) is empty:
-- everybody eligible receives. Brevo free plan: 300 e-mails/day.
--
-- Safe to run from the SQL Editor; re-runnable.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ------------------------------------------------------------
-- 1. Opt-out flag (own row; protect_lab_user_fields leaves it alone for
--    the owner and blocks it on other people's rows)
-- ------------------------------------------------------------
ALTER TABLE lab_users ADD COLUMN IF NOT EXISTS digest_opt_out boolean NOT NULL DEFAULT false;

-- ------------------------------------------------------------
-- 2. Settings (editable later from the SQL Editor or Admin → Settings)
-- ------------------------------------------------------------
INSERT INTO app_settings (key, value) VALUES ('digest', jsonb_build_object(
  'enabled',    true,
  'hours',      jsonb_build_array(7, 13, 19),
  'from_name',  'MiMic Lab Manager',
  'from_email', 'mimiclab.polimi@gmail.com',       -- must be a verified sender on Brevo
  'reply_to',   'marco.rasponi@polimi.it',
  'reagent_hour', 7,                                 -- the one daily slot (Mon–Fri) for reagent-only responsibles
  'only_to',    jsonb_build_array(),                 -- [] = everybody eligible; or an allowlist of e-mails while testing
  'app_url',    'https://www.mimic.polimi.it/lab/'
)) ON CONFLICT (key) DO UPDATE SET
  -- re-run: refresh the sender (Resend → Brevo switch), keep enabled / hours / app_url
  value = (app_settings.value - 'from') || jsonb_build_object(
    'from_name',  'MiMic Lab Manager',
    'from_email', 'mimiclab.polimi@gmail.com',
    'reply_to',   'marco.rasponi@polimi.it',
    'reagent_hour', coalesce(app_settings.value -> 'reagent_hour', '7'::jsonb),
    'only_to',    jsonb_build_array());

-- ------------------------------------------------------------
-- 3. Log of what was sent (admins read it from the SQL Editor)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS digest_log (
  id          bigserial PRIMARY KEY,
  sent_at     timestamptz NOT NULL DEFAULT now(),
  slot_hour   integer NOT NULL,
  user_id     text,
  email       text,
  n_items     integer NOT NULL DEFAULT 0,
  subject     text,
  request_id  bigint,          -- pg_net request: status in net._http_response
  note        text             -- 'sent' | 'skipped: …'
);
ALTER TABLE digest_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS digest_log_select ON digest_log;
CREATE POLICY digest_log_select ON digest_log FOR SELECT TO authenticated USING (is_lab_admin());
GRANT SELECT ON digest_log TO authenticated;

-- ------------------------------------------------------------
-- 4. Helpers
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION digest_h(p text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
$$;

CREATE OR REPLACE FUNCTION digest_hhmm(p numeric)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT lpad(floor(p)::int::text, 2, '0') || ':' || lpad(round((p - floor(p)) * 60)::int::text, 2, '0');
$$;

CREATE OR REPLACE FUNCTION digest_day(p_date date)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT to_char(p_date, 'Dy DD Mon');
$$;

-- ISO text → timestamptz, NULL instead of an error on odd legacy values
CREATE OR REPLACE FUNCTION digest_ts(p text)
RETURNS timestamptz LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN p::timestamptz;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$$;

-- Who receives, and with which scope
DROP FUNCTION IF EXISTS digest_recipients();   -- the returned columns changed (reagent_ids added): CREATE OR REPLACE cannot do that
CREATE OR REPLACE FUNCTION digest_recipients()
RETURNS TABLE (user_id text, email text, name text, is_manager boolean, is_pi boolean, is_admin boolean, instrument_ids text[], reagent_ids text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.id, u.email, u.name,
         (u.is_admin OR lab_effective_role(u.affiliation, u.role) IN ('admin', 'pi', 'lab_manager', 'project_manager')) AS is_manager,
         (lab_effective_role(u.affiliation, u.role) IN ('admin', 'pi'))                                                   AS is_pi,      -- approves purchases
         u.is_admin                                                                                                        AS is_admin,   -- approves absences too
         coalesce((SELECT array_agg(i.id) FROM instruments i WHERE i.responsible_user_id = u.id), '{}')                     AS instrument_ids,
         coalesce((SELECT array_agg(g.id) FROM reagents g WHERE u.id = ANY (g.responsible_user_ids)), '{}')                 AS reagent_ids
    FROM lab_users u
   WHERE u.status = 'active'
     AND coalesce(u.email, '') <> ''
     AND NOT u.digest_opt_out
     AND (u.is_admin
          OR lab_effective_role(u.affiliation, u.role) IN ('admin', 'pi', 'lab_manager', 'project_manager')
          OR EXISTS (SELECT 1 FROM instruments i WHERE i.responsible_user_id = u.id)
          OR EXISTS (SELECT 1 FROM reagents g WHERE u.id = ANY (g.responsible_user_ids)));
$$;

-- Reagent-only responsibles (no management role, no instrument) are on the
-- daily rhythm: one mail at reagent_hour, Monday to Friday.
CREATE OR REPLACE FUNCTION digest_slot_applies(p_is_manager boolean, p_instrument_ids text[], p_slot integer)
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT CASE
    WHEN p_is_manager OR cardinality(coalesce(p_instrument_ids, '{}')) > 0 THEN true
    ELSE p_slot = coalesce((SELECT (value ->> 'reagent_hour')::int FROM app_settings WHERE key = 'digest'), 7)
         AND extract(isodow FROM (now() AT TIME ZONE 'Europe/Rome')::date) BETWEEN 1 AND 5
  END;
$$;

-- ------------------------------------------------------------
-- 5. Build one message
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION digest_build(p_user_id text, p_slot integer)
RETURNS TABLE (subject text, html text, n_items integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r          record;
  cfg        jsonb := coalesce((SELECT value FROM app_settings WHERE key = 'digest'), '{}'::jsonb);
  app_url    text  := coalesce(cfg ->> 'app_url', 'https://www.mimic.polimi.it/lab/');
  today      date  := (now() AT TIME ZONE 'Europe/Rome')::date;
  since      timestamptz;
  agenda_day date;
  agenda_lbl text;
  agenda_min numeric := 0;
  body       text := '';
  sec        text;
  n          integer := 0;
  n_auth     integer := 0;
  n_book     integer := 0;
  parts      text[] := '{}';
  slot_lbl   text := lpad(p_slot::text, 2, '0') || ':00';
  daily      boolean;
BEGIN
  SELECT * INTO r FROM digest_recipients() d WHERE d.user_id = p_user_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF NOT digest_slot_applies(r.is_manager, r.instrument_ids, p_slot) THEN RETURN; END IF;
  daily := NOT r.is_manager AND cardinality(r.instrument_ids) = 0;

  -- Window "since the previous recap": 07 → yesterday 19:00, 13 → 07:00, 19 → 13:00;
  -- daily rhythm → the previous working day's mail (Monday looks back to Friday)
  IF daily THEN
    since := ((today - CASE WHEN extract(isodow FROM today) = 1 THEN 3 ELSE 1 END)::timestamp + make_interval(hours => p_slot)) AT TIME ZONE 'Europe/Rome';
    slot_lbl := 'daily';
  ELSE
    since := CASE p_slot
               WHEN 7  THEN ((today - 1)::timestamp + interval '19 hours') AT TIME ZONE 'Europe/Rome'
               WHEN 13 THEN (today::timestamp + interval '7 hours')  AT TIME ZONE 'Europe/Rome'
               ELSE         (today::timestamp + interval '13 hours') AT TIME ZONE 'Europe/Rome'
             END;
  END IF;
  IF p_slot = 19 THEN agenda_day := today + 1; agenda_lbl := 'Tomorrow';
  ELSIF p_slot = 13 THEN agenda_day := today; agenda_lbl := 'This afternoon'; agenda_min := 13;
  ELSE agenda_day := today; agenda_lbl := 'Today'; END IF;

  -- A. Extra-hours bookings waiting for this person's authorization
  SELECT count(*), string_agg(format('<li><b>%s</b> — %s · %s %s–%s%s</li>',
           digest_h(i.name), digest_h(b.user_name), digest_day(b.date::date), digest_hhmm(b.start_hour), digest_hhmm(b.end_hour),
           CASE WHEN b.notes <> '' THEN ' <span style="color:#6b7280">· ' || digest_h(b.notes) || '</span>' ELSE '' END),
           '' ORDER BY b.date, b.start_hour)
    INTO n_auth, sec
    FROM bookings b JOIN instruments i ON i.id = b.instrument_id
   WHERE b.status = 'pending' AND b.date >= today::text
     AND (r.is_manager OR b.instrument_id = ANY (r.instrument_ids));
  IF n_auth > 0 THEN
    body := body || format('<h3 style="margin:18px 0 6px;color:#b45309">Awaiting your authorization (%s)</h3><ul style="margin:0;padding-left:18px">%s</ul>', n_auth, sec);
    n := n + n_auth; parts := parts || format('%s to authorize', n_auth);
  END IF;

  -- B. Agenda: bookings of today / this afternoon / tomorrow, grouped by instrument
  SELECT coalesce(sum(cnt), 0)::int, string_agg(line, '' ORDER BY iname) INTO n_book, sec FROM (
    SELECT i.name AS iname, count(*) AS cnt,
           format('<li><b>%s</b>: %s</li>', digest_h(i.name),
                  string_agg(format('%s–%s %s%s', digest_hhmm(b.start_hour), digest_hhmm(b.end_hour), digest_h(b.user_name),
                                    CASE WHEN b.status = 'pending' THEN ' <i style="color:#b45309">(pending)</i>' ELSE '' END),
                             ' · ' ORDER BY b.start_hour)) AS line
      FROM bookings b JOIN instruments i ON i.id = b.instrument_id
     WHERE b.date = agenda_day::text AND b.end_hour > agenda_min
       AND (r.is_manager OR b.instrument_id = ANY (r.instrument_ids))
     GROUP BY i.name
  ) g;
  IF n_book > 0 THEN
    body := body || format('<h3 style="margin:18px 0 6px;color:#102C53">%s · %s — %s booking%s</h3><ul style="margin:0;padding-left:18px">%s</ul>',
                           agenda_lbl, digest_day(agenda_day), n_book, CASE WHEN n_book = 1 THEN '' ELSE 's' END, sec);
    n := n + n_book; parts := parts || format('%s booking%s %s', n_book, CASE WHEN n_book = 1 THEN '' ELSE 's' END, lower(agenda_lbl));
  END IF;

  IF r.is_pi OR r.is_admin THEN
    -- C. Absence requests waiting for a decision (PI, or the Admin flag)
    SELECT count(*), string_agg(format('<li><b>%s</b> — %s, %s%s%s</li>', digest_h(a.user_name), replace(a.type, '_', ' '),
             digest_day(a.start_date::date),
             CASE WHEN a.end_date <> a.start_date THEN ' → ' || digest_day(a.end_date::date) ELSE '' END,
             CASE WHEN a.start_hour IS NOT NULL THEN ' ' || digest_hhmm(a.start_hour) || '–' || digest_hhmm(a.end_hour) ELSE '' END),
             '' ORDER BY a.start_date)
      INTO n_auth, sec
      FROM absences a WHERE a.status = 'pending';
    IF n_auth > 0 THEN
      body := body || format('<h3 style="margin:18px 0 6px;color:#b45309">Absence requests to decide (%s)</h3><ul style="margin:0;padding-left:18px">%s</ul>', n_auth, sec);
      n := n + n_auth; parts := parts || format('%s absence%s', n_auth, CASE WHEN n_auth = 1 THEN '' ELSE 's' END);
    END IF;
  END IF;

  IF r.is_pi THEN
    -- D. Purchase requests waiting for approval (PIs only, as in the app).
    --    Every pending request is actionable and counts, until it is decided;
    --    the ones arrived since the previous recap are flagged "new" and listed first.
    SELECT count(*), count(*) FILTER (WHERE digest_ts(w.timestamp) >= since),
           string_agg(format('<li>%s<b>%s</b> ×%s — %s%s · asked by %s%s</li>',
             CASE WHEN digest_ts(w.timestamp) >= since THEN '<span style="color:#fff;background:#b45309;border-radius:4px;padding:0 5px;font-size:11px;margin-right:6px">new</span>' ELSE '' END,
             digest_h(w.name), w.quantity, digest_h(w.supplier),
             CASE WHEN w.estimated_cost > 0 THEN format(' · ~%s €', w.estimated_cost) ELSE '' END, digest_h(w.requested_by_name),
             CASE WHEN w.urgency = 'high' THEN ' <b style="color:#b91c1c">urgent</b>' ELSE '' END),
             '' ORDER BY (digest_ts(w.timestamp) >= since) DESC, w.timestamp DESC)
      INTO n_book, n_auth, sec
      FROM wishlist_items w WHERE w.status = 'pending';
    IF n_book > 0 THEN
      body := body || format('<h3 style="margin:18px 0 6px;color:#b45309">Purchases to approve (%s%s)</h3><ul style="margin:0;padding-left:18px">%s</ul>',
                             n_book, CASE WHEN n_auth > 0 THEN format(', %s new', n_auth) ELSE '' END, sec);
      n := n + n_book; parts := parts || format('%s purchase%s to approve', n_book, CASE WHEN n_book = 1 THEN '' ELSE 's' END);
    END IF;
  END IF;

  IF r.is_manager THEN
    -- E. Approved purchases not yet ordered (Lab / Project Manager step): same
    --    rule — the whole to-order list counts, newly approved ones flagged
    SELECT count(*), count(*) FILTER (WHERE h.changed_at >= since),
           string_agg(format('<li>%s%s ×%s — %s</li>',
             CASE WHEN h.changed_at >= since THEN '<span style="color:#fff;background:#102C53;border-radius:4px;padding:0 5px;font-size:11px;margin-right:6px">new</span>' ELSE '' END,
             digest_h(w.name), w.quantity, digest_h(w.supplier)), '' ORDER BY (h.changed_at >= since) DESC NULLS LAST, w.timestamp DESC)
      INTO n_book, n_auth, sec
      FROM wishlist_items w
      LEFT JOIN LATERAL (SELECT max(changed_at) AS changed_at FROM row_history x
                          WHERE x.table_name = 'wishlist_items' AND x.row_id = w.id AND x.op = 'UPDATE' AND 'status' = ANY (x.changed_cols)) h ON true
     WHERE w.status = 'approved';
    IF n_book > 0 THEN
      body := body || format('<h3 style="margin:18px 0 6px;color:#102C53">Approved, to be ordered (%s%s)</h3><ul style="margin:0;padding-left:18px">%s</ul>',
                             n_book, CASE WHEN n_auth > 0 THEN format(', %s new', n_auth) ELSE '' END, sec);
      n := n + n_book; parts := parts || format('%s to order', n_book);
    END IF;

    -- F. Stock movements since the previous recap
    SELECT count(*), string_agg(format('<li>%s — <b>%s</b>%s <span style="color:#6b7280">· %s</span></li>',
             to_char(digest_ts(l."timestamp") AT TIME ZONE 'Europe/Rome', 'HH24:MI'), digest_h(l.action),
             CASE WHEN l.details <> '' THEN ' (' || digest_h(l.details) || ')' ELSE '' END, digest_h(l.user_name)), '' ORDER BY l."timestamp")
      INTO n_auth, sec
      FROM log_entries l
     WHERE l.category = 'reagent' AND digest_ts(l."timestamp") >= since;
    IF n_auth > 0 THEN
      body := body || format('<h3 style="margin:18px 0 6px;color:#102C53">Stock movements since %s</h3><ul style="margin:0;padding-left:18px">%s</ul>',
                             to_char(since AT TIME ZONE 'Europe/Rome', 'HH24:MI'), sec);
      n := n + n_auth;
    END IF;

    -- G. Reagents under their alert threshold (morning only, it does not change by the hour)
    IF p_slot = 7 THEN
      SELECT count(*), string_agg(format('<li>%s — <b>%s %s</b> left (alert at %s)</li>', digest_h(g.name), g.current_stock, digest_h(g.unit), g.alert_threshold), '' ORDER BY g.name)
        INTO n_auth, sec FROM reagents g WHERE g.alert_threshold > 0 AND g.current_stock <= g.alert_threshold;
      IF n_auth > 0 THEN
        body := body || format('<h3 style="margin:18px 0 6px;color:#b91c1c">Low stock (%s)</h3><ul style="margin:0;padding-left:18px">%s</ul>', n_auth, sec);
        n := n + n_auth;
      END IF;
    END IF;

    -- H. New members since the previous recap
    SELECT count(*), string_agg(format('<li>%s <span style="color:#6b7280">· %s, %s</span></li>', digest_h(u.name),
                  CASE u.role WHEN 'pi' THEN 'PI' WHEN 'lab_manager' THEN 'Lab Manager' WHEN 'project_manager' THEN 'Project Manager'
                              WHEN 'postdoc' THEN 'Post-Doc' WHEN 'phd' THEN 'PhD' WHEN 'msc' THEN 'MSc' ELSE initcap(u.role) END,
                  digest_h(u.affiliation)), '' ORDER BY u.created_at)
      INTO n_auth, sec FROM lab_users u WHERE u.created_at >= since;
    IF n_auth > 0 THEN
      body := body || format('<h3 style="margin:18px 0 6px;color:#102C53">New members</h3><ul style="margin:0;padding-left:18px">%s</ul>', sec);
      n := n + n_auth;
    END IF;
  END IF;

  IF NOT r.is_manager AND cardinality(r.reagent_ids) > 0 THEN
    -- I. Reagent responsible (not a manager): stock movements of own reagents,
    --    from row_history (each version's old stock vs the next one / live value)
    SELECT count(*), string_agg(format('<li>%s — <b>%s</b>: %s → %s %s <span style="color:#6b7280">· %s</span></li>',
             to_char(m.changed_at AT TIME ZONE 'Europe/Rome', CASE WHEN daily THEN 'Dy HH24:MI' ELSE 'HH24:MI' END), digest_h(m.name), m.old_stock, m.new_stock, digest_h(m.unit), digest_h(coalesce(m.changed_by_name, 'SQL / system'))),
             '' ORDER BY m.changed_at)
      INTO n_auth, sec
      FROM (
        SELECT h.changed_at, g.name, g.unit, h.changed_by_name,
               (h.old_row ->> 'current_stock')::numeric AS old_stock,
               coalesce((lead(h.old_row) OVER (PARTITION BY h.row_id ORDER BY h.changed_at)) ->> 'current_stock', g.current_stock::text)::numeric AS new_stock
          FROM row_history h JOIN reagents g ON g.id = h.row_id
         WHERE h.table_name = 'reagents' AND h.op = 'UPDATE' AND h.row_id = ANY (r.reagent_ids)
           AND 'current_stock' = ANY (h.changed_cols) AND NOT ('unit' = ANY (h.changed_cols))
      ) m
     WHERE m.changed_at >= since AND m.old_stock IS DISTINCT FROM m.new_stock;
    IF n_auth > 0 THEN
      body := body || format('<h3 style="margin:18px 0 6px;color:#102C53">Your reagents — movements since %s</h3><ul style="margin:0;padding-left:18px">%s</ul>',
                             CASE WHEN daily THEN digest_day((since AT TIME ZONE 'Europe/Rome')::date) || ' ' ELSE '' END || to_char(since AT TIME ZONE 'Europe/Rome', 'HH24:MI'), sec);
      n := n + n_auth; parts := parts || format('%s stock movement%s', n_auth, CASE WHEN n_auth = 1 THEN '' ELSE 's' END);
    END IF;

    IF p_slot = 7 THEN
      SELECT count(*), string_agg(format('<li>%s — <b>%s %s</b> left (alert at %s)</li>', digest_h(g.name), g.current_stock, digest_h(g.unit), g.alert_threshold), '' ORDER BY g.name)
        INTO n_auth, sec FROM reagents g WHERE g.id = ANY (r.reagent_ids) AND g.alert_threshold > 0 AND g.current_stock <= g.alert_threshold;
      IF n_auth > 0 THEN
        body := body || format('<h3 style="margin:18px 0 6px;color:#b91c1c">Your reagents — low stock (%s)</h3><ul style="margin:0;padding-left:18px">%s</ul>', n_auth, sec);
        n := n + n_auth; parts := parts || format('%s low stock', n_auth);
      END IF;
    END IF;
  END IF;

  IF n = 0 THEN RETURN; END IF;

  subject := format('MiMic Lab · %s recap%s', slot_lbl, CASE WHEN cardinality(parts) > 0 THEN ' — ' || array_to_string(parts, ', ') ELSE '' END);
  html := format(
    '<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#111827;max-width:620px">'
    '<p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">MiMic Lab Manager · %s %s</p>'
    '<p style="margin:0">Hi %s, here is your %s recap%s.</p>%s'
    '<p style="margin:22px 0 0"><a href="%s" style="display:inline-block;padding:9px 14px;background:#102C53;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Open the Lab Manager</a></p>'
    '<p style="margin:18px 0 0;font-size:11px;color:#9ca3af">You receive this because you manage bookings, an instrument or a reagent. To stop it: Lab Manager → sidebar → “E-mail recap”.</p></div>',
    digest_day(today), lpad(p_slot::text, 2, '0') || ':00', digest_h(split_part(r.name, ' ', 1)), slot_lbl,
    CASE WHEN daily THEN ' (Monday to Friday at ' || lpad(p_slot::text, 2, '0') || ':00)' ELSE '' END, body, app_url);
  n_items := n;
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION digest_build(text, integer) FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- 6. Send: one slot for everybody (cron) — or one person (test)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION digest_send_one(p_user_id text, p_slot integer)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  cfg     jsonb := coalesce((SELECT value FROM app_settings WHERE key = 'digest'), '{}'::jsonb);
  key     text;
  rcpt    record;
  msg     record;
  only_to text[] := coalesce(ARRAY(SELECT jsonb_array_elements_text(coalesce(cfg -> 'only_to', '[]'::jsonb))), '{}');
  req     bigint;
BEGIN
  SELECT * INTO rcpt FROM digest_recipients() d WHERE d.user_id = p_user_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('sent', false, 'note', 'not a recipient (role, opt-out or no e-mail)'); END IF;

  SELECT * INTO msg FROM digest_build(p_user_id, p_slot);
  IF NOT FOUND THEN
    INSERT INTO digest_log (slot_hour, user_id, email, n_items, note) VALUES (p_slot, p_user_id, rcpt.email, 0, 'skipped: nothing to report');
    RETURN jsonb_build_object('sent', false, 'note', 'nothing to report');
  END IF;

  IF cardinality(only_to) > 0 AND NOT (lower(rcpt.email) = ANY (SELECT lower(x) FROM unnest(only_to) x)) THEN
    INSERT INTO digest_log (slot_hour, user_id, email, n_items, subject, note) VALUES (p_slot, p_user_id, rcpt.email, msg.n_items, msg.subject, 'skipped: not in only_to');
    RETURN jsonb_build_object('sent', false, 'note', 'not in only_to', 'subject', msg.subject, 'n_items', msg.n_items);
  END IF;

  SELECT decrypted_secret INTO key FROM vault.decrypted_secrets WHERE name = 'brevo_api_key' LIMIT 1;
  IF key IS NULL THEN
    INSERT INTO digest_log (slot_hour, user_id, email, n_items, subject, note) VALUES (p_slot, p_user_id, rcpt.email, msg.n_items, msg.subject, 'skipped: no brevo_api_key in vault');
    RETURN jsonb_build_object('sent', false, 'note', 'no brevo_api_key in vault');
  END IF;

  -- Brevo transactional API: https://developers.brevo.com/reference/send-transac-email
  SELECT net.http_post(
    url     := 'https://api.brevo.com/v3/smtp/email',
    headers := jsonb_build_object('api-key', key, 'Content-Type', 'application/json', 'Accept', 'application/json'),
    body    := jsonb_build_object(
                 'sender',      jsonb_build_object('name', coalesce(cfg ->> 'from_name', 'MiMic Lab Manager'),
                                                   'email', coalesce(cfg ->> 'from_email', 'mimiclab.polimi@gmail.com')),
                 'to',          jsonb_build_array(jsonb_build_object('email', rcpt.email, 'name', rcpt.name)),
                 'replyTo',     jsonb_build_object('email', coalesce(cfg ->> 'reply_to', 'marco.rasponi@polimi.it')),
                 'subject',     msg.subject,
                 'htmlContent', msg.html,
                 'tags',        jsonb_build_array('lab-digest', 'slot-' || p_slot)),
    timeout_milliseconds := 15000
  ) INTO req;
  INSERT INTO digest_log (slot_hour, user_id, email, n_items, subject, request_id, note) VALUES (p_slot, p_user_id, rcpt.email, msg.n_items, msg.subject, req, 'sent');
  RETURN jsonb_build_object('sent', true, 'request_id', req, 'subject', msg.subject, 'n_items', msg.n_items);
END;
$$;
REVOKE ALL ON FUNCTION digest_send_one(text, integer) FROM PUBLIC, anon, authenticated;

-- Cron entry point: every hour; does something only at the configured Rome hours
CREATE OR REPLACE FUNCTION digest_send_all(p_slot integer DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  cfg   jsonb := coalesce((SELECT value FROM app_settings WHERE key = 'digest'), '{}'::jsonb);
  slot  integer := coalesce(p_slot, extract(hour FROM now() AT TIME ZONE 'Europe/Rome')::int);
  hours int[]  := coalesce(ARRAY(SELECT (jsonb_array_elements_text(coalesce(cfg -> 'hours', '[7,13,19]'::jsonb)))::int), '{7,13,19}');
  rcpt  record;
  sent  integer := 0;
BEGIN
  IF NOT coalesce((cfg ->> 'enabled')::boolean, true) THEN RETURN 0; END IF;
  IF NOT (slot = ANY (hours)) THEN RETURN 0; END IF;
  -- Not twice in the same slot (cron retry, manual run)
  IF p_slot IS NULL AND EXISTS (SELECT 1 FROM digest_log WHERE slot_hour = slot AND sent_at > now() - interval '50 minutes') THEN RETURN 0; END IF;
  FOR rcpt IN SELECT * FROM digest_recipients() LOOP
    CONTINUE WHEN NOT digest_slot_applies(rcpt.is_manager, rcpt.instrument_ids, slot);   -- not their slot: no mail, no log row
    IF (digest_send_one(rcpt.user_id, slot) ->> 'sent')::boolean THEN sent := sent + 1; END IF;
  END LOOP;
  RETURN sent;
END;
$$;
REVOKE ALL ON FUNCTION digest_send_all(integer) FROM PUBLIC, anon, authenticated;

-- Admin RPCs for the app / SQL Editor: preview and "send me one now"
CREATE OR REPLACE FUNCTION digest_preview_me(p_slot integer DEFAULT 7)
RETURNS TABLE (subject text, html text, n_items integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.* FROM digest_build(current_lab_user_id(), p_slot) b WHERE is_lab_admin();
$$;
REVOKE ALL ON FUNCTION digest_preview_me(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION digest_preview_me(integer) TO authenticated;

CREATE OR REPLACE FUNCTION digest_send_me(p_slot integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
BEGIN
  IF NOT is_lab_admin() THEN RAISE EXCEPTION 'Only lab admins can send themselves a test recap'; END IF;
  RETURN digest_send_one(current_lab_user_id(), p_slot);
END;
$$;
REVOKE ALL ON FUNCTION digest_send_me(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION digest_send_me(integer) TO authenticated;

-- Own opt-out from the app (sidebar toggle)
CREATE OR REPLACE FUNCTION set_my_digest_opt_out(p_opt_out boolean)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me text := current_lab_user_id();
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Not a lab member'; END IF;
  UPDATE lab_users SET digest_opt_out = p_opt_out WHERE id = me;
  RETURN p_opt_out;
END;
$$;
REVOKE ALL ON FUNCTION set_my_digest_opt_out(boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_my_digest_opt_out(boolean) TO authenticated;

-- ------------------------------------------------------------
-- 7. Cron: every hour on the hour (UTC); the function picks the Rome slot,
--    so summer / winter time needs no change
-- ------------------------------------------------------------
DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'mimic-digest';
  PERFORM cron.schedule('mimic-digest', '0 * * * *', 'SELECT public.digest_send_all();');
END $$;

-- ------------------------------------------------------------
-- 8. Checks — expect: column_ok, settings_ok, cron_ok, key_in_vault = true,
--    then the recipients with their scope
-- ------------------------------------------------------------
SELECT
  (SELECT count(*) = 1 FROM information_schema.columns WHERE table_name = 'lab_users' AND column_name = 'digest_opt_out') AS column_ok,
  (SELECT value ? 'hours' FROM app_settings WHERE key = 'digest')                                                      AS settings_ok,
  (SELECT count(*) = 1 FROM cron.job WHERE jobname = 'mimic-digest')                                                   AS cron_ok,
  (SELECT count(*) = 1 FROM vault.decrypted_secrets WHERE name = 'brevo_api_key')                                      AS key_in_vault;

SELECT name, email, is_manager, is_pi, is_admin, cardinality(instrument_ids) AS n_instruments, cardinality(reagent_ids) AS n_reagents FROM digest_recipients() ORDER BY is_manager DESC, name;

-- Then, to test (as yourself, from the SQL Editor it needs a JWT → use the
-- app's Admin button, or run these here with the SQL Editor's role):
--   SELECT * FROM digest_build('<your lab_users.id>', 7);                 -- preview
--   SELECT digest_send_one('<your lab_users.id>', 7);                      -- sends for real
--   SELECT id, status_code, content::text FROM net._http_response ORDER BY id DESC LIMIT 3;  -- Brevo answer: 201 {"messageId": …}
--   SELECT * FROM digest_log ORDER BY id DESC LIMIT 10;
