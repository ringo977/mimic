import { supabase } from '@/lib/supabase';
import { siteBasePath } from '@/lib/site-base-path';

/** Read `aal` claim from a Supabase access token (JWT). */
export function readAccessTokenAal(accessToken: string): string | null {
  try {
    const part = accessToken.split('.')[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(b64));
    return typeof json.aal === 'string' ? json.aal : null;
  } catch {
    return null;
  }
}

/** Remove all Supabase client keys (v2 uses `sb-*`, including auth and chunks). */
export function clearSupabaseAuthStorage(): void {
  if (typeof window === 'undefined') return;
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith('sb-')) keys.push(k);
  }
  for (const k of keys) localStorage.removeItem(k);
}

/** Before email/password sign-in, drop any stale session without a server round-trip. */
export async function clearAuthBeforeSignIn(): Promise<void> {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  clearSupabaseAuthStorage();
}

/**
 * Wipes client storage then navigates to `/lab/?switch_account=1` so the lab layout
 * `beforeInteractive` script also runs (double cleanup). Ends on a clean `/lab/`.
 */
export function hardRedirectToLabLogin(): void {
  if (typeof window === 'undefined') return;
  clearSupabaseAuthStorage();
  localStorage.removeItem('mimic-lab-user');
  sessionStorage.clear();
  const base = siteBasePath || '';
  window.location.replace(`${window.location.origin}${base}/lab/?switch_account=1`);
}
