'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// First-party page-view tracking (see scripts/supabase-site-analytics.sql).
// Uses plain fetch against the Supabase REST API so the public site bundle
// doesn't pull in supabase-js. Runs only:
//   - on the production host (mimic.polimi.it),
//   - outside /lab (internal tool),
//   - with analytics consent from the cookie banner.

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vfruyyrpriymhmelgidr.supabase.co';
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcnV5eXJwcml5bWhtZWxnaWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTg5NTQsImV4cCI6MjA4NzQzNDk1NH0.LMp7GBjYR6hRiujRQmfYyQVlltnVORKDknwUM3QjaCQ';

const PROD_HOST = 'mimic.polimi.it';
const CONSENT_KEY = 'mimic-cookie-consent';
const VISIT_KEY = 'mimic-visit-id';

function hasAnalyticsConsent(): boolean {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    return stored ? JSON.parse(stored).analytics === true : false;
  } catch {
    return false;
  }
}

// Session-scoped random id (sessionStorage: gone when the tab closes).
// Returns [id, isNewSession] — the referrer is only meaningful on the
// first page view of a session.
function getVisitId(): [string, boolean] {
  let id = sessionStorage.getItem(VISIT_KEY);
  if (id) return [id, false];
  id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  sessionStorage.setItem(VISIT_KEY, id);
  return [id, true];
}

function detectDevice(): 'mobile' | 'tablet' | 'desktop' {
  const ua = navigator.userAgent;
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) {
    return 'tablet';
  }
  if (/Mobi|iPhone|Android/i.test(ua)) return 'mobile';
  return 'desktop';
}

const trackedPaths = new Set<string>();

function trackView(path: string) {
  if (window.location.hostname !== PROD_HOST) return;
  if (path.startsWith('/lab')) return;
  if (!hasAnalyticsConsent()) return;
  // Guard against duplicate events for the same path in quick succession
  // (e.g. consent event firing right after the route-change effect).
  const key = `${path}@${Math.floor(Date.now() / 3000)}`;
  if (trackedPaths.has(key)) return;
  trackedPaths.add(key);

  const [visitId, isNewSession] = getVisitId();
  const rawReferrer = document.referrer;
  const referrer =
    isNewSession && rawReferrer && !rawReferrer.includes(window.location.hostname)
      ? rawReferrer.slice(0, 300)
      : null;

  fetch(`${SUPABASE_URL}/rest/v1/page_views`, {
    method: 'POST',
    keepalive: true,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      path: path.slice(0, 300),
      referrer,
      device: detectDevice(),
      visit_id: visitId,
    }),
  }).catch(() => {
    /* tracking must never break the site */
  });
}

export default function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname) trackView(pathname);
  }, [pathname]);

  // If the visitor grants consent from the banner after landing,
  // count the page they are currently on.
  useEffect(() => {
    const handler = () => trackView(window.location.pathname);
    window.addEventListener('mimic-consent-granted', handler);
    return () => window.removeEventListener('mimic-consent-granted', handler);
  }, []);

  return null;
}
