// Deep links into the Lab Manager, carried in the URL hash so they work on
// the static export without any server route: /lab/#reagent=<id>.
// Printed as QR codes on the shelf, they open the withdraw dialog of that
// reagent straight after login (LabContext reads the hash once at start).
import { siteBasePath } from './site-base-path';

const KEY = 'reagent';

/** `#reagent=<id>` → id, or null when the hash carries nothing for us. */
export function readReagentDeepLink(): string | null {
  if (typeof window === 'undefined') return null;
  const h = window.location.hash.replace(/^#/, '');
  if (!h) return null;
  const params = new URLSearchParams(h);
  const id = params.get(KEY);
  return id && /^[\w-]+$/.test(id) ? id : null;
}

/** Drop the hash once consumed, so a reload does not reopen the dialog. */
export function clearDeepLink(): void {
  if (typeof window === 'undefined') return;
  if (!window.location.hash) return;
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

/** Absolute URL to print: https://www.mimic.polimi.it/lab/#reagent=<id>. */
export function reagentDeepLinkUrl(reagentId: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://www.mimic.polimi.it';
  return `${origin}${siteBasePath}/lab/#${KEY}=${encodeURIComponent(reagentId)}`;
}
