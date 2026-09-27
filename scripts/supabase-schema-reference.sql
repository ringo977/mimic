-- ============================================================
-- MiMic Lab Manager — Schema reference (disaster recovery)
-- ============================================================
-- PURPOSE: recreate all lab tables on a FRESH Supabase project if the
-- current one is ever lost. Written from the app's data layer in July 2026,
-- then REALIGNED on 27 September 2026 against the live database dumped with
-- supabase-inspect.sql — so the DDL below is what production actually has.
--
-- DRIFT CHECK: re-run supabase-inspect.sql (read only) after any change made
-- from the dashboard and compare. The July version had drifted badly: most
-- text columns are NOT NULL DEFAULT '' in production, the instrument and
-- maintenance dates are real `date` columns, maintenance_logs has a CHECK and
-- an ON DELETE CASCADE foreign key, projects has a status CHECK — none of it
-- was in the repo, and three of those only surfaced as failed imports
-- (lab_users_role_check, reagents.expiry_date, instruments.description).
--
-- Full recovery procedure:
--   1. Run this script                       (tables)
--   2. Run supabase-booking-settings.sql     (app_settings + half hours)
--        [supabase-rls-policies.sql is SUPERSEDED — do NOT run it]
--   3. Run supabase-security-hardening.sql   (membership gate & co.)
--   4. Run supabase-reagent-stock-rpc.sql    (atomic stock RPC)
--   5. Run supabase-user-profile-fields.sql  (profile fields + alumni)
--   6. Run supabase-absences.sql             (absences table + policy)
--   7. Run supabase-site-analytics.sql       (page_views + site_stats)
--        then supabase-page-views-retention.sql (retention 13 months,
--        ts server-side, select admin-only)
--   8. Run supabase-2026-09-roles.sql        (lab_users role/affiliation CHECK
--        aligned with UserRole — the live DB had an older, narrower list)
--   9. Run supabase-2026-09-cryo-storage.sql (storage_units.rack_labels)
--  10. Run supabase-2026-09-storage-boxes.sql (storage_boxes + box_id)
--      then supabase-2026-09-instrument-icons.sql (types & icons)
--      then supabase-2026-09-booking-policy.sql  (booking_policy + trigger)
--      then supabase-2026-09-fields.sql           (room codes, lot/owner/notes…)
--      then supabase-2026-09-shelf.sql            (reagents.shelf, 1 = top)
--      then supabase-2026-09-door.sql             (door side, double-door units)
--  11. Run supabase-2026-09-tighten.sql      (auth.uid identity, WITH CHECK,
--        approval triggers, CHECK constraints)
--      then supabase-2026-09-fix-assessment.sql (role matrix in the DB,
--        booking managers, certification enforced, stock RPC v2 — LAST)
--  12. Create the 'manuals' storage bucket (Storage → New bucket),
--      leaving "Public bucket" OFF (files are served via signed URLs)
--  13. Recreate auth users (Authentication → Add user) and update
--      NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY in the deploy environments
--  13b. Bootstrap the first admin row in lab_users (SQL template at the end
--      of this file), log in, enrol TOTP — without it Restore is refused
--  13c. Re-run the RLS check block at the end of this file: it must print
--      "RLS enabled on every table in public."
--  14. Lab app → Admin → Backup → Restore Database (JSON) + Restore PDFs
--  15. Dashboard → Authentication: sign-ups OFF, confirm email ON,
--      secure email change ON, min password length 8 + requirements
-- ============================================================

-- ============================================================
-- Tables — mirrored from the live database on 27 September 2026
-- (dumped with supabase-inspect.sql). Column order, types, NOT NULL
-- and defaults are the live ones: the app relies on the empty-string
-- defaults, and several date columns really are `date`, not text.
-- Constraints marked with a script name are (re)created by that script
-- too; they are listed here so a fresh project matches production.
-- ============================================================

CREATE TABLE IF NOT EXISTS lab_users (
  id                      text PRIMARY KEY,
  email                   text NOT NULL UNIQUE,
  name                    text NOT NULL,
  role                    text NOT NULL,
  certifications          text[] DEFAULT '{}'::text[],
  projects                text[] DEFAULT '{}'::text[],
  created_at              timestamptz DEFAULT now(),
  affiliation             text NOT NULL DEFAULT 'External'::text,
  is_admin                boolean NOT NULL DEFAULT false,
  status                  text NOT NULL DEFAULT 'active'::text,
  person_code             text,
  supervisor_id           text,
  start_date              text,
  end_date                text,
  training_microfab_done  boolean NOT NULL DEFAULT false,
  training_microfab_date  text,
  training_bio_done       boolean NOT NULL DEFAULT false,
  training_bio_date       text,
  abbreviation            text,
  auth_user_id            uuid,   -- linked auth.users.id (tighten.sql)
  certified_at            jsonb,   -- { certificationId: YYYY-MM-DD } training dates
  CONSTRAINT lab_users_affiliation_check
    CHECK ((affiliation = ANY (ARRAY['MiMic Lab'::text, 'DEIB'::text, 'POLIMI'::text, 'External'::text]))),   -- 2026-09-roles.sql
  CONSTRAINT lab_users_role_check
    CHECK ((role = ANY (ARRAY['admin'::text, 'pi'::text, 'researcher'::text, 'lab_manager'::text, 'project_manager'::text, 'postdoc'::text, 'phd'::text, 'msc'::text, 'guest'::text]))),   -- 2026-09-roles.sql
  CONSTRAINT lab_users_status_check
    CHECK ((status = ANY (ARRAY['active'::text, 'alumni'::text])))   -- user-profile-fields.sql
);

CREATE TABLE IF NOT EXISTS locations (
  id         text PRIMARY KEY,
  name       text NOT NULL,
  building   text,
  floor      text,
  notes      text,
  room_code  text   -- Polimi room code, e.g. MIA0306005025a
);

CREATE TABLE IF NOT EXISTS instruments (
  id                         text PRIMARY KEY,
  name                       text NOT NULL,
  category                   text NOT NULL,
  location                   text NOT NULL DEFAULT ''::text,   -- stale copy of the name — read location_id instead
  location_id                text,
  requires_certification     boolean NOT NULL DEFAULT false,
  description                text NOT NULL DEFAULT ''::text,
  icon                       text NOT NULL DEFAULT ''::text,
  serial_number              text,
  manufacturer               text,
  model                      text,
  purchase_date              date,
  commission_date            date,
  maintenance_period_months  integer,
  last_maintenance_date      date,
  next_maintenance_date      date,
  booking_policy             jsonb,   -- fixed slots / weekly quota (2026-09-booking-policy.sql)
  responsible_user_id        text   -- lab_users.id of whoever looks after it
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id             text PRIMARY KEY,
  instrument_id  text NOT NULL,
  date           date NOT NULL,
  type           text NOT NULL,
  description    text NOT NULL,
  performed_by   text NOT NULL,
  cost           numeric,
  notes          text,
  created_at     timestamptz DEFAULT now(),
  CONSTRAINT maintenance_logs_instrument_id_fkey
    FOREIGN KEY (instrument_id) REFERENCES instruments(id) ON DELETE CASCADE,
  CONSTRAINT maintenance_logs_type_check
    CHECK ((type = ANY (ARRAY['scheduled'::text, 'repair'::text, 'calibration'::text, 'inspection'::text])))
);

CREATE TABLE IF NOT EXISTS projects (
  id           text PRIMARY KEY,
  name         text NOT NULL,
  description  text NOT NULL DEFAULT ''::text,
  status       text NOT NULL DEFAULT 'active'::text,
  CONSTRAINT projects_status_check
    CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text])))
);

CREATE TABLE IF NOT EXISTS certifications (
  id             text PRIMARY KEY,
  name           text NOT NULL,
  instrument_id  text,
  description    text NOT NULL DEFAULT ''::text
);

CREATE TABLE IF NOT EXISTS storage_units (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  type            text NOT NULL,
  temperature     text NOT NULL DEFAULT ''::text,
  model           text NOT NULL DEFAULT ''::text,
  location        text NOT NULL DEFAULT ''::text,   -- stale copy of the name — read location_id instead
  location_id     text,
  num_racks       integer,
  boxes_per_rack  integer,
  grid_rows       integer,
  grid_cols       integer,
  num_shelves     integer,
  num_doors       integer,
  rack_labels     jsonb   -- [{label,color}] per rack (2026-09-cryo-storage.sql)
);

-- Boxes inside a unit: each has its own grid, so a −80 shelf box (9×9) and a
-- dewar box (5×5) coexist. See supabase-2026-09-storage-boxes.sql.
CREATE TABLE IF NOT EXISTS storage_boxes (
  id               text PRIMARY KEY,
  storage_unit_id  text NOT NULL,
  rack             integer,
  shelf            integer,
  number           integer NOT NULL DEFAULT 1,
  label            text NOT NULL,
  grid_rows        integer NOT NULL DEFAULT 1,
  grid_cols        integer NOT NULL DEFAULT 1,
  notes            text,
  door             text,      -- 'left' | 'right' in double-door units (2026-09-door.sql)
  CONSTRAINT storage_boxes_door_check
    CHECK (door IN ('left', 'right'))
);

CREATE TABLE IF NOT EXISTS reagents (
  id               text PRIMARY KEY,
  name             text NOT NULL,
  category         text NOT NULL DEFAULT ''::text,
  current_stock    numeric NOT NULL DEFAULT 0,
  max_stock        numeric NOT NULL DEFAULT 0,
  unit             text NOT NULL DEFAULT ''::text,
  expiry_date      text NOT NULL DEFAULT ''::text,
  location         text NOT NULL DEFAULT ''::text,   -- unit · sublocation, still free text
  storage_unit_id  text,
  supplier         text NOT NULL DEFAULT ''::text,
  catalog_number   text NOT NULL DEFAULT ''::text,
  alert_threshold  numeric NOT NULL DEFAULT 0,
  box_id           text,
  lot              text,
  owner            text,   -- who bought it (free text: may be an alumnus)
  notes            text,
  shelf            integer,   -- 1 = top shelf; NULL → inherits storage_boxes.shelf via box_id
  door             text,      -- 'left' | 'right' in double-door units; NULL → inherits the box's
  CONSTRAINT reagents_door_check
    CHECK (door IN ('left', 'right')),   -- 2026-09-door.sql
  CONSTRAINT reagents_stock_check
    CHECK ((current_stock >= (0)::numeric))   -- 2026-09-tighten.sql
);

CREATE TABLE IF NOT EXISTS bookings (
  id             text PRIMARY KEY,
  instrument_id  text NOT NULL,
  user_id        text NOT NULL,
  user_name      text NOT NULL DEFAULT ''::text,
  date           text NOT NULL,
  start_hour     numeric(4,2) NOT NULL,
  end_hour       numeric(4,2) NOT NULL,
  notes          text NOT NULL DEFAULT ''::text,
  created_at     text NOT NULL DEFAULT ''::text,
  CONSTRAINT bookings_hours_check
    CHECK ((end_hour > start_hour))   -- 2026-09-tighten.sql
  -- bookings_no_overlap: EXCLUDE USING gist (instrument_id, date, numrange(start_hour, end_hour))
  -- is added by supabase-security-hardening.sql, which first creates the btree_gist extension.
);

CREATE TABLE IF NOT EXISTS cryo_vials (
  id               text PRIMARY KEY,
  cell_line        text NOT NULL,
  passage          integer NOT NULL DEFAULT 0,
  date             text NOT NULL DEFAULT ''::text,
  user_id          text NOT NULL,
  user_name        text NOT NULL DEFAULT ''::text,
  storage_unit_id  text NOT NULL,
  rack             integer NOT NULL DEFAULT 0,   -- legacy rack/box/row/col: kept in sync, box_id wins
  box              integer NOT NULL DEFAULT 0,
  row              integer NOT NULL DEFAULT 0,
  col              integer NOT NULL DEFAULT 0,
  notes            text NOT NULL DEFAULT ''::text,
  box_id           text
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id                          text PRIMARY KEY,
  name                        text NOT NULL,
  type                        text NOT NULL DEFAULT 'reagent'::text,
  catalog_number              text NOT NULL DEFAULT ''::text,
  supplier                    text NOT NULL DEFAULT ''::text,
  estimated_cost              numeric NOT NULL DEFAULT 0,
  quantity                    integer NOT NULL DEFAULT 1,
  urgency                     text NOT NULL DEFAULT 'low'::text,
  requested_by                text NOT NULL,
  requested_by_name           text NOT NULL DEFAULT ''::text,
  status                      text NOT NULL DEFAULT 'pending'::text,
  approved_by                 text,
  delivered_at                text,
  stocked_to_reagent_id       text,
  stocked_to_storage_unit_id  text,
  notes                       text NOT NULL DEFAULT ''::text,
  timestamp                   text NOT NULL DEFAULT ''::text
);

CREATE TABLE IF NOT EXISTS log_entries (
  id         text PRIMARY KEY,
  timestamp  text NOT NULL DEFAULT ''::text,
  user_id    text NOT NULL,
  user_name  text NOT NULL DEFAULT ''::text,
  action     text NOT NULL DEFAULT ''::text,
  category   text NOT NULL DEFAULT ''::text,
  details    text NOT NULL DEFAULT ''::text
);

CREATE TABLE IF NOT EXISTS manuals (
  id            text PRIMARY KEY,
  title         text NOT NULL,
  category      text NOT NULL DEFAULT 'manual'::text,
  instrument    text,
  description   text NOT NULL DEFAULT ''::text,
  last_updated  text NOT NULL DEFAULT ''::text,
  uploaded_by   text NOT NULL DEFAULT ''::text,
  file_name     text,
  file_url      text,
  owner_id      text   -- uploader's lab_users.id (tighten.sql §14)
);

-- Indexes created by supabase-2026-09-storage-boxes.sql (listed for completeness)
CREATE INDEX IF NOT EXISTS cryo_vials_box_idx ON public.cryo_vials USING btree (box_id);
CREATE INDEX IF NOT EXISTS storage_boxes_unit_idx ON public.storage_boxes USING btree (storage_unit_id);

-- Not defined here, each has its own script (and matches it in production):
--   app_settings → supabase-booking-settings.sql (step 2)
--   absences     → supabase-absences.sql (step 6)
--   page_views   → supabase-site-analytics.sql (step 7)
-- No other table exists in the live public schema (17 in total).

-- ============================================================
-- Helper bootstrap — minimal versions of the RLS helper functions,
-- so the later scripts can reference them in their policies.
-- (supabase-security-hardening.sql and supabase-2026-09-tighten.sql
-- redefine them with the full logic; these exist only to break the
-- chicken-and-egg between table scripts and policy scripts.)
-- ============================================================
CREATE OR REPLACE FUNCTION is_lab_member()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM lab_users WHERE email = auth.jwt() ->> 'email');
$$;

CREATE OR REPLACE FUNCTION is_lab_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM lab_users
    WHERE email = auth.jwt() ->> 'email'
      AND (is_admin = true OR role IN ('admin', 'pi'))
  );
$$;

-- ============================================================
-- Row Level Security — ON for every table defined here.
-- The policies come from the later scripts, but a table with RLS enabled
-- and no policy denies everything, which is the safe starting point. The
-- old supabase-rls-policies.sql (superseded, not part of the procedure)
-- used to be the only place that switched RLS on: a rebuild that skipped
-- it would have left these 14 tables wide open to the anon key.
-- ============================================================
ALTER TABLE lab_users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects         ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_units    ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_boxes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reagents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE cryo_vials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE manuals          ENABLE ROW LEVEL SECURITY;

-- Fail loudly if anything in public is still unprotected (also catches
-- tables created by hand from the dashboard later on: re-run this block
-- after the whole procedure as a final check).
DO $$
DECLARE
  open_tables text;
BEGIN
  SELECT string_agg(c.relname, ', ' ORDER BY c.relname) INTO open_tables
  FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE  n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;
  IF open_tables IS NOT NULL THEN
    RAISE EXCEPTION 'Tables WITHOUT row level security: %', open_tables;
  END IF;
  RAISE NOTICE 'RLS enabled on every table in public.';
END $$;

-- ============================================================
-- First admin bootstrap (disaster recovery only)
-- ============================================================
-- On a fresh project lab_users is empty, so is_lab_admin() is false for
-- everybody and the app's Restore (which runs under RLS) is refused. Before
-- step 14 insert the row of the person doing the restore — with the SAME
-- email as their auth account (step 13). The trg_link_lab_user_auth
-- trigger links it at first login; the app then demands TOTP enrolment
-- (is_lab_admin requires MFA), after which the JSON restore works.
--
-- Use your REAL lab_users id, copied from the backup JSON ("lab_users" →
-- your row → "id"): the restore never touches the caller's own row (it is
-- filtered out by email), so whatever you insert here is what you will
-- have afterwards. With the real id there is nothing to clean up.
--
--   INSERT INTO lab_users (id, email, name, abbreviation, role, affiliation, is_admin, status)
--   VALUES ('<id from backup>', 'nome.cognome@polimi.it', 'Nome Cognome', 'NCO', 'pi', 'MiMic Lab', true, 'active')
--   ON CONFLICT (id) DO UPDATE SET is_admin = true, status = 'active';
--
-- Certifications / projects of that row can be re-entered from Admin →
-- Users after the restore (they are the only fields the import skips).

-- ============================================================
-- DONE. Continue with the other scripts (steps 2-15 in the header).
-- ============================================================
