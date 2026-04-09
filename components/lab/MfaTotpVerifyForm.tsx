'use client';

import { useState } from 'react';
import { Shield } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import AuthShell from './AuthShell';

type Props = {
  onVerified: () => void;
  onCancel?: () => void | Promise<void>;
  cancelLabel?: string;
  subtitle?: string;
  /** Fallback URL when using `onCancel` with preventDefault (non-lab flows). */
  exitHref?: string;
  /**
   * Full navigation to this URL (no preventDefault). Use `/lab/?switch_account=1` so the lab
   * layout script clears storage before React — works even with stale cached JS.
   */
  nativeSwitchHref?: string;
};

export default function MfaTotpVerifyForm({
  onVerified,
  onCancel,
  cancelLabel = 'Cancel',
  subtitle = 'Enter the code from your authenticator app',
  exitHref = '#',
  nativeSwitchHref,
}: Props) {
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const fromSession = sessionData.session?.user?.factors?.find(
        (f) => f.factor_type === 'totp' && f.status === 'verified'
      );

      const factors = await supabase.auth.mfa.listFactors();
      const fromList = factors.data?.totp?.[0];
      const totpFactor = fromList ?? fromSession;

      if (factors.error && !fromSession) {
        setError(factors.error.message);
        setLoading(false);
        return;
      }

      if (!totpFactor?.id) {
        setError('No authenticator found. Please contact admin.');
        setLoading(false);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactor.id,
        code: verifyCode,
      });

      if (verifyError) {
        setError('Invalid code. Please try again.');
        setVerifyCode('');
        setLoading(false);
        return;
      }

      await supabase.auth.refreshSession().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed. Please try again.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onVerified();
  };

  return (
    <AuthShell>
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6 text-[#102C53]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 font-manrope">Two-Factor Authentication</h2>
          <p className="text-sm text-gray-500 mt-1 font-manrope">{subtitle}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl font-manrope mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full px-4 py-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none transition-all font-manrope text-center tracking-[0.4em] font-mono text-2xl"
              required
              disabled={loading}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || verifyCode.length !== 6}
            className="w-full py-3.5 bg-[#102C53] text-white rounded-xl font-semibold hover:bg-[#1a3d6e] transition-colors font-manrope flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
        </form>

        {nativeSwitchHref && (
          <div className="mt-4 text-center">
            <a
              href={nativeSwitchHref}
              className="relative z-10 inline-block cursor-pointer text-xs text-gray-400 hover:text-gray-600 font-manrope transition-colors underline-offset-2 hover:underline"
            >
              {cancelLabel}
            </a>
          </div>
        )}
        {!nativeSwitchHref && onCancel && (
          <div className="mt-4 text-center">
            <a
              href={exitHref}
              className="relative z-10 inline-block cursor-pointer text-xs text-gray-400 hover:text-gray-600 font-manrope transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void onCancel();
              }}
            >
              {cancelLabel}
            </a>
          </div>
        )}
      </div>
    </AuthShell>
  );
}
