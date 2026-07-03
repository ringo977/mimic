-- ============================================================
-- MiMic Lab Manager — Schema reference (disaster recovery)
-- ============================================================
-- PURPOSE: recreate all lab tables on a FRESH Supabase project if the
-- current one is ever lost. Reconstructed from the app's data layer
-- (lib/supabase-data.ts, lib/supabase-users.ts) in July 2026.
-- The LIVE database remains the source of truth for exact types.
--
-- Full recovery procedure:
--   1. Run this script                       (tables)
--   2. Run supabase-rls-policies.sql         (RLS base)
--   3. Run supabase-booking-settings.sql     (app_settings + half hours)
--   4. Run supabase-security-hardening.sql   (membership gate & co.)
--   5. Run supabase-reagent-stock-rpc.sql    (atomic stock RPC)
--   6. Run supabase-user-profile-fields.sql  (profile fields + alumni)
--   7. Run supabase-absences.sql             (absences table + policy)
--   8. Create the 'manuals' storage bucket (Storage → New bucket)
--   9. Lab app → Admin → Backup → Restore Database (JSON) + Restore PDFs
--  10. Recreate auth users (Authentication → Add user) and update
--      NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY in the deploy environments
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
  projects       text[] NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS locations (
  id       text PRIMARY KEY,
  name     text NOT NULL,
  building text,
  floor    text,
  notes    text
);

CREATE TABLE IF NOT EXISTS instruments (
  id                        text PRIMARY KEY,
  name                      text NOT NULL,
  category                  text,
  location                  text,
  location_id               text,
  requires_certification    boolean NOT NULL DEFAULT false,
  description               text,
  icon                      text,
  serial_number             text,
  manufacturer              text,
  model                     text,
  purchase_date             text,
  commission_date           text,
  maintenance_period_months numeric,
  last_maintenance_date     text,
  next_maintenance_date     text
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
  num_doors      integer
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
  supplier        text,
  catalog_number  text,
  alert_threshold numeric NOT NULL DEFAULT 0
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
  file_url     text
);

-- app_settings is created by supabase-booking-settings.sql (step 3).
-- absences is created by supabase-absences.sql (step 7).

-- ============================================================
-- DONE. Continue with the RLS scripts (steps 2-7 in the header).
-- ============================================================
