'use client';

import React, { useState } from 'react';
import { Calendar, FlaskConical, Snowflake, ShoppingCart, BookOpen, LayoutDashboard, ClipboardList, LogOut, Lock, ChevronRight, Database, Menu, X, Settings } from 'lucide-react';
import { mockUsers, LabUser, rolePermissions } from '@/data/lab-data';
import { LabProvider, useLabContext } from './LabContext';

// 3-letter initials: first letter of first name + first 2 letters of last name
// e.g., "Marco Rasponi" → "MRA"
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.substring(0, 3).toUpperCase();
  const first = parts[0][0].toUpperCase();
  const last = parts[parts.length - 1].substring(0, 2).toUpperCase();
  return first + last;
}
import DashboardPage from './DashboardPage';
import InstrumentsPage from './InstrumentsPage';
import ReagentsPage from './ReagentsPage';
import CryoPage from './CryoPage';
import WishlistPage from './WishlistPage';
import ManualsPage from './ManualsPage';
import LogPage from './LogPage';
import AdminPage from './AdminPage';

// ============================================================
// Login Screen
// ============================================================
function LoginScreen({ onLogin }: { onLogin: (user: LabUser) => void }) {
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.pin === pin);
    if (user) {
      localStorage.setItem('mimic-lab-user', JSON.stringify(user));
      onLogin(user);
    } else {
      setError('Invalid email or PIN');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #102C53 0%, #1a3d6e 50%, #0d2240 100%)' }}>
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-40 h-40 rounded-full bg-white/5 blur-xl" />
        <div className="absolute bottom-20 right-20 w-60 h-60 rounded-full bg-[#4DC9FF]/10 blur-2xl" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full bg-white/5 blur-lg" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-4">
            <FlaskConical className="w-8 h-8 text-[#4DC9FF]" />
          </div>
          <h1 className="text-3xl font-bold text-white font-manrope">MiMic Lab Manager</h1>
          <p className="text-white/60 mt-2 font-manrope">Organ-on-Chip Laboratory</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 font-manrope">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@polimi.it"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none transition-all font-manrope text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 font-manrope">PIN</label>
              <input
                type="password"
                value={pin}
                onChange={e => setPin(e.target.value)}
                placeholder="****"
                maxLength={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none transition-all font-manrope text-sm tracking-widest"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl font-manrope">{error}</div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#102C53] text-white rounded-xl font-semibold hover:bg-[#1a3d6e] transition-colors font-manrope flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              Access Lab
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <button
              onClick={() => setShowDemo(!showDemo)}
              className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors font-manrope flex items-center justify-center gap-1"
            >
              Demo Credentials
              <ChevronRight className={`w-3 h-3 transition-transform ${showDemo ? 'rotate-90' : ''}`} />
            </button>
            {showDemo && (
              <div className="mt-3 space-y-1.5 text-xs text-gray-500 font-mono">
                <div className="flex justify-between"><span>Admin:</span><span>admin@polimi.it / 0000</span></div>
                <div className="flex justify-between"><span>PI:</span><span>marco.rasponi@polimi.it / 1234</span></div>
                <div className="flex justify-between"><span>Lab Mgr:</span><span>cecilia.palma@polimi.it / 5678</span></div>
                <div className="flex justify-between"><span>PostDoc:</span><span>roberta.visone@polimi.it / 3456</span></div>
                <div className="flex justify-between"><span>PhD:</span><span>alice.bianchi@polimi.it / 1111</span></div>
                <div className="flex justify-between"><span>MSc:</span><span>giulia.ferretti@polimi.it / 2222</span></div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-white/30 text-xs mt-6 font-manrope">
          MiMic Lab &middot; DEIB &middot; Politecnico di Milano
        </p>
      </div>
    </div>
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
              {getInitials(user.name)}
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
                  {getInitials(user.name)}
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
            {getInitials(user.name)}
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
// Main Export
// ============================================================
export default function LabApp() {
  const [user, setUser] = useState<LabUser | null>(null);
  const [checked, setChecked] = useState(false);

  // Check for existing session
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('mimic-lab-user');
      if (saved) setUser(JSON.parse(saved));
    } catch { /* noop */ }
    setChecked(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('mimic-lab-user');
    setUser(null);
  };

  if (!checked) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-400 font-manrope">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return (
    <LabProvider user={user}>
      <AppShell onLogout={handleLogout} />
    </LabProvider>
  );
}
