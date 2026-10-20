'use client';

import { useState, useMemo } from 'react';
import { Search, Mail, UserCheck, UserPlus, X, CheckCircle2 } from 'lucide-react';
import { useLabContext } from './LabContext';
import UserDetailModal from './UserDetailModal';
import { LabUser, UserRole, UserAffiliation, rolePermissions, generateAbbreviation, generateId, formatDate, SUPERVISED_ROLES, SUPERVISOR_ROLES, MEMBER_MANAGER_ROLES, ADDABLE_ROLES } from '@/data/lab-data';
import { useDialogA11y } from '@/components/ui/useDialogA11y';
import { fetchSignupCode } from '@/lib/supabase-users';

const ROLE_ORDER: UserRole[] = ['admin', 'pi', 'researcher', 'lab_manager', 'project_manager', 'postdoc', 'phd', 'msc', 'guest'];
const AFFILIATIONS: UserAffiliation[] = ['MiMic Lab', 'DEIB', 'POLIMI', 'External'];

// Lab directory, visible to every member. Non-sensitive info only
// (no person code — that stays in the admin panel).
export default function TeamPage() {
  const { user, users, projects, certifications, addUser, permissions } = useLabContext();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'alumni'>('active');
  const [viewing, setViewing] = useState<LabUser | null>(null);
  const [adding, setAdding] = useState(false);
  // Supervisors register their own students/guests; the server policy
  // (lab_users_insert v2) only lets them insert msc/guest rows with
  // themselves as supervisor. Admins use the Admin Panel for everything else.
  const canAddMembers = permissions.canAdmin || MEMBER_MANAGER_ROLES.includes(user.role);
  const canAddStudents = canAddMembers || SUPERVISOR_ROLES.includes(user.role);

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
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button onClick={() => { setStatusFilter('active'); setRoleFilter('all'); }} className={`px-3 py-1.5 text-xs font-medium font-manrope ${statusFilter === 'active' ? 'bg-[#102C53] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Active</button>
            <button onClick={() => { setStatusFilter('alumni'); setRoleFilter('all'); }} className={`px-3 py-1.5 text-xs font-medium font-manrope ${statusFilter === 'alumni' ? 'bg-[#102C53] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Alumni</button>
          </div>
          {canAddStudents && (
            <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#102C53] text-white rounded-lg text-xs font-semibold font-manrope hover:bg-[#1a3d6e]">
              <UserPlus size={14} /> {canAddMembers ? 'Add member' : 'Add student'}
            </button>
          )}
        </div>
      </div>

      {adding && (
        <AddStudentModal
          supervisor={user}
          anyRole={canAddMembers}
          supervisors={users.filter(u => (u.status || 'active') === 'active' && SUPERVISOR_ROLES.includes(u.role))}
          existingEmails={users.map(u => u.email.toLowerCase())}
          onClose={() => setAdding(false)}
          onAdd={addUser}
        />
      )}

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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
          {filtered.map(u => {
            const supervisor = users.find(x => x.id === u.supervisorId);
            const isAlumni = u.status === 'alumni';
            return (
              <button key={u.id} onClick={() => setViewing(u)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left">
                <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-white text-[10px] font-bold font-manrope shrink-0 ${isAlumni ? 'bg-gray-400' : 'bg-[#102C53]'}`}>
                  {u.abbreviation || generateAbbreviation(u.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 font-manrope truncate">{u.name}</p>
                  <p className="text-[11px] text-gray-400 font-manrope truncate sm:hidden">{rolePermissions[u.role].label} · {u.affiliation}</p>
                  <p className="text-[11px] text-gray-400 font-manrope truncate hidden sm:flex items-center gap-1"><Mail size={10} className="shrink-0" />{u.email}</p>
                </div>
                <div className="hidden sm:block text-right shrink-0 w-40">
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium font-manrope">{rolePermissions[u.role].label}</span>
                  <p className="text-[10px] text-gray-400 font-manrope mt-0.5">{u.affiliation}</p>
                </div>
                <div className="hidden md:block text-right shrink-0 w-44">
                  {isAlumni ? (
                    <p className="text-[10px] text-gray-400 font-manrope">{u.startDate ? formatDate(u.startDate) : '…'} – {u.endDate ? formatDate(u.endDate) : '…'}</p>
                  ) : SUPERVISED_ROLES.includes(u.role) && supervisor ? (
                    <p className="text-[10px] text-gray-400 font-manrope flex items-center justify-end gap-1 truncate"><UserCheck size={10} className="shrink-0" />{supervisor.name}</p>
                  ) : u.startDate ? (
                    <p className="text-[10px] text-gray-400 font-manrope">since {formatDate(u.startDate)}</p>
                  ) : null}
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

// ------------------------------------------------------------
// "Add student": a supervisor registers an MSc student or a guest.
// The person then creates their own password on the login page.
// ------------------------------------------------------------
function AddStudentModal({ supervisor, anyRole, supervisors, existingEmails, onClose, onAdd }: {
  supervisor: LabUser;
  anyRole: boolean;          // managers: any role except admin/PI, any supervisor
  supervisors: LabUser[];
  existingEmails: string[];
  onClose: () => void;
  onAdd: (u: LabUser) => Promise<boolean>;
}) {
  const panelRef = useDialogA11y(true, onClose);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('msc');
  const [supervisorId, setSupervisorId] = useState<string>(supervisor.id);
  const [affiliation, setAffiliation] = useState<UserAffiliation>('MiMic Lab');
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ u: LabUser; code: string | null } | null>(null);
  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!name.trim() || !em) return;
    if (existingEmails.includes(em)) { setError('This e-mail is already in the member list.'); return; }
    const u: LabUser = {
      id: generateId(), name: name.trim(), email: em, abbreviation: generateAbbreviation(name.trim()),
      role, affiliation, isAdmin: false, certifications: [], projects: [], status: 'active',
      supervisorId: anyRole ? (supervisorId || undefined) : supervisor.id,
      startDate: startDate || undefined, endDate: endDate || undefined,
    };
    const ok = await onAdd(u);
    if (!ok) { setError('Not saved: the server refused the insert (see the red banner). Ask the lab admin.'); return; }
    setDone({ u, code: await fetchSignupCode(u.id) });
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Add student" tabIndex={-1} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 outline-none" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 font-manrope">{anyRole ? 'Add a lab member' : 'Add a student or guest'}</h2>
            <p className="text-xs text-gray-500 font-manrope">{anyRole ? 'Any role except Admin and PI.' : `Supervised by you (${supervisor.name}).`} They choose their own password afterwards.</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>

        {done ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-green-50 text-green-800 text-sm px-4 py-3 rounded-xl font-manrope">
              <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
              <span><strong>{done.u.name}</strong> is registered as {rolePermissions[done.u.role].label}.</span>
            </div>
            <div className="text-xs text-gray-600 font-manrope bg-gray-50 rounded-xl p-4 space-y-1">
              <p className="font-semibold text-gray-800">Tell them:</p>
              <p>1. Open <strong>mimic.polimi.it/lab</strong> and click <strong>Create account</strong>.</p>
              <p>2. Use exactly this e-mail: <strong>{done.u.email}</strong></p>
              <p>3. Registration code: <span className="inline-block px-2 py-0.5 rounded bg-white border border-gray-200 font-mono text-sm font-bold tracking-widest text-[#102C53]">{done.code ?? '— (open their card later to see it)'}</span></p>
              <p>4. They choose a password and they are in. The code stops working once the account exists.</p>
            </div>
            <button onClick={onClose} className="w-full py-2.5 bg-[#102C53] text-white rounded-xl text-sm font-semibold font-manrope hover:bg-[#1a3d6e]">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            {error && <div className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg font-manrope">{error}</div>}
            <label className="block text-xs font-medium text-gray-600 font-manrope">Full name
              <input value={name} onChange={e => setName(e.target.value)} className={`${inputCls} mt-1`} placeholder="Name Surname" required autoFocus />
            </label>
            <label className="block text-xs font-medium text-gray-600 font-manrope">E-mail (the one they will log in with)
              <input type="email" value={email} onChange={e => { setEmail(e.target.value); setError(''); }} className={`${inputCls} mt-1`} placeholder="name.surname@mail.polimi.it" required />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-gray-600 font-manrope">Role
                <select value={role} onChange={e => setRole(e.target.value as UserRole)} className={`${inputCls} mt-1`}>
                  {(anyRole ? ADDABLE_ROLES : SUPERVISED_ROLES).map(r => <option key={r} value={r}>{rolePermissions[r].label}</option>)}
                </select>
              </label>
              <label className="block text-xs font-medium text-gray-600 font-manrope">Affiliation
                <select value={affiliation} onChange={e => setAffiliation(e.target.value as UserAffiliation)} className={`${inputCls} mt-1`}>
                  {AFFILIATIONS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </label>
            </div>
            {anyRole && (
              <label className="block text-xs font-medium text-gray-600 font-manrope">Supervisor{SUPERVISED_ROLES.includes(role) ? '' : ' (optional)'}
                <select value={supervisorId} onChange={e => setSupervisorId(e.target.value)} className={`${inputCls} mt-1`} required={SUPERVISED_ROLES.includes(role)}>
                  {!SUPERVISED_ROLES.includes(role) && <option value="">— none —</option>}
                  {supervisors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            )}
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-gray-600 font-manrope">Start
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`${inputCls} mt-1`} />
              </label>
              <label className="block text-xs font-medium text-gray-600 font-manrope">Expected end (optional)
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`${inputCls} mt-1`} />
              </label>
            </div>
            <p className="text-[11px] text-gray-400 font-manrope">{anyRole ? 'Visiting PhD students are registered as PhD Student with affiliation External.' : 'MSc students can book instruments and see the inventory; guests can only look.'} Trainings and certifications are granted later by the lab manager or an admin.</p>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold font-manrope hover:bg-gray-200">Cancel</button>
              <button type="submit" className="flex-1 py-2.5 bg-[#102C53] text-white rounded-xl text-sm font-semibold font-manrope hover:bg-[#1a3d6e]">Register</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
