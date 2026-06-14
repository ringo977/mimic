'use client';

/**
 * Password reset: request email → Supabase sends link → user lands here with hash → set new password.
 * In Supabase Dashboard → Authentication → URL configuration, add Redirect URLs (exact):
 *   https://ringo977.github.io/mimic/lab/reset-password
 *   https://mimic.polimi.it/lab/reset-password
 *   https://www.mimic.polimi.it/lab/reset-password   (when active)
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { KeyRound, Lock, ArrowLeft, ShieldCheck } from 'lucide-react';
import AuthShell from './AuthShell';
import { supabase } from '@/lib/supabase';
import { siteBasePath } from '@/lib/site-base-path';

type Phase = 'loading' | 'request' | 'verify-mfa' | 'set-password' | 'email-sent' | 'password-updated';

function recoveryRedirectUrl(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${siteBasePath}/lab/reset-password`;
}

function hashLooksLikeRecovery(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hash;
  return h.includes('type=recovery') || h.includes('access_token');
}

export default function LabPasswordResetPage() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /** Check if user has MFA enrolled and needs AAL2 elevation.
   *  Recovery sessions may report AAL level incorrectly, so we check
   *  directly for enrolled TOTP factors instead of relying on AAL data. */
  const checkMfaAndProceed = async () => {
    const dbg: string[] = [];
    try {
      const { data: { session } } = await supabase.auth.getSession();
      dbg.push(`session: ${!!session} ${session?.user?.email || 'no-email'}`);
      if (!session) { dbg.push('→ no session, going to request'); localStorage.setItem('RESET_DBG', dbg.join(' | ')); setPhase('request'); return; }

      const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors();
      dbg.push(`listFactors: ${JSON.stringify(factors)} err: ${fErr?.message || 'none'}`);
      const totp = factors?.totp?.find(f => f.status === 'verified');
      dbg.push(`totp: ${totp?.id || 'NONE'}`);
      if (totp) {
        setMfaFactorId(totp.id);
        setPhase('verify-mfa');
        dbg.push('→ verify-mfa');
        localStorage.setItem('RESET_DBG', dbg.join(' | '));
        return;
      }

      dbg.push('→ set-password (no totp)');
      localStorage.setItem('RESET_DBG', dbg.join(' | '));
      setPhase('set-password');
    } catch (err: any) {
      dbg.push(`CAUGHT: ${err?.message || err}`);
      localStorage.setItem('RESET_DBG', dbg.join(' | '));
      setPhase('set-password');
    }
  };

  useEffect(() => {
    let mounted = true;

    const tryRecoverySession = async (): Promise<boolean> => {
      if (!hashLooksLikeRecovery()) return false;
      for (let i = 0; i < 8; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) return true;
        await new Promise(r => setTimeout(r, 120));
      }
      return false;
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === 'PASSWORD_RECOVERY' && session) {
        setError('');
        checkMfaAndProceed();
      }
    });

    (async () => {
      if (await tryRecoverySession()) {
        if (mounted) await checkMfaAndProceed();
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session && hashLooksLikeRecovery()) {
        await checkMfaAndProceed();
      } else {
        setPhase('request');
      }
    })();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const sendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // NOTE: we do not pre-check lab_users membership here. With RLS enabled the
    // table is not readable while signed out, so the check would wrongly fail.
    // Supabase only delivers the recovery email if the auth user actually exists.

    const redirectTo = recoveryRedirectUrl();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    if (resetError) {
      setError(resetError.message);
      setLoading(false);
      return;
    }

    setPhase('email-sent');
    setLoading(false);
  };

  const verifyMfaCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeErr || !challenge) {
        setError(challengeErr?.message || 'Failed to create MFA challenge.');
        setLoading(false);
        return;
      }

      const { error: verifyErr } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: totpCode.trim(),
      });

      if (verifyErr) {
        setError('Invalid code. Please try again.');
        setTotpCode('');
        setLoading(false);
        return;
      }

      // Force session refresh so the AAL2 token is persisted in the client
      await supabase.auth.refreshSession();

      // Confirm we actually reached AAL2
      const { data: aalCheck } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalCheck?.currentLevel !== 'aal2') {
        setError('Could not elevate session to AAL2. Please sign in normally and change your password from account settings.');
        setLoading(false);
        return;
      }

      // Session is now AAL2 — proceed to password form
      setPhase('set-password');
      setError('');
    } catch {
      setError('MFA verification failed. Please try again.');
    }
    setLoading(false);
  };

  const submitNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== password2) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    // Ensure AAL2 session token is fresh before the update call
    await supabase.auth.refreshSession();

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    setPhase('password-updated');
    setLoading(false);
  };

  if (phase === 'loading') {
    return (
      <AuthShell>
        <div className="text-white/70 text-sm font-manrope text-center py-8">Loading…</div>
      </AuthShell>
    );
  }

  if (phase === 'email-sent') {
    return (
      <AuthShell>
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 font-manrope mb-2">Check your email</h2>
          <p className="text-sm text-gray-600 font-manrope mb-6">
            We sent a reset link to <strong>{email}</strong>. Open it in this browser, then enter your new password on the page that opens.
          </p>
          <Link
            href="/lab"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-[#102C53] text-white rounded-xl font-semibold hover:bg-[#1a3d6e] transition-colors font-manrope"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (phase === 'password-updated') {
    return (
      <AuthShell>
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 font-manrope mb-2">Password updated</h2>
          <p className="text-sm text-gray-600 font-manrope mb-6">
            You can now sign in with your new password. Two-factor authentication will still apply if enabled on your account.
          </p>
          <Link
            href="/lab"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-[#102C53] text-white rounded-xl font-semibold hover:bg-[#1a3d6e] transition-colors font-manrope"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  if (phase === 'verify-mfa') {
    return (
      <AuthShell>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-6 h-6 text-[#102C53]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 font-manrope mb-1 text-center">Two-factor verification</h2>
          <p className="text-center text-sm text-gray-600 mb-6 font-manrope">
            Enter the 6-digit code from your authenticator app to continue.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl font-manrope mb-5">
              {error}
            </div>
          )}

          <form onSubmit={verifyMfaCode} className="space-y-4">
            <div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={totpCode}
                onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none transition-all font-manrope text-sm text-center tracking-[0.3em] text-lg"
                required
                disabled={loading}
                autoFocus
                autoComplete="one-time-code"
              />
            </div>
            <button
              type="submit"
              disabled={loading || totpCode.length < 6}
              className="w-full py-3.5 bg-[#102C53] text-white rounded-xl font-semibold hover:bg-[#1a3d6e] transition-colors font-manrope flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              {loading ? 'Verifying…' : 'Verify & continue'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link href="/lab" className="text-xs text-[#4DC9FF] hover:text-[#102C53] font-manrope font-medium">
              Cancel, back to sign in
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  if (phase === 'set-password') {
    return (
      <AuthShell>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <p className="text-center text-sm text-gray-600 mb-6 font-manrope">
            Choose a new password for your account.
          </p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl font-manrope mb-5">
              {error}
            </div>
          )}

          <form onSubmit={submitNewPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 font-manrope">New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none transition-all font-manrope text-sm"
                required
                minLength={6}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 font-manrope">Confirm password</label>
              <input
                type="password"
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                placeholder="Repeat password"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none transition-all font-manrope text-sm"
                required
                minLength={6}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#102C53] text-white rounded-xl font-semibold hover:bg-[#1a3d6e] transition-colors font-manrope flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              {loading ? 'Saving…' : 'Update password'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link href="/lab" className="text-xs text-[#4DC9FF] hover:text-[#102C53] font-manrope font-medium">
              Cancel, back to sign in
            </Link>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <p className="text-center text-sm text-gray-600 mb-6 font-manrope">
          Enter your lab email. We will send you a link to reset your password.
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl font-manrope mb-5">
            {error}
          </div>
        )}

        <form onSubmit={sendResetEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-manrope">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@polimi.it"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none transition-all font-manrope text-sm"
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#102C53] text-white rounded-xl font-semibold hover:bg-[#1a3d6e] transition-colors font-manrope flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <KeyRound className="w-4 h-4" />
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-5 text-center">
          <Link href="/lab" className="text-xs text-[#4DC9FF] hover:text-[#102C53] font-manrope font-medium">
            Back to sign in
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
