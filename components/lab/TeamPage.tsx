'use client';

import { useState, useMemo } from 'react';
import { Search, Mail, UserCheck } from 'lucide-react';
import { useLabContext } from './LabContext';
import UserDetailModal from './UserDetailModal';
import { LabUser, UserRole, rolePermissions, generateAbbreviation, formatDate, SUPERVISED_ROLES } from '@/data/lab-data';

const ROLE_ORDER: UserRole[] = ['admin', 'pi', 'researcher', 'lab_manager', 'project_manager', 'postdoc', 'phd', 'msc', 'guest'];

// Lab directory, visible to every member. Non-sensitive info only
// (no person code — that stays in the admin panel).
export default function TeamPage() {
  const { users, projects, certifications } = useLabContext();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'alumni'>('active');
  const [viewing, setViewing] = useState<LabUser | null>(null);

  const activeCount = users.filter(u => (u.status || 'active') === 'active').length;
  const alumniCount = users.length - activeCount;

  const rolesPresent = useMemo(() => ROLE_ORDER.filter(r => users.some(u => u.role === r && (u.status || 'active') === statusFilter)), [users, statusFilter]);

  const filtered = useMemo(() => users
    .filter(u => (u.status || 'active') === statusFilter)
    .filter(u => roleFilter === 'all' || u.role === roleFilter)
    .filter(u => !search || `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name)),
  [users, statusFilter, roleFilter, search]);

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 font-manrope">Lab Members</h1>
          <p className="text-xs text-gray-500 font-manrope">{activeCount} active member{activeCount !== 1 ? 's' : ''} · {alumniCount} alumni</p>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          <button onClick={() => { setStatusFilter('active'); setRoleFilter('all'); }} className={`px-3 py-1.5 text-xs font-medium font-manrope ${statusFilter === 'active' ? 'bg-[#102C53] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Active</button>
          <button onClick={() => { setStatusFilter('alumni'); setRoleFilter('all'); }} className={`px-3 py-1.5 text-xs font-medium font-manrope ${statusFilter === 'alumni' ? 'bg-[#102C53] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Alumni</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none w-48 bg-white" />
        </div>
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          <button onClick={() => setRoleFilter('all')}
            className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium font-manrope whitespace-nowrap ${roleFilter === 'all' ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            All
          </button>
          {rolesPresent.map(r => (
            <button key={r} onClick={() => setRoleFilter(roleFilter === r ? 'all' : r)}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-medium font-manrope whitespace-nowrap ${roleFilter === r ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {rolePermissions[r].label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 font-manrope text-center py-10">No {statusFilter === 'alumni' ? 'alumni' : 'members'} match your search.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(u => {
            const supervisor = users.find(x => x.id === u.supervisorId);
            const isAlumni = u.status === 'alumni';
            return (
              <button key={u.id} onClick={() => setViewing(u)}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all text-left flex items-start gap-3">
                <span className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl text-white text-xs font-bold font-manrope shrink-0 ${isAlumni ? 'bg-gray-400' : 'bg-[#102C53]'}`}>
                  {u.abbreviation || generateAbbreviation(u.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 font-manrope truncate">{u.name}</p>
                  <p className="text-[11px] text-gray-500 font-manrope">{rolePermissions[u.role].label} · {u.affiliation}</p>
                  {isAlumni ? (
                    <p className="text-[10px] text-gray-400 font-manrope mt-1">
                      {u.startDate ? formatDate(u.startDate) : '…'} – {u.endDate ? formatDate(u.endDate) : '…'}
                    </p>
                  ) : (
                    <>
                      <p className="text-[10px] text-gray-400 font-manrope mt-1 flex items-center gap-1 truncate"><Mail size={10} className="shrink-0" />{u.email}</p>
                      {SUPERVISED_ROLES.includes(u.role) && supervisor && (
                        <p className="text-[10px] text-gray-400 font-manrope flex items-center gap-1 truncate"><UserCheck size={10} className="shrink-0" />{supervisor.name}</p>
                      )}
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {viewing && (
        <UserDetailModal
          user={viewing}
          users={users}
          projects={projects}
          certifications={certifications}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
