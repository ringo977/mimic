-- ============================================================
-- MiMic Lab Manager — Schema reference (disaster recovery)
-- ============================================================
-- PURPOSE: recreate all lab tables on a FRESH Supabase project if the
-- current one is ever lost. Reconstructed from the app's data layer
-- (lib/supabase-data.ts, lib/supabase-users.ts) in July 2026.
-- The LIVE database remains the source of truth for exact types.
--
-- DRIFT CHECK: run supabase-inspect.sql in the SQL Editor (read only) and
-- compare its output with this file. Two objects created by hand in the
-- dashboard had already drifted from the repo — lab_users_role_check (older,
-- narrower role list), reagents.expiry_date NOT NULL and instruments.description
-- NOT NULL — and they surfaced only as failed imports in September 2026.
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
--  11. Run supabase-2026-09-tighten.sql      (auth.uid identity, WITH CHECK,
--        approval triggers, CHECK constraints — ALWAYS LAST)
--  12. Create the 'manuals' storage bucket (Storage → New bucket),
--      leaving "Public bucket" OFF (files are served via signed URLs)
--  13. Recreate auth users (Authentication → Add user) and update
--      NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY in the deploy environments
--  14. Lab app → Admin → Backup → Restore Database (JSON) + Restore PDFs
--  15. Dashboard → Authentication: sign-ups OFF, confirm email ON,
--      secure email change ON, min password length 8 + requirements
-- ============================================================

CREATE TABLE IF NOT EXISTS lab_users (
  id             text PRIMARY KEY,
  email          text NOT NULL UNIQUE,
  name           text NOT NULL,
  abbreviation   text,
  role           text NOT NULL DEFAULT 'guest',
  affiliation    text NOT NULL DEFAULT 'External',
  is_admin       boolean NOT NULL DEFAULT false,
  certifications text[] NOT NULL DEFAULT '{}',
  certified_at   jsonb,   -- { certificationId: 'YYYY-MM-DD' } training dates
  projects       text[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locations (
  id       text PRIMARY KEY,
  name     text NOT NULL,
  building  text,
  floor     text,
  room_code text,   -- Polimi room code, e.g. MIA0306005025a
  notes     text
);

CREATE TABLE IF NOT EXISTS instruments (
  id                        text PRIMARY KEY,
  name                      text NOT NULL,
  category                  text,
  location                  text,
  location_id               text,
  requires_certification    boolean NOT NULL DEFAULT false,
  description               text,   -- NOT NULL in the live DB (drift, see supabase-inspect.sql)
  icon                      text,
  serial_number             text,
  manufacturer              text,
  model                     text,
  purchase_date             text,
  commission_date           text,
  maintenance_period_months numeric,
  last_maintenance_date     text,
  next_maintenance_date     text,
  booking_policy            jsonb,  -- fixed slots / weekly quota (supabase-2026-09-booking-policy.sql)
  responsible_user_id       text    -- lab_users.id of whoever looks after it
);

CREATE TABLE IF NOT EXISTS maintenance_logs (
  id            text PRIMARY KEY,
  instrument_id text NOT NULL,
  date          text NOT NULL,
  type          text NOT NULL,
  description   text,
  performed_by  text,
  cost          numeric,
  notes         text
);

CREATE TABLE IF NOT EXISTS projects (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  description text,
  status      text NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS certifications (
  id            text PRIMARY KEY,
  name          text NOT NULL,
  instrument_id text,
  description   text
);

CREATE TABLE IF NOT EXISTS storage_units (
  id             text PRIMARY KEY,
  name           text NOT NULL,
  type           text NOT NULL,
  temperature    text,
  model          text,
  location       text,
  location_id    text,
  num_racks      integer,
  boxes_per_rack integer,
  grid_rows      integer,
  grid_cols      integer,
  num_shelves    integer,
  num_doors      integer,
  rack_labels    jsonb              -- [{label,color}] per rack (see supabase-2026-09-cryo-storage.sql)
);

-- Boxes inside a unit: each has its own grid, so a −80 shelf box (9×9) and a
-- dewar box (5×5) coexist. See supabase-2026-09-storage-boxes.sql.
CREATE TABLE IF NOT EXISTS storage_boxes (
  id              text PRIMARY KEY,
  storage_unit_id text NOT NULL,
  rack            integer,
  shelf           integer,
  number          integer NOT NULL DEFAULT 1,
  label           text NOT NULL,
  grid_rows       integer NOT NULL DEFAULT 1,
  grid_cols       integer NOT NULL DEFAULT 1,
  notes           text
);

CREATE TABLE IF NOT EXISTS reagents (
  id              text PRIMARY KEY,
  name            text NOT NULL,
  category        text,
  current_stock   numeric NOT NULL DEFAULT 0,
  max_stock       numeric NOT NULL DEFAULT 1,
  unit            text,
  expiry_date     text,
  location        text,
  storage_unit_id text,
  box_id          text,
  supplier        text,
  catalog_number  text,
  alert_threshold numeric NOT NULL DEFAULT 0,
  lot             text,
  owner           text,   -- who bought it (free text: may be an alumnus)
  notes           text
);

CREATE TABLE IF NOT EXISTS bookings (
  id            text PRIMARY KEY,
  instrument_id text NOT NULL,
  user_id       text NOT NULL,
  user_name     text,
  date          text NOT NULL,
  start_hour    numeric(4,2) NOT NULL,
  end_hour      numeric(4,2) NOT NULL,
  notes         text,
  created_at    text
);

CREATE TABLE IF NOT EXISTS cryo_vials (
  id              text PRIMARY KEY,
  cell_line       text NOT NULL,
  passage         integer NOT NULL DEFAULT 0,
  date            text,
  user_id         text,
  user_name       text,
  storage_unit_id text NOT NULL,
  box_id          text,
  rack            integer NOT NULL DEFAULT 1,
  box             integer NOT NULL DEFAULT 1,
  row             integer NOT NULL DEFAULT 0,
  col             integer NOT NULL DEFAULT 0,
  notes           text
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id                        text PRIMARY KEY,
  name                      text NOT NULL,
  type                      text,
  catalog_number            text,
  supplier                  text,
  estimated_cost            numeric,
  quantity                  integer,
  urgency                   text,
  requested_by              text,
  requested_by_name         text,
  status                    text NOT NULL DEFAULT 'pending',
  approved_by               text,
  delivered_at              text,
  stocked_to_reagent_id     text,
  stocked_to_storage_unit_id text,
  notes                     text,
  timestamp                 text
);

CREATE TABLE IF NOT EXISTS log_entries (
  id        text PRIMARY KEY,
  timestamp text NOT NULL,
  user_id   text,
  user_name text,
  action    text,
  category  text,
  details   text
);

CREATE TABLE IF NOT EXISTS manuals (
  id           text PRIMARY KEY,
  title        text NOT NULL,
  category     text,
  instrument   text,
  description  text,
  last_updated text,
  uploaded_by  text,
  file_name    text,
  file_url     text,
  owner_id     text            -- uploader's lab_users.id (tighten.sql §14)
);

-- app_settings is created by supabase-booking-settings.sql (step 2).
-- absences is created by supabase-absences.sql (step 6).

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
-- DONE. Continue with the other scripts (steps 2-8 in the header).
-- ============================================================
