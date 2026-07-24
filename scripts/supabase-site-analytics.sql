-- ============================================================
-- MiMic Lab — Public site analytics (July 2026)
-- ============================================================
-- Run this in: Supabase Dashboard → SQL Editor. Idempotent.
-- Requires: supabase-security-hardening.sql (is_lab_member/is_lab_admin).
--
-- First-party page-view tracking for the PUBLIC website
-- (mimic.polimi.it). Visitors are anonymous (Supabase role `anon`):
-- they may only INSERT rows. Lab members read aggregated stats via
-- the lab app ("Site Stats" page, admin only). No third parties,
-- no cross-site cookies; tracking runs only with analytics consent
-- (see components/SiteAnalytics.tsx and CookieConsent.tsx).
-- ============================================================

CREATE TABLE IF NOT EXISTS page_views (
  id       bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ts       timestamptz NOT NULL DEFAULT now(),
  path     text NOT NULL CHECK (char_length(path) <= 300),
  referrer text CHECK (char_length(referrer) <= 300),
  device   text CHECK (device IN ('mobile', 'tablet', 'desktop')),
  visit_id text CHECK (char_length(visit_id) <= 40)
);

CREATE INDEX IF NOT EXISTS page_views_ts_idx   ON page_views (ts);
CREATE INDEX IF NOT EXISTS page_views_path_idx ON page_views (path);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "page_views_insert" ON page_views;
DROP POLICY IF EXISTS "page_views_select" ON page_views;
DROP POLICY IF EXISTS "page_views_delete" ON page_views;

-- Public site visitors are not authenticated: allow anonymous inserts.
-- (Insert-only: anon cannot read, update or delete anything.)
CREATE POLICY "page_views_insert" ON page_views
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Only lab members can read; only admins can delete (cleanup).
CREATE POLICY "page_views_select" ON page_views
  FOR SELECT TO authenticated USING (is_lab_member());
CREATE POLICY "page_views_delete" ON page_views
  FOR DELETE TO authenticated USING (is_lab_admin());

-- ============================================================
-- Aggregated stats for the lab app dashboard.
-- SECURITY INVOKER (default): RLS applies inside the function, so
-- anonymous callers get empty results while lab members get data.
-- ============================================================
CREATE OR REPLACE FUNCTION site_stats(days_back int DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_views', (
      SELECT count(*) FROM page_views
      WHERE ts >= now() - make_interval(days => days_back)
    ),
    'unique_sessions', (
      SELECT count(DISTINCT visit_id) FROM page_views
      WHERE ts >= now() - make_interval(days => days_back)
    ),
    'by_day', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('day', day, 'views', views, 'sessions', sessions) ORDER BY day), '[]'::jsonb)
      FROM (
        SELECT ts::date AS day, count(*) AS views, count(DISTINCT visit_id) AS sessions
        FROM page_views
        WHERE ts >= now() - make_interval(days => days_back)
        GROUP BY 1
      ) d
    ),
    'top_pages', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('path', path, 'views', views) ORDER BY views DESC), '[]'::jsonb)
      FROM (
        SELECT path, count(*) AS views
        FROM page_views
        WHERE ts >= now() - make_interval(days => days_back)
        GROUP BY path ORDER BY count(*) DESC LIMIT 15
      ) p
    ),
    'top_referrers', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('referrer', referrer, 'views', views) ORDER BY views DESC), '[]'::jsonb)
      FROM (
        SELECT referrer, count(*) AS views
        FROM page_views
        WHERE ts >= now() - make_interval(days => days_back)
          AND referrer IS NOT NULL AND referrer <> ''
        GROUP BY referrer ORDER BY count(*) DESC LIMIT 15
      ) r
    ),
    'devices', (
      SELECT coalesce(jsonb_object_agg(device, views), '{}'::jsonb)
      FROM (
        SELECT coalesce(device, 'desktop') AS device, count(*) AS views
        FROM page_views
        WHERE ts >= now() - make_interval(days => days_back)
        GROUP BY 1
      ) dv
    )
  );
$$;
