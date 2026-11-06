-- ============================================================
-- Wishlist: project, motivation, "discussed with PI" (06/11/2026)
-- ============================================================
-- Marco: with sixty pending requests the wishlist is hard to use. Every
-- request now carries the project it is for, a motivation, and a checkbox
-- saying it was already agreed with the PI (1-to-1 / meeting), so necessity
-- and urgency can be weighed; the page filters by requester and project
-- and searches all fields.
--
-- Three columns with defaults (old rows keep '' / false; the card shows
-- "No motivation given" on pending ones until the requester edits them).
-- No policy or trigger change: the columns are ordinary request fields,
-- editable by whoever may already edit the row (own pending / handlers).
-- The e-mail recap (section "Purchases to approve") shows project,
-- "discussed with PI" and the motivation: digest_build is redefined below
-- (same text as scripts/supabase-2026-11-email-digest.sql).
-- ============================================================

ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS project          text    NOT NULL DEFAULT '';
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS motivation       text    NOT NULL DEFAULT '';
ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS discussed_with_pi boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN wishlist_items.project IS 'Project name the purchase is for (free text, from the Projects list or "General lab")';
COMMENT ON COLUMN wishlist_items.motivation IS 'Why it is needed, and why now';
COMMENT ON COLUMN wishlist_items.discussed_with_pi IS 'Requester says it was already agreed with the PI';

-- ------------------------------------------------------------
-- digest_build: purchases section with project / discussed / motivation
-- (verbatim copy of the function in supabase-2026-11-email-digest.sql)
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
           string_agg(format('<li>%s<b>%s</b> ×%s — %s%s · asked by %s%s%s%s%s</li>',
             CASE WHEN digest_ts(w.timestamp) >= since THEN '<span style="color:#fff;background:#b45309;border-radius:4px;padding:0 5px;font-size:11px;margin-right:6px">new</span>' ELSE '' END,
             digest_h(w.name), w.quantity, digest_h(w.supplier),
             CASE WHEN w.estimated_cost > 0 THEN format(' · ~%s €', w.estimated_cost) ELSE '' END, digest_h(w.requested_by_name),
             CASE WHEN w.urgency = 'high' THEN ' <b style="color:#b91c1c">urgent</b>' ELSE '' END,
             -- 2026-11-wishlist-motivation.sql: project, "discussed with PI", motivation
             CASE WHEN coalesce(w.project, '') <> '' THEN format(' · <span style="color:#102C53">%s</span>', digest_h(w.project)) ELSE '' END,
             CASE WHEN w.discussed_with_pi THEN ' · <span style="color:#6d28d9">discussed with PI</span>' ELSE '' END,
             CASE WHEN coalesce(w.motivation, '') <> '' THEN format('<br><span style="color:#6b7280;font-size:12px">%s</span>', digest_h(w.motivation)) ELSE '' END),
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

-- ------------------------------------------------------------
-- Checks — expect: columns_ok = 3, digest_ok = true, then the pending
-- requests by requester (all with empty project / motivation for now)
-- ------------------------------------------------------------
SELECT (SELECT count(*) FROM information_schema.columns WHERE table_name = 'wishlist_items' AND column_name IN ('project', 'motivation', 'discussed_with_pi')) AS columns_ok,
       position('discussed with PI' IN pg_get_functiondef('digest_build(text, int)'::regprocedure)) > 0 AS digest_ok;

SELECT requested_by_name, count(*) AS pending, sum(estimated_cost * quantity) AS est_total
  FROM wishlist_items WHERE status = 'pending'
 GROUP BY 1 ORDER BY 2 DESC, 1;
