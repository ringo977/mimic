'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Calendar, FlaskConical, Snowflake, ShoppingCart, BookOpen, LayoutDashboard, ClipboardList, LogOut, Lock, ChevronRight, Database, Menu, X, Settings, Shield, Smartphone } from 'lucide-react';
import { LabUser, rolePermissions } from '@/data/lab-data';
import { LabProvider, useLabContext } from './LabContext';
import { supabase } from '@/lib/supabase';
import { findLabUserByEmail } from '@/lib/supabase-users';

function getInitials(name: string, abbreviation?: string): string {
  if (abbreviation) return abbreviation;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.substring(0, 3).toUpperCase();
  return parts[0][0].toUpperCase() + parts[parts.length - 1].substring(0, 2).toUpperCase();
}
import DashboardPage from './DashboardPage';
import InstrumentsPage from './InstrumentsPage';
import ReagentsPage from './ReagentsPage';
import CryoPage from './CryoPage';
import WishlistPage from './WishlistPage';
import ManualsPage from './ManualsPage';
import LogPage from './LogPage';
import AdminPage from './AdminPage';
import AuthShell from './AuthShell';

// ============================================================
// Login Screen — Email + Password
// ============================================================
function LoginScreen({ authError }: { authError?: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Clear any stale session first
    await supabase.auth.signOut();

    const labUser = await findLabUserByEmail(email);
    if (!labUser) {
      setError('This email is not authorized. Contact the lab admin to get access.');
      setLoading(false);
      return;
    }

    if (isSignUp) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        setLoading(false);
        return;
      }
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
        setError('Password must contain uppercase, lowercase, and a number.');
        setLoading(false);
        return;
      }
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        if (signUpError.message.includes('already registered') || signUpError.message.includes('already been registered')) {
          // Try signing in instead
          const { error: fallbackError } = await supabase.auth.signInWithPassword({ email, password });
          if (fallbackError) {
            setError('This email is registered but the password is incorrect, or it was created with a different method. Contact the lab admin.');
          }
        } else {
          setError(signUpError.message);
        }
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        if (signInError.message.includes('Invalid login')) {
          setError('Invalid email or password. If this is your first time, click "Create account".');
        } else {
          setError(signInError.message);
        }
      }
    }
    setLoading(false);
  };

  const displayError = authError || error;

  return (
    <AuthShell>
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <p className="text-center text-sm text-gray-600 mb-6 font-manrope">
          {isSignUp ? 'Create your account to access the lab.' : 'Sign in with your credentials.'}
        </p>

        {displayError && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl font-manrope mb-5">
            {displayError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-manrope">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isSignUp ? 'Min 8 chars, upper + lower + number' : 'Enter your password'}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none transition-all font-manrope text-sm"
              required
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-[#102C53] text-white rounded-xl font-semibold hover:bg-[#1a3d6e] transition-colors font-manrope flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-gray-100 text-center space-y-2">
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
            className="text-xs text-[#4DC9FF] hover:text-[#102C53] font-manrope font-medium transition-colors block w-full"
          >
            {isSignUp ? 'Already have an account? Sign in' : 'First time? Create account'}
          </button>
          {!isSignUp && (
            <Link
              href="/lab/reset-password"
              className="text-xs text-gray-500 hover:text-[#102C53] font-manrope font-medium transition-colors inline-block"
            >
              Forgot password?
            </Link>
          )}
        </div>

        <div className="mt-3">
          <p className="text-xs text-gray-400 text-center font-manrope">
            Access is restricted to authorized lab members.<br />
            Contact the lab admin if you need access.
          </p>
        </div>
      </div>
    </AuthShell>
  );
}

// ============================================================
// TOTP Enrollment Screen (first-time MFA setup)
// ============================================================
function EnrollMFAScreen({ onEnrolled, onSkip, canSkip = true }: { onEnrolled: () => void; onSkip: () => void; canSkip?: boolean }) {
  const [factorId, setFactorId] = useState('');
  const [qr, setQR] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) {
        setError(error.message);
        return;
      }
      setFactorId(data.id);
      setQR(data.totp.qr_code);
    })();
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) {
        setError(challenge.error.message);
        setLoading(false);
        return;
      }

      const result = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code: verifyCode,
      });

      if (result.error) {
        setError('Invalid code. Please try again.');
        setVerifyCode('');
        setLoading(false);
        return;
      }
    } catch (err) {
      // AuthSessionMissingError can occur when Supabase refreshes the session
      // after successful verification. If the factor is now verified, proceed.
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!data || data.currentLevel !== 'aal2') {
        setError('Verification failed. Please try again.');
        setVerifyCode('');
        setLoading(false);
        return;
      }
    }

    onEnrolled();
  };

  return (
    <AuthShell>
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Smartphone className="w-6 h-6 text-[#102C53]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 font-manrope">Set up 2-Factor Authentication</h2>
          <p className="text-sm text-gray-500 mt-1 font-manrope">
            Scan this QR code with your authenticator app
          </p>
          <p className="text-xs text-gray-400 mt-1 font-manrope">
            (Google Authenticator, Authy, Microsoft Authenticator)
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl font-manrope mb-4">
            {error}
          </div>
        )}

        {qr && (
          <div className="flex justify-center mb-5">
            <div className="p-3 bg-white border-2 border-gray-100 rounded-xl">
              <img src={qr} alt="QR Code" className="w-48 h-48" />
            </div>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-manrope">Verification code</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={verifyCode}
              onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 6-digit code"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none transition-all font-manrope text-sm text-center tracking-[0.3em] font-mono text-lg"
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
            <Shield className="w-4 h-4" />
            {loading ? 'Verifying...' : 'Activate 2FA'}
          </button>
        </form>

        {canSkip && (
          <div className="mt-4 text-center">
            <button
              onClick={onSkip}
              className="text-xs text-gray-400 hover:text-gray-600 font-manrope transition-colors"
            >
              Skip for now
            </button>
          </div>
        )}
        {!canSkip && (
          <div className="mt-4">
            <p className="text-xs text-amber-600 text-center font-manrope bg-amber-50 px-3 py-2 rounded-lg">
              Two-factor authentication is required for your role.
            </p>
          </div>
        )}
      </div>
    </AuthShell>
  );
}

// ============================================================
// TOTP Verification Screen (returning users with MFA)
// ============================================================
function VerifyMFAScreen({ onVerified }: { onVerified: () => void }) {
  const [verifyCode, setVerifyCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) {
        setError(factors.error.message);
        setLoading(false);
        return;
      }

      const totpFactor = factors.data.totp[0];
      if (!totpFactor) {
        setError('No authenticator found. Please contact admin.');
        setLoading(false);
        return;
      }

      const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challenge.error) {
        setError(challenge.error.message);
        setLoading(false);
        return;
      }

      const result = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.data.id,
        code: verifyCode,
      });

      if (result.error) {
        setError('Invalid code. Please try again.');
        setVerifyCode('');
        setLoading(false);
        return;
      }
    } catch (err) {
      // AuthSessionMissingError can occur when Supabase refreshes the session
      // after successful verification. Check if MFA actually succeeded.
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (!data || data.currentLevel !== 'aal2') {
        setError('Verification failed. Please try again.');
        setVerifyCode('');
        setLoading(false);
        return;
      }
    }

    onVerified();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthShell>
      <div className="bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <Shield className="w-6 h-6 text-[#102C53]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 font-manrope">Two-Factor Authentication</h2>
          <p className="text-sm text-gray-500 mt-1 font-manrope">
            Enter the code from your authenticator app
          </p>
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

        <div className="mt-4 text-center">
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 font-manrope transition-colors"
          >
            Use a different account
          </button>
        </div>
      </div>
    </AuthShell>
  );
}

// ============================================================
// Navigation Shell
// ============================================================
const navItems = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard, requiresPerm: null },
  { id: 'instruments', label: 'Instruments', icon: Calendar, requiresPerm: null },
  { id: 'reagents', label: 'Reagents', icon: FlaskConical, requiresPerm: null },
  { id: 'cryo', label: 'Cryo', icon: Snowflake, requiresPerm: null },
  { id: 'wishlist', label: 'Wishlist', icon: ShoppingCart, requiresPerm: 'canRequestOrders' as const },
  { id: 'manuals', label: 'Manuals', icon: BookOpen, requiresPerm: null },
  { id: 'log', label: 'Activity Log', icon: ClipboardList, requiresPerm: 'canViewLog' as const },
  { id: 'database', label: 'Database', icon: Database, requiresPerm: 'canViewDatabase' as const },
  { id: 'admin', label: 'Admin Panel', icon: Settings, requiresPerm: 'canAdmin' as const },
];

function AppShell({ onLogout }: { onLogout: () => void }) {
  const { user, permissions, currentPage, setCurrentPage } = useLabContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredNav = navItems.filter(item => {
    if (!item.requiresPerm) return true;
    return (permissions as unknown as Record<string, boolean>)[item.requiresPerm];
  });

  // Mobile bottom nav: show first 5 items
  const mobileNav = filteredNav.slice(0, 5);

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage onNavigate={setCurrentPage} />;
      case 'instruments': return <InstrumentsPage />;
      case 'reagents': return <ReagentsPage />;
      case 'cryo': return <CryoPage />;
      case 'wishlist': return <WishlistPage />;
      case 'manuals': return <ManualsPage />;
      case 'log': return <LogPage />;
      case 'database': return <LogPage showDatabase />;
      case 'admin': return <AdminPage />;
      default: return <DashboardPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 shrink-0">
        {/* User header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#102C53] flex items-center justify-center text-white font-bold text-sm font-manrope">
              {getInitials(user.name, user.abbreviation)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate font-manrope">{user.name}</p>
              <p className="text-xs text-[#4DC9FF] font-manrope">{rolePermissions[user.role].label}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {filteredNav.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentPage(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-manrope transition-all ${
                  active
                    ? 'bg-[#102C53] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all font-manrope"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-[70] flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-white flex flex-col shadow-xl">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#102C53] flex items-center justify-center text-white font-bold text-sm">
                  {getInitials(user.name, user.abbreviation)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 font-manrope">{user.name}</p>
                  <p className="text-xs text-[#4DC9FF] font-manrope">{rolePermissions[user.role].label}</p>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-gray-400"><X size={20} /></button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {filteredNav.map(item => {
                const Icon = item.icon;
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setCurrentPage(item.id); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-manrope transition-all ${active ? 'bg-[#102C53] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="p-3 border-t border-gray-100">
              <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all font-manrope">
                <LogOut size={18} /> Logout
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1.5 text-gray-600">
            <Menu size={22} />
          </button>
          <h1 className="text-sm font-semibold text-[#102C53] font-manrope">
            {filteredNav.find(n => n.id === currentPage)?.label || 'Lab Manager'}
          </h1>
          <div className="w-8 h-8 rounded-full bg-[#102C53] flex items-center justify-center text-white text-xs font-bold">
            {getInitials(user.name, user.abbreviation)}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {renderPage()}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-[61]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="flex items-center justify-around px-2 py-1.5">
            {mobileNav.map(item => {
              const Icon = item.icon;
              const active = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${active ? 'text-[#102C53]' : 'text-gray-400'}`}
                >
                  <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                  <span className="text-[10px] font-manrope font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}

// ============================================================
// Loading Screen — shown while connecting to Supabase
// ============================================================
function LoadingScreen() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const message = elapsed < 3
    ? 'Connecting...'
    : elapsed < 8
      ? 'Connecting to database...'
      : 'The database is waking up, please wait...';

  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-2 border-white/10" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#4DC9FF] animate-spin" />
        </div>
        <p className="text-white/70 text-sm font-manrope animate-pulse">{message}</p>
      </div>
    </AuthShell>
  );
}

// ============================================================
// Main Export
// ============================================================
type AuthStep = 'loading' | 'login' | 'enroll_mfa' | 'verify_mfa' | 'ready';

export default function LabApp() {
  const [user, setUser] = useState<LabUser | null>(null);
  const [step, setStep] = useState<AuthStep>('loading');
  const [authError, setAuthError] = useState('');
  const stepRef = React.useRef<AuthStep>('loading');

  const updateStep = useCallback((s: AuthStep) => {
    stepRef.current = s;
    setStep(s);
  }, []);

  const resolveLabUser = useCallback(async (email: string): Promise<LabUser | null> => {
    return findLabUserByEmail(email);
  }, []);

  const evaluateMFA = useCallback(async (): Promise<AuthStep> => {
    try {
      const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data && data.nextLevel === 'aal2' && data.currentLevel !== 'aal2') {
        return 'verify_mfa';
      }
      const factors = await supabase.auth.mfa.listFactors();
      const hasTotp = factors.data?.totp && factors.data.totp.length > 0;
      if (!hasTotp) return 'enroll_mfa';
    } catch { /* ignore */ }
    return 'ready';
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email && mounted) {
        const labUser = await resolveLabUser(session.user.email);
        if (labUser && mounted) {
          localStorage.setItem('mimic-lab-user', JSON.stringify(labUser));
          setUser(labUser);
          setAuthError('');
          const mfa = await evaluateMFA();
          if (mounted) updateStep(mfa);
        } else if (mounted) {
          setAuthError(`Access denied for ${session.user.email}. Contact the lab admin.`);
          await supabase.auth.signOut();
          updateStep('login');
        }
      } else if (mounted) {
        updateStep('login');
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const current = stepRef.current;
        if (current === 'enroll_mfa' || current === 'verify_mfa' || current === 'ready') return;

        if (session?.user?.email && mounted) {
          const labUser = await resolveLabUser(session.user.email);
          if (labUser && mounted) {
            localStorage.setItem('mimic-lab-user', JSON.stringify(labUser));
            setUser(labUser);
            setAuthError('');
            const mfa = await evaluateMFA();
            if (mounted) updateStep(mfa);
          } else if (mounted) {
            setAuthError(`Access denied for ${session.user.email}. Contact the lab admin.`);
            await supabase.auth.signOut();
            updateStep('login');
          }
        } else if (mounted) {
          localStorage.removeItem('mimic-lab-user');
          setUser(null);
          updateStep('login');
        }
      }
    );

    init();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [resolveLabUser, evaluateMFA, updateStep]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('mimic-lab-user');
    setUser(null);
    updateStep('login');
  };

  if (step === 'loading') {
    return <LoadingScreen />;
  }

  if (step === 'login') {
    return <LoginScreen authError={authError} />;
  }

  if (step === 'enroll_mfa') {
    // Admins and PIs must set up 2FA — no skip allowed
    const mfaRequired = user?.role === 'admin' || user?.role === 'pi' || user?.role === 'lab_manager' || user?.isAdmin;
    return (
      <EnrollMFAScreen
        onEnrolled={() => updateStep('ready')}
        onSkip={() => updateStep('ready')}
        canSkip={!mfaRequired}
      />
    );
  }

  if (step === 'verify_mfa') {
    return <VerifyMFAScreen onVerified={() => updateStep('ready')} />;
  }

  if (!user) {
    return <LoginScreen authError={authError} />;
  }

  return (
    <LabProvider user={user}>
      <AppShell onLogout={handleLogout} />
    </LabProvider>
  );
}
