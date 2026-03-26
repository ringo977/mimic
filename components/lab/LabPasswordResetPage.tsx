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
import { KeyRound, Lock, ArrowLeft } from 'lucide-react';
import AuthShell from './AuthShell';
import { supabase } from '@/lib/supabase';
import { findLabUserByEmail } from '@/lib/supabase-users';
import { getStoredUsers } from '@/data/lab-data';
import { siteBasePath } from '@/lib/site-base-path';

type Phase = 'loading' | 'request' | 'set-password' | 'email-sent' | 'password-updated';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
        setPhase('set-password');
        setError('');
      }
    });

    (async () => {
      if (await tryRecoverySession()) {
        if (mounted) setPhase('set-password');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!mounted) return;
      if (session && hashLooksLikeRecovery()) {
        setPhase('set-password');
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

    const labUser = await findLabUserByEmail(email);
    if (!labUser) {
      const localUser = getStoredUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!localUser) {
        setError('This email is not authorized for the lab. Contact the lab admin.');
        setLoading(false);
        return;
      }
    }

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
