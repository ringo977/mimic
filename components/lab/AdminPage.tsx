'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, Edit2, X, Users, FlaskConical, Microscope, Save, Download,
  Snowflake, BookOpen, FolderKanban, Award, CalendarDays, ChevronLeft, ChevronRight,
  Upload, FileText, Warehouse, MapPin, ChevronUp, ChevronDown, HardDrive, UploadCloud,
  DatabaseBackup, FileArchive, AlertCircle, CheckCircle2, Loader2, Clock, Sun, Moon } from 'lucide-react';
import { useLabContext } from './LabContext';
import { useConfirm } from './ConfirmDialog';
import { LabUser, UserRole, UserAffiliation, Reagent, Instrument, MaintenanceLog, Manual, StorageUnit, StorageUnitType, CryoVial,
  storageUnitTypes, Project, Certification, Location, BookingSettings,
  ReagentMacroCategory, reagentMacroCategories, allMacroKeys, getMacroCategory, instrumentCategories, instrumentIcons,
  isRackBased, isShelfBased, buildBookingSlots, isWorkingHour,
  rolePermissions, generateId, generateAbbreviation, formatDate, formatTime, getRowLabels } from '@/data/lab-data';
import { fetchMaintenanceLogs, upsertMaintenanceLog, deleteMaintenanceLog, deleteMaintenanceLogsForInstrument } from '@/lib/supabase-data';

type Tab = 'users' | 'projects' | 'certifications' | 'locations' | 'instruments' | 'storageUnits' | 'reagents' | 'cryo' | 'manuals' | 'calendar' | 'schedule' | 'backup';

export default function AdminPage() {
  const ctx = useLabContext();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  const tabGroups: { label: string; tabs: { id: Tab; label: string; icon: React.ElementType; count?: number }[] }[] = [
    { label: 'Organization', tabs: [
      { id: 'users', label: 'Users', icon: Users, count: ctx.users.length },
      { id: 'projects', label: 'Projects', icon: FolderKanban, count: ctx.projects.length },
      { id: 'certifications', label: 'Certs', icon: Award, count: ctx.certifications.length },
    ]},
    { label: 'Infrastructure', tabs: [
      { id: 'locations', label: 'Locations', icon: MapPin, count: ctx.locations.length },
      { id: 'instruments', label: 'Instruments', icon: Microscope, count: ctx.instruments.length },
      { id: 'storageUnits', label: 'Storage', icon: Warehouse, count: ctx.storageUnits.length },
    ]},
    { label: 'Inventory', tabs: [
      { id: 'reagents', label: 'Consumables', icon: FlaskConical, count: ctx.reagents.length },
      { id: 'cryo', label: 'Cryo', icon: Snowflake, count: ctx.cryoVials.length },
    ]},
    { label: 'Docs & Schedule', tabs: [
      { id: 'manuals', label: 'Manuals', icon: BookOpen, count: ctx.manuals.length },
      { id: 'calendar', label: 'Calendar', icon: CalendarDays },
      { id: 'schedule', label: 'Hours', icon: Clock },
    ]},
    { label: 'System', tabs: [
      { id: 'backup', label: 'Backup', icon: HardDrive },
    ]},
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4">
      <h1 className="text-lg font-bold text-gray-900 font-manrope">Admin Panel</h1>
      {/* Grouped tabs - wraps on desktop, scrollable on mobile */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 pb-1">
        {tabGroups.map(group => (
          <div key={group.label} className="flex items-center gap-1">
            <span className="text-[9px] font-semibold text-gray-400 font-manrope uppercase tracking-wider mr-1 hidden sm:block">{group.label}</span>
            <div className="flex gap-1">
              {group.tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium font-manrope whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-[#102C53] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    <Icon size={12} /> {tab.label}{tab.count !== undefined ? <span className="opacity-70 ml-0.5">{tab.count}</span> : ''}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'projects' && <ProjectsTab />}
      {activeTab === 'certifications' && <CertificationsTab />}
      {activeTab === 'locations' && <LocationsTab />}
      {activeTab === 'instruments' && <InstrumentsTab />}
      {activeTab === 'storageUnits' && <StorageUnitsTab />}
      {activeTab === 'reagents' && <ReagentsTab />}
      {activeTab === 'cryo' && <CryoTab />}
      {activeTab === 'manuals' && <ManualsTab />}
      {activeTab === 'calendar' && <CalendarTab />}
      {activeTab === 'schedule' && <ScheduleTab />}
      {activeTab === 'backup' && <BackupTab />}
    </div>
  );
}

// ============================================================
// Shared
// ============================================================
function downloadCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

/** Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes, commas and newlines. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false; }
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { cur.push(field); field = ''; }
    else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 font-manrope">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">{label}</label>{children}</div>;
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none";
const btnPrimary = "w-full py-3 bg-[#102C53] text-white rounded-xl font-semibold text-sm font-manrope hover:bg-[#1a3d6e] disabled:opacity-40 flex items-center justify-center gap-2";
const btnExport = "flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium font-manrope hover:bg-gray-200";
const btnAdd = "flex items-center gap-1.5 px-4 py-2 bg-[#102C53] text-white rounded-xl text-xs font-medium font-manrope hover:bg-[#1a3d6e]";

// --- Reusable CSV import ---
// parseRow returns the built item (optionally with a non-blocking note) or a skip reason.
type ParsedRow<T> = { item: T; note?: string } | { skip: string };
interface ImportSpec<T> {
  title: string;
  headers: string[];                     // canonical columns, used for matching + template
  aliases?: Record<string, string[]>;    // canonical -> accepted header variants (any case)
  template: (string | number)[][];       // example rows aligned to headers
  templateName: string;
  notes?: React.ReactNode;               // extra instruction bullet(s)
  parseRow: (rec: Record<string, string>, rowNum: number) => ParsedRow<T>;
  onAdd: (item: T) => void;
}

function ImportModal<T>({ spec, onClose }: { spec: ImportSpec<T>; onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<{ added: number; messages: string[] } | null>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) { setResult({ added: 0, messages: ['File is empty or has no data rows.'] }); return; }
    const header = rows[0].map(h => h.trim().toLowerCase());
    const colIndex: Record<string, number> = {};
    spec.headers.forEach(h => {
      const names = [h.toLowerCase(), ...(spec.aliases?.[h]?.map(a => a.toLowerCase()) || [])];
      colIndex[h] = header.findIndex(x => names.includes(x));
    });
    const messages: string[] = [];
    let added = 0;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rec: Record<string, string> = {};
      spec.headers.forEach(h => { const idx = colIndex[h]; rec[h] = idx >= 0 ? (row[idx] ?? '').trim() : ''; });
      const out = spec.parseRow(rec, i + 1);
      if ('skip' in out) { messages.push(out.skip); continue; }
      spec.onAdd(out.item); added++;
      if (out.note) messages.push(out.note);
    }
    setResult({ added, messages });
  };

  return (
    <Modal title={spec.title} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-800 font-manrope space-y-1.5">
          <p className="font-semibold flex items-center gap-1.5"><FileText size={13} /> How it works</p>
          <p>Upload a <strong>.csv</strong> file (in Excel/Google Sheets use <em>Save as → CSV</em>). The first row must be the column headers; each following row is one record.</p>
          <p><strong>Columns:</strong> {spec.headers.join(', ')}.</p>
          {spec.notes && <div className="space-y-0.5">{spec.notes}</div>}
          <p>Tip: <strong>Export</strong> first to get a file in the exact format, edit it, then import.</p>
        </div>

        <button onClick={() => downloadCSV(spec.headers, spec.template, spec.templateName)} className={`${btnExport} w-full justify-center`}><Download size={14} /> Download example template</button>

        <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
        <button onClick={() => inputRef.current?.click()} className={`${btnPrimary} w-full justify-center`}><Upload size={16} /> Choose CSV file…</button>

        {result && (
          <div className="rounded-xl border border-gray-100 p-3 text-xs font-manrope space-y-2">
            <p className="flex items-center gap-1.5 font-semibold text-green-700"><CheckCircle2 size={14} /> {result.added} record{result.added !== 1 ? 's' : ''} imported.</p>
            {result.messages.length > 0 && (
              <div className="text-amber-700">
                <p className="flex items-center gap-1.5 font-semibold"><AlertCircle size={14} /> {result.messages.length} note{result.messages.length !== 1 ? 's' : ''}:</p>
                <ul className="list-disc list-inside max-h-32 overflow-y-auto mt-1 space-y-0.5">
                  {result.messages.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}
            {result.added > 0 && <button onClick={onClose} className={`${btnPrimary} w-full justify-center`}>Done</button>}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ImportButton<T>({ spec }: { spec: ImportSpec<T> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={btnExport}><Upload size={14} /> Import</button>
      {open && <ImportModal spec={spec} onClose={() => setOpen(false)} />}
    </>
  );
}

// --- Sortable table helpers ---
function useSort<T>(data: T[], defaultKey: string, accessors: Record<string, (item: T) => string | number>) {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortAsc, setSortAsc] = useState(true);
  const toggle = (key: string) => { if (sortKey === key) setSortAsc(!sortAsc); else { setSortKey(key); setSortAsc(true); } };
  const sorted = useMemo(() => {
    const fn = accessors[sortKey];
    if (!fn) return data;
    return [...data].sort((a, b) => {
      const va = fn(a), vb = fn(b);
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb));
      return sortAsc ? cmp : -cmp;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, sortKey, sortAsc]);
  return { sorted, sortKey, sortAsc, toggle };
}

function SortTh({ label, k, sortKey, sortAsc, toggle, align }: { label: string; k: string; sortKey: string; sortAsc: boolean; toggle: (k: string) => void; align?: 'right' }) {
  return (
    <th className={`px-3 py-2.5 font-semibold text-gray-700 cursor-pointer select-none hover:text-gray-900 group ${align === 'right' ? 'text-right' : 'text-left'}`} onClick={() => toggle(k)}>
      <span className="inline-flex items-center gap-0.5">{label}
        {sortKey === k ? (sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ChevronDown size={10} className="opacity-0 group-hover:opacity-30" />}
      </span>
    </th>
  );
}

// ============================================================
// Users Tab
// ============================================================
function UsersTab() {
  const { users, user: currentUser, addUser, updateUser, removeUser, projects, certifications, bookings, removeBooking } = useLabContext();
  const [ConfirmDialog, confirmDelete] = useConfirm();
  const [editing, setEditing] = useState<LabUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const roles: UserRole[] = ['admin', 'pi', 'researcher', 'lab_manager', 'project_manager', 'postdoc', 'phd', 'msc', 'guest'];
  const affiliations: UserAffiliation[] = ['MiMic Lab', 'DEIB', 'POLIMI', 'External'];
  const empty = (): LabUser => ({ id: generateId(), email: '', name: '', abbreviation: '', role: 'phd', affiliation: 'DEIB', isAdmin: false, certifications: [], projects: [] });
  const [form, setForm] = useState<LabUser>(empty());
  const acc = useMemo(() => ({ name: (u: LabUser) => u.name, email: (u: LabUser) => u.email, role: (u: LabUser) => u.role, affiliation: (u: LabUser) => u.affiliation, admin: (u: LabUser) => u.isAdmin ? 1 : 0, certs: (u: LabUser) => u.certifications.length, projects: (u: LabUser) => u.projects.length }), []);
  const { sorted, sortKey, sortAsc, toggle } = useSort(users, 'name', acc);

  const currentIsPi = currentUser.role === 'pi';

  const canToggleAdmin = (target: LabUser) => {
    if (currentIsPi) return true;
    // Non-PI admins cannot change admin flag on PIs
    if (target.role === 'pi') return false;
    return true;
  };

  const handleToggleAdmin = (target: LabUser) => {
    if (!canToggleAdmin(target)) return;
    updateUser({ ...target, isAdmin: !target.isAdmin });
  };

  const open = (u?: LabUser) => { setForm(u ? { ...u } : empty()); setEditing(u || null); setShowForm(true); };
  const save = () => { if (!form.name || !form.email) return; editing ? updateUser(form) : addUser(form); setShowForm(false); };
  const toggleCert = (id: string) => setForm(f => ({ ...f, certifications: f.certifications.includes(id) ? f.certifications.filter(c => c !== id) : [...f.certifications, id] }));
  const toggleProj = (id: string) => setForm(f => ({ ...f, projects: f.projects.includes(id) ? f.projects.filter(p => p !== id) : [...f.projects, id] }));

  const importSpec: ImportSpec<LabUser> = {
    title: 'Import users (CSV)',
    headers: ['Name', 'Email', 'Role', 'Affiliation', 'Admin', 'Abbreviation', 'Certifications', 'Projects'],
    aliases: { 'Admin': ['is admin'], 'Abbreviation': ['id', 'abbr', 'initials'], 'Certifications': ['certs', 'certification'], 'Projects': ['project'] },
    template: [
      ['Jane Doe', 'jane.doe@polimi.it', 'phd', 'DEIB', 'No', 'JDO', '', ''],
      ['John Smith', 'john.smith@polimi.it', 'postdoc', 'MiMic Lab', 'No', 'JSM', '', ''],
    ],
    templateName: 'users_template',
    notes: <>
      <p><strong>Role</strong>: one of {roles.join(', ')}. <strong>Affiliation</strong>: {affiliations.join(', ')}.</p>
      <p><strong>Admin</strong>: Yes/No. <strong>Certifications/Projects</strong>: names separated by &ldquo;;&rdquo; (must already exist).</p>
    </>,
    onAdd: addUser,
    parseRow: (rec, rowNum) => {
      if (!rec['Name']) return { skip: `Row ${rowNum}: missing name` };
      if (!rec['Email']) return { skip: `Row ${rowNum} (${rec['Name']}): missing email` };
      const notes: string[] = [];
      const roleRaw = rec['Role'].toLowerCase().replace(/\s+/g, '_');
      const role = (roles as string[]).includes(roleRaw) ? roleRaw as UserRole : 'guest';
      if (rec['Role'] && role !== roleRaw) notes.push(`role "${rec['Role']}" not recognized → set to guest`);
      const aff = affiliations.find(a => a.toLowerCase() === rec['Affiliation'].toLowerCase()) || 'DEIB';
      const resolve = (raw: string, list: { id: string; name: string }[]) => {
        const ids: string[] = [];
        raw.split(';').map(s => s.trim()).filter(Boolean).forEach(token => {
          const m = list.find(x => x.id === token || x.name.toLowerCase() === token.toLowerCase());
          if (m) ids.push(m.id); else notes.push(`"${token}" not found`);
        });
        return ids;
      };
      const item: LabUser = {
        id: generateId(), name: rec['Name'], email: rec['Email'], role, affiliation: aff,
        isAdmin: /^(yes|true|1|y)$/i.test(rec['Admin']),
        abbreviation: rec['Abbreviation'] || generateAbbreviation(rec['Name']),
        certifications: resolve(rec['Certifications'], certifications),
        projects: resolve(rec['Projects'], projects),
      };
      return notes.length ? { item, note: `Row ${rowNum} (${item.name}): ${notes.join('; ')}` } : { item };
    },
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{users.length} users</p>
        <div className="flex gap-2">
          <ImportButton spec={importSpec} />
          <button onClick={() => downloadCSV(['Name','ID','Email','Role','Affiliation','Admin','Certifications','Projects'], users.map(u => [u.name,u.abbreviation || generateAbbreviation(u.name),u.email,u.role,u.affiliation,u.isAdmin ? 'Yes' : 'No',u.certifications.join('; '),u.projects.join('; ')]), 'users')} className={btnExport}><Download size={14} /> Export</button>
          <button onClick={() => open()} className={btnAdd}><Plus size={14} /> Add User</button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-xs font-manrope"><thead><tr className="bg-gray-50 border-b border-gray-200">
          <SortTh label="Name" k="name" sortKey={sortKey} sortAsc={sortAsc} toggle={toggle} />
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">ID</th>
          <SortTh label="Email" k="email" sortKey={sortKey} sortAsc={sortAsc} toggle={toggle} />
          <SortTh label="Role" k="role" sortKey={sortKey} sortAsc={sortAsc} toggle={toggle} />
          <SortTh label="Affiliation" k="affiliation" sortKey={sortKey} sortAsc={sortAsc} toggle={toggle} />
          <SortTh label="Admin" k="admin" sortKey={sortKey} sortAsc={sortAsc} toggle={toggle} />
          <SortTh label="Certs" k="certs" sortKey={sortKey} sortAsc={sortAsc} toggle={toggle} />
          <SortTh label="Projects" k="projects" sortKey={sortKey} sortAsc={sortAsc} toggle={toggle} />
          <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Actions</th>
        </tr></thead><tbody className="divide-y divide-gray-100">
          {sorted.map(u => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{u.name}</td>
              <td className="px-3 py-2"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#102C53] text-white text-[10px] font-bold">{u.abbreviation || generateAbbreviation(u.name)}</span></td>
              <td className="px-3 py-2 text-gray-600">{u.email}</td>
              <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">{rolePermissions[u.role].label}</span></td>
              <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium">{u.affiliation}</span></td>
              <td className="px-3 py-2">
                <button
                  onClick={() => handleToggleAdmin(u)}
                  disabled={!canToggleAdmin(u)}
                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-all ${
                    u.isAdmin
                      ? 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                      : 'bg-gray-100 text-gray-300 hover:bg-gray-200'
                  } ${!canToggleAdmin(u) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  title={u.isAdmin ? 'Admin access granted' : 'No admin access'}
                >
                  <span className="text-[10px] font-bold">{u.isAdmin ? '★' : '—'}</span>
                </button>
              </td>
              <td className="px-3 py-2 text-gray-500">{u.certifications.length}</td>
              <td className="px-3 py-2 text-gray-500 max-w-[150px] truncate">{u.projects.join(', ')}</td>
              <td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">
                <button onClick={() => open(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13} /></button>
                <button onClick={() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const futureBookings = bookings.filter(b => b.userId === u.id && b.date >= todayStr);
                  const parts = [`"${u.name}" will be permanently removed.`];
                  if (futureBookings.length > 0) parts.push(`${futureBookings.length} upcoming booking${futureBookings.length > 1 ? 's' : ''} will be cancelled (past ones are kept for the records).`);
                  parts.push('Note: the login account must also be removed in the Supabase dashboard (Authentication → Users).');
                  confirmDelete('Delete User?', parts.join(' '), () => {
                    futureBookings.forEach(b => removeBooking(b.id));
                    removeUser(u.id);
                  });
                }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
              </div></td>
            </tr>
          ))}
        </tbody></table>
      </div></div>
      {showForm && <Modal title={editing ? 'Edit User' : 'Add User'} onClose={() => setShowForm(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name"><input value={form.name} onChange={e => { const name = e.target.value; const autoAbbr = generateAbbreviation(name); setForm(f => ({ ...f, name, abbreviation: f.abbreviation === '' || f.abbreviation === generateAbbreviation(f.name) ? autoAbbr : f.abbreviation })); }} className={inputCls} /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role"><select value={form.role} onChange={e => setForm({...form, role: e.target.value as UserRole})} className={inputCls}>{roles.map(r => <option key={r} value={r}>{rolePermissions[r].label}</option>)}</select></Field>
            <Field label="Affiliation"><select value={form.affiliation} onChange={e => setForm({...form, affiliation: e.target.value as UserAffiliation})} className={inputCls}>{affiliations.map(a => <option key={a} value={a}>{a}</option>)}</select></Field>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isAdmin}
                onChange={e => setForm({...form, isAdmin: e.target.checked})}
                disabled={!currentIsPi && form.role === 'pi'}
                className="w-4 h-4 rounded border-gray-300 text-amber-500"
              />
              <span className="text-sm font-manrope text-gray-700">Admin access</span>
            </label>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 font-manrope">ID</span>
              <input value={form.abbreviation} onChange={e => setForm({...form, abbreviation: e.target.value.toUpperCase().slice(0, 4)})} maxLength={4} className="w-14 px-1.5 py-1 border border-gray-200 rounded-lg text-xs text-center font-bold tracking-wider font-manrope focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none" />
            </div>
          </div>
          <Field label="Projects">
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border border-gray-200 rounded-xl">
              {projects.map(p => (
                <button key={p.id} type="button" onClick={() => toggleProj(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium font-manrope transition-all ${form.projects.includes(p.id) ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {p.name}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Certifications">
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-2 border border-gray-200 rounded-xl">
              {certifications.map(c => (
                <button key={c.id} type="button" onClick={() => toggleCert(c.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium font-manrope transition-all ${form.certifications.includes(c.id) ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </Field>
          <button onClick={save} disabled={!form.name||!form.email} className={btnPrimary}><Save size={16} /> {editing ? 'Save' : 'Add User'}</button>
        </div>
      </Modal>}
      <ConfirmDialog />
    </>
  );
}

// ============================================================
// Projects Tab
// ============================================================
function ProjectsTab() {
  const { projects, addProject, updateProject, removeProject, users, updateUser } = useLabContext();
  const [ConfirmDialog, confirmDelete] = useConfirm();
  const [editing, setEditing] = useState<Project | null>(null);
  const [showForm, setShowForm] = useState(false);
  const empty = (): Project => ({ id: generateId(), name: '', description: '', status: 'active' });
  const [form, setForm] = useState<Project>(empty());
  const open = (p?: Project) => { setForm(p ? { ...p } : empty()); setEditing(p || null); setShowForm(true); };
  const save = () => {
    if (!form.name) return;
    const toSave = editing ? form : { ...form, id: form.name };
    editing ? updateProject(toSave) : addProject(toSave);
    setShowForm(false);
  };
  const acc = useMemo(() => ({ name: (p: Project) => p.name, status: (p: Project) => p.status, members: (p: Project) => users.filter(u => u.projects.includes(p.id)).length }), [users]);
  const { sorted, sortKey, sortAsc, toggle } = useSort(projects, 'name', acc);

  const importSpec: ImportSpec<Project> = {
    title: 'Import projects (CSV)',
    headers: ['Name', 'Description', 'Status'],
    template: [
      ['PHOENIX', 'Lung-on-chip platform', 'active'],
      ['ARCHIVE-01', 'Completed pilot study', 'completed'],
    ],
    templateName: 'projects_template',
    notes: <p><strong>Status</strong>: active or completed (defaults to active). The project name is used as its ID.</p>,
    onAdd: addProject,
    parseRow: (rec, rowNum) => {
      if (!rec['Name']) return { skip: `Row ${rowNum}: missing name` };
      const status = rec['Status'].toLowerCase() === 'completed' ? 'completed' : 'active';
      return { item: { id: rec['Name'], name: rec['Name'], description: rec['Description'], status } };
    },
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{projects.length} projects</p>
        <div className="flex gap-2">
          <ImportButton spec={importSpec} />
          <button onClick={() => downloadCSV(['Name','Description','Status','Members'], projects.map(p => [p.name, p.description, p.status, users.filter(u => u.projects.includes(p.id)).length]), 'projects')} className={btnExport}><Download size={14} /> Export</button>
          <button onClick={() => open()} className={btnAdd}><Plus size={14} /> Add Project</button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-xs font-manrope"><thead><tr className="bg-gray-50 border-b border-gray-200">
          <SortTh label="Name" k="name" sortKey={sortKey} sortAsc={sortAsc} toggle={toggle} />
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Description</th>
          <SortTh label="Status" k="status" sortKey={sortKey} sortAsc={sortAsc} toggle={toggle} />
          <SortTh label="Members" k="members" sortKey={sortKey} sortAsc={sortAsc} toggle={toggle} />
          <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Actions</th>
        </tr></thead><tbody className="divide-y divide-gray-100">
          {sorted.map(p => {
            const members = users.filter(u => u.projects.includes(p.id));
            return (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">{p.name}</td>
                <td className="px-3 py-2 text-gray-500 max-w-[250px] truncate">{p.description}</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${p.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.status}</span></td>
                <td className="px-3 py-2 text-gray-500">{members.length > 0 ? members.map(m => m.name.split(' ')[0]).join(', ') : '—'}</td>
                <td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">
                  <button onClick={() => open(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13} /></button>
                  <button onClick={() => {
                    const inProject = users.filter(u => u.projects.includes(p.id));
                    const msg = inProject.length > 0
                      ? `"${p.name}" will be permanently removed and unassigned from ${inProject.length} member${inProject.length > 1 ? 's' : ''}.`
                      : `"${p.name}" will be permanently removed.`;
                    confirmDelete('Delete Project?', msg, () => {
                      inProject.forEach(u => updateUser({ ...u, projects: u.projects.filter(x => x !== p.id) }));
                      removeProject(p.id);
                    });
                  }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                </div></td>
              </tr>
            );
          })}
        </tbody></table>
      </div></div>
      {showForm && <Modal title={editing ? 'Edit Project' : 'Add Project'} onClose={() => setShowForm(false)}>
        <div className="space-y-3">
          <Field label="Name"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., PHOENIX" className={inputCls} /></Field>
          <Field label="Description"><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={inputCls + ' resize-none'} /></Field>
          <Field label="Status"><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Project['status'] })} className={inputCls}>
            <option value="active">Active</option><option value="completed">Completed</option>
          </select></Field>
          <button onClick={save} disabled={!form.name} className={btnPrimary}><Save size={16} /> {editing ? 'Save' : 'Add Project'}</button>
        </div>
      </Modal>}
      <ConfirmDialog />
    </>
  );
}

// ============================================================
// Certifications Tab
// ============================================================
function CertificationsTab() {
  const { certifications, addCertification, updateCertification, removeCertification, instruments, users, updateUser } = useLabContext();
  const [ConfirmDialog, confirmDelete] = useConfirm();
  const [editing, setEditing] = useState<Certification | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
  const empty = (): Certification => ({ id: generateId(), name: '', description: '', instrumentId: undefined });
  const [form, setForm] = useState<Certification>(empty());
  const open = (c?: Certification) => { setForm(c ? { ...c } : empty()); setEditing(c || null); setShowForm(true); };
  const save = () => {
    if (!form.name) return;
    const toSave = editing ? form : { ...form, id: form.instrumentId || form.id };
    editing ? updateCertification(toSave) : addCertification(toSave);
    setShowForm(false);
  };

  const toggleUserCert = (userId: string, certId: string) => {
    const u = users.find(x => x.id === userId);
    if (!u) return;
    const newCerts = u.certifications.includes(certId) ? u.certifications.filter(c => c !== certId) : [...u.certifications, certId];
    updateUser({ ...u, certifications: newCerts });
  };

  const certAcc = useMemo(() => ({ name: (c: Certification) => c.name, instrument: (c: Certification) => { const i = instruments.find(x => x.id === c.instrumentId); return i ? i.name : '— General'; }, users: (c: Certification) => users.filter(u => u.certifications.includes(c.id)).length }), [instruments, users]);
  const { sorted: sortedCerts, sortKey: cSortKey, sortAsc: cSortAsc, toggle: cToggle } = useSort(certifications, 'name', certAcc);

  const importSpec: ImportSpec<Certification> = {
    title: 'Import certifications (CSV)',
    headers: ['Name', 'Instrument', 'Description'],
    template: [
      ['Confocal Microscope', 'Confocal Microscope', 'Required to operate the confocal'],
      ['Biosafety Level 2', '', 'General BSL-2 training'],
    ],
    templateName: 'certifications_template',
    notes: <p><strong>Instrument</strong>: optional; must match an existing instrument name to link the cert (leave blank for a general certification).</p>,
    onAdd: addCertification,
    parseRow: (rec, rowNum) => {
      if (!rec['Name']) return { skip: `Row ${rowNum}: missing name` };
      const instVal = rec['Instrument'];
      const inst = instVal ? instruments.find(i => i.id === instVal || i.name.toLowerCase() === instVal.toLowerCase()) : undefined;
      const item: Certification = { id: inst?.id || generateId(), name: rec['Name'], instrumentId: inst?.id, description: rec['Description'] };
      return instVal && !inst ? { item, note: `Row ${rowNum} (${item.name}): instrument "${instVal}" not found — left unlinked` } : { item };
    },
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{certifications.length} certifications</p>
        <div className="flex gap-2">
          <button onClick={() => setViewMode(viewMode === 'list' ? 'matrix' : 'list')} className={btnExport}>{viewMode === 'list' ? 'Matrix View' : 'List View'}</button>
          <ImportButton spec={importSpec} />
          <button onClick={() => downloadCSV(['Name','Instrument','Description'], certifications.map(c => [c.name, c.instrumentId || '—', c.description]), 'certifications')} className={btnExport}><Download size={14} /> Export</button>
          <button onClick={() => open()} className={btnAdd}><Plus size={14} /> Add</button>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full text-xs font-manrope"><thead><tr className="bg-gray-50 border-b border-gray-200">
            <SortTh label="Name" k="name" sortKey={cSortKey} sortAsc={cSortAsc} toggle={cToggle} />
            <SortTh label="Linked Instrument" k="instrument" sortKey={cSortKey} sortAsc={cSortAsc} toggle={cToggle} />
            <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Description</th>
            <SortTh label="Users" k="users" sortKey={cSortKey} sortAsc={cSortAsc} toggle={cToggle} />
            <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Actions</th>
          </tr></thead><tbody className="divide-y divide-gray-100">
            {sortedCerts.map(c => {
              const inst = instruments.find(i => i.id === c.instrumentId);
              const certUsers = users.filter(u => u.certifications.includes(c.id));
              return (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{c.name}</td>
                  <td className="px-3 py-2 text-gray-500">{inst ? `${inst.icon} ${inst.name}` : '— General'}</td>
                  <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{c.description}</td>
                  <td className="px-3 py-2 text-gray-500">{certUsers.length}</td>
                  <td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">
                    <button onClick={() => open(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13} /></button>
                    <button onClick={() => {
                      const holders = users.filter(u => u.certifications.includes(c.id));
                      const msg = holders.length > 0
                        ? `"${c.name}" will be permanently removed and revoked from ${holders.length} member${holders.length > 1 ? 's' : ''}.`
                        : `"${c.name}" will be permanently removed.`;
                      confirmDelete('Delete Certification?', msg, () => {
                        holders.forEach(u => updateUser({ ...u, certifications: u.certifications.filter(x => x !== c.id) }));
                        removeCertification(c.id);
                      });
                    }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                  </div></td>
                </tr>
              );
            })}
          </tbody></table>
        </div></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full text-xs font-manrope">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2.5 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">User</th>
              {certifications.map(c => (
                <th key={c.id} className="px-1.5 py-2.5 text-center font-semibold text-gray-700 whitespace-nowrap">
                  <span className="text-[9px] max-w-[55px] block truncate mx-auto">{c.name}</span>
                </th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {users.filter(u => u.role !== 'admin').map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900 sticky left-0 bg-white whitespace-nowrap">{u.name}</td>
                  {certifications.map(c => {
                    const has = u.certifications.includes(c.id);
                    return (
                      <td key={c.id} className="px-1.5 py-2 text-center">
                        <button onClick={() => toggleUserCert(u.id, c.id)}
                          className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-all ${has ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-300 hover:bg-gray-200'}`}>
                          {has ? <span className="text-[10px] font-bold">&#10003;</span> : <span className="text-[10px]">—</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div></div>
      )}

      {showForm && <Modal title={editing ? 'Edit Certification' : 'Add Certification'} onClose={() => setShowForm(false)}>
        <div className="space-y-3">
          <Field label="Name"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Confocal Microscope" className={inputCls} /></Field>
          <Field label="Linked Instrument (optional)">
            <select value={form.instrumentId || ''} onChange={e => setForm({ ...form, instrumentId: e.target.value || undefined })} className={inputCls}>
              <option value="">— None (General certification)</option>
              {instruments.filter(i => i.requiresCertification).map(i => <option key={i.id} value={i.id}>{i.icon} {i.name}</option>)}
            </select>
          </Field>
          <Field label="Description"><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={inputCls + ' resize-none'} /></Field>
          <button onClick={save} disabled={!form.name} className={btnPrimary}><Save size={16} /> {editing ? 'Save' : 'Add Certification'}</button>
        </div>
      </Modal>}
      <ConfirmDialog />
    </>
  );
}

// ============================================================
// Locations Tab
// ============================================================
function LocationsTab() {
  const { locations, addLocation, updateLocation, removeLocation, instruments, storageUnits, updateInstrument, updateStorageUnit } = useLabContext();
  const [ConfirmDialog, confirmDelete] = useConfirm();
  const [editing, setEditing] = useState<Location | null>(null);
  const [showForm, setShowForm] = useState(false);
  const empty = (): Location => ({ id: generateId(), name: '', building: '', floor: '', notes: '' });
  const [form, setForm] = useState<Location>(empty());
  const open = (l?: Location) => { setForm(l ? { ...l } : empty()); setEditing(l || null); setShowForm(true); };
  const save = () => { if (!form.name) return; editing ? updateLocation(form) : addLocation(form); setShowForm(false); };

  const importSpec: ImportSpec<Location> = {
    title: 'Import locations (CSV)',
    headers: ['Name', 'Building', 'Floor', 'Notes'],
    template: [
      ['Room 101', 'Building 3', 'Ground Floor', 'Main cell culture lab'],
      ['Cleanroom', 'DEIB', '2nd Floor', 'ISO-7'],
    ],
    templateName: 'locations_template',
    onAdd: addLocation,
    parseRow: (rec, rowNum) => {
      if (!rec['Name']) return { skip: `Row ${rowNum}: missing name` };
      return { item: { id: generateId(), name: rec['Name'], building: rec['Building'], floor: rec['Floor'], notes: rec['Notes'] } };
    },
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{locations.length} locations</p>
        <div className="flex gap-2">
          <ImportButton spec={importSpec} />
          <button onClick={() => downloadCSV(['Name','Building','Floor','Notes','Instruments','Storage Units'], locations.map(l => {
            const instCount = instruments.filter(i => i.locationId === l.id).length;
            const suCount = storageUnits.filter(s => s.locationId === l.id).length;
            return [l.name, l.building || '', l.floor || '', l.notes || '', instCount, suCount];
          }), 'locations')} className={btnExport}><Download size={14} /> Export</button>
          <button onClick={() => open()} className={btnAdd}><Plus size={14} /> Add Location</button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {locations.map(l => {
          const instHere = instruments.filter(i => i.locationId === l.id);
          const suHere = storageUnits.filter(s => s.locationId === l.id);
          return (
            <div key={l.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600"><MapPin size={18} /></div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 font-manrope">{l.name}</h3>
                    <p className="text-[10px] text-gray-400 font-manrope">{[l.building, l.floor].filter(Boolean).join(' · ') || '—'}</p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <button onClick={() => open(l)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={12} /></button>
                  <button onClick={() => {
                    const instHere = instruments.filter(i => i.locationId === l.id);
                    const suHere = storageUnits.filter(s => s.locationId === l.id);
                    const parts = [`"${l.name}" will be permanently removed.`];
                    if (instHere.length > 0) parts.push(`${instHere.length} instrument${instHere.length > 1 ? 's' : ''} will be unlinked (name kept as text).`);
                    if (suHere.length > 0) parts.push(`${suHere.length} storage unit${suHere.length > 1 ? 's' : ''} will be unlinked (name kept as text).`);
                    confirmDelete('Delete Location?', parts.join(' '), () => {
                      instHere.forEach(i => updateInstrument({ ...i, locationId: undefined }));
                      suHere.forEach(s => updateStorageUnit({ ...s, locationId: undefined }));
                      removeLocation(l.id);
                    });
                  }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
                </div>
              </div>
              {l.notes && <p className="text-[11px] text-gray-500 font-manrope mb-2">{l.notes}</p>}
              <div className="space-y-1 text-[11px] font-manrope text-gray-500">
                {instHere.length > 0 && <div className="flex justify-between"><span>Instruments</span><span className="text-gray-700">{instHere.length}</span></div>}
                {suHere.length > 0 && <div className="flex justify-between"><span>Storage Units</span><span className="text-gray-700">{suHere.length}</span></div>}
                {instHere.length === 0 && suHere.length === 0 && <div className="text-gray-300 text-[10px]">No items assigned yet</div>}
              </div>
            </div>
          );
        })}
      </div>
      {showForm && <Modal title={editing ? 'Edit Location' : 'Add Location'} onClose={() => setShowForm(false)}>
        <div className="space-y-3">
          <Field label="Name"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., Room 101" className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Building"><input value={form.building || ''} onChange={e => setForm({ ...form, building: e.target.value })} placeholder="e.g., DEIB" className={inputCls} /></Field>
            <Field label="Floor"><input value={form.floor || ''} onChange={e => setForm({ ...form, floor: e.target.value })} placeholder="e.g., 1st Floor" className={inputCls} /></Field>
          </div>
          <Field label="Notes"><textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="e.g., Main cell culture lab" className={inputCls + ' resize-none'} /></Field>
          <button onClick={save} disabled={!form.name} className={btnPrimary}><Save size={16} /> {editing ? 'Save' : 'Add Location'}</button>
        </div>
      </Modal>}
      <ConfirmDialog />
    </>
  );
}

// ============================================================
// Instruments Tab
// ============================================================
function InstrumentsTab() {
  const { instruments, addInstrument, updateInstrument, removeInstrument, locations, user, addLogEntry, bookings, removeBooking, certifications, updateCertification } = useLabContext();
  const [ConfirmDialog, confirmDelete] = useConfirm();
  const [editing, setEditing] = useState<Instrument | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState<string | null>(null);
  const [mLogs, setMLogs] = useState<MaintenanceLog[]>([]);
  const [mForm, setMForm] = useState<MaintenanceLog | null>(null);
  const empty = (): Instrument => ({ id: generateId(), name: '', category: 'Cell Culture', location: '', locationId: undefined, requiresCertification: false, description: '', icon: '🔬' });
  const emptyLog = (instId: string): MaintenanceLog => ({ id: generateId(), instrumentId: instId, date: new Date().toISOString().split('T')[0], type: 'scheduled', description: '', performedBy: user.name });
  const [form, setForm] = useState<Instrument>(empty());
  const open = (i?: Instrument) => { setForm(i ? { ...i } : empty()); setEditing(i || null); setShowForm(true); };
  const setLocationId = (locId: string) => {
    const loc = locations.find(l => l.id === locId);
    setForm(f => ({ ...f, locationId: locId || undefined, location: loc?.name || f.location }));
  };
  const save = () => { if (!form.name) return; editing ? updateInstrument(form) : addInstrument(form); setShowForm(false); };
  const instAcc = useMemo(() => ({ name: (i: Instrument) => i.name, category: (i: Instrument) => i.category, location: (i: Instrument) => { const l = locations.find(x => x.id === i.locationId); return l?.name || i.location; }, cert: (i: Instrument) => i.requiresCertification ? 1 : 0, maintenance: (i: Instrument) => i.nextMaintenanceDate || 'z' }), [locations]);
  const { sorted: sortedInst, sortKey: iSortKey, sortAsc: iSortAsc, toggle: iToggle } = useSort(instruments, 'name', instAcc);

  const importSpec: ImportSpec<Instrument> = {
    title: 'Import instruments (CSV)',
    headers: ['Name', 'Category', 'Location', 'S/N', 'Manufacturer', 'Model', 'Purchase Date', 'Next Maintenance', 'Cert'],
    aliases: { 'S/N': ['serial', 'serial number'], 'Purchase Date': ['purchase'], 'Next Maintenance': ['maintenance', 'next maintenance date'], 'Cert': ['requires certification', 'certification'] },
    template: [
      ['Confocal Microscope', 'Microscopy', 'Room 101', 'SN-12345', 'Leica', 'SP8', '2023-01-15', '2026-12-01', 'Yes'],
      ['CO₂ Incubator', 'Cell Culture', 'Room 101', '', 'Thermo', 'Heracell', '', '', 'No'],
    ],
    templateName: 'instruments_template',
    notes: <>
      <p><strong>Category</strong>: e.g. {instrumentCategories.join(', ')} (free text allowed; defaults to Cell Culture).</p>
      <p><strong>Location</strong>: matched to an existing location by name. <strong>Cert</strong>: Yes/No. Dates as YYYY-MM-DD.</p>
    </>,
    onAdd: addInstrument,
    parseRow: (rec, rowNum) => {
      if (!rec['Name']) return { skip: `Row ${rowNum}: missing name` };
      const locVal = rec['Location'];
      const loc = locVal ? locations.find(l => l.id === locVal || l.name.toLowerCase() === locVal.toLowerCase()) : undefined;
      const item: Instrument = {
        id: generateId(), name: rec['Name'], category: rec['Category'] || 'Cell Culture',
        location: loc?.name || locVal, locationId: loc?.id,
        requiresCertification: /^(yes|true|1|y)$/i.test(rec['Cert']), description: '', icon: '🔬',
        serialNumber: rec['S/N'] || undefined, manufacturer: rec['Manufacturer'] || undefined, model: rec['Model'] || undefined,
        purchaseDate: rec['Purchase Date'] || undefined, nextMaintenanceDate: rec['Next Maintenance'] || undefined,
      };
      return locVal && !loc ? { item, note: `Row ${rowNum} (${item.name}): location "${locVal}" not matched — kept as text only` } : { item };
    },
  };

  const openMaintenance = async (instId: string) => {
    setShowMaintenance(instId);
    const logs = await fetchMaintenanceLogs(instId);
    setMLogs(logs);
    setMForm(null);
  };

  const saveMLog = async () => {
    if (!mForm || !mForm.description) return;
    await upsertMaintenanceLog(mForm);
    addLogEntry({ userId: user.id, userName: user.name, action: `Maintenance: ${mForm.type}`, category: 'booking', details: `${instruments.find(i => i.id === mForm.instrumentId)?.name} — ${mForm.description}` });
    const logs = await fetchMaintenanceLogs(mForm.instrumentId);
    setMLogs(logs);
    setMForm(null);
  };

  const delMLog = async (id: string, instId: string) => {
    await deleteMaintenanceLog(id);
    const logs = await fetchMaintenanceLogs(instId);
    setMLogs(logs);
  };

  const isOverdue = (i: Instrument) => i.nextMaintenanceDate && i.nextMaintenanceDate < new Date().toISOString().split('T')[0];
  const isSoon = (i: Instrument) => {
    if (!i.nextMaintenanceDate) return false;
    const d = new Date(i.nextMaintenanceDate);
    const now = new Date();
    const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{instruments.length} instruments</p>
        <div className="flex gap-2">
          <ImportButton spec={importSpec} />
          <button onClick={() => downloadCSV(['Name','Category','Location','S/N','Manufacturer','Model','Purchase Date','Next Maintenance','Cert'], instruments.map(i => [i.name, i.category, i.location, i.serialNumber||'', i.manufacturer||'', i.model||'', i.purchaseDate||'', i.nextMaintenanceDate||'', i.requiresCertification ? 'Yes' : 'No']), 'instruments')} className={btnExport}><Download size={14} /> Export</button>
          <button onClick={() => open()} className={btnAdd}><Plus size={14} /> Add</button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-xs font-manrope"><thead><tr className="bg-gray-50 border-b border-gray-200">
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700"></th>
          <SortTh label="Name" k="name" sortKey={iSortKey} sortAsc={iSortAsc} toggle={iToggle} />
          <SortTh label="Category" k="category" sortKey={iSortKey} sortAsc={iSortAsc} toggle={iToggle} />
          <SortTh label="Location" k="location" sortKey={iSortKey} sortAsc={iSortAsc} toggle={iToggle} />
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">S/N</th>
          <SortTh label="Maintenance" k="maintenance" sortKey={iSortKey} sortAsc={iSortAsc} toggle={iToggle} />
          <SortTh label="Cert." k="cert" sortKey={iSortKey} sortAsc={iSortAsc} toggle={iToggle} />
          <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Actions</th>
        </tr></thead><tbody className="divide-y divide-gray-100">
          {sortedInst.map(i => {
            const loc = locations.find(l => l.id === i.locationId);
            return (
            <tr key={i.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-lg">{i.icon}</td>
              <td className="px-3 py-2 font-medium text-gray-900">
                {i.name}
                {i.manufacturer && <span className="block text-[10px] text-gray-400">{i.manufacturer}{i.model ? ` ${i.model}` : ''}</span>}
              </td>
              <td className="px-3 py-2 text-gray-500">{i.category}</td>
              <td className="px-3 py-2 text-gray-500">{loc?.name || i.location}</td>
              <td className="px-3 py-2 text-gray-500 font-mono text-[10px]">{i.serialNumber || '—'}</td>
              <td className="px-3 py-2">{i.nextMaintenanceDate ? (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${isOverdue(i) ? 'bg-red-50 text-red-700' : isSoon(i) ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                  {isOverdue(i) ? 'Overdue' : isSoon(i) ? 'Due soon' : 'OK'} · {i.nextMaintenanceDate}
                </span>
              ) : <span className="text-gray-300 text-[10px]">—</span>}</td>
              <td className="px-3 py-2">{i.requiresCertification ? <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium">Yes</span> : <span className="text-gray-400 text-[10px]">No</span>}</td>
              <td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">
                <button onClick={() => openMaintenance(i.id)} className="p-1.5 rounded-lg hover:bg-emerald-50 text-gray-400 hover:text-emerald-600" title="Maintenance log"><FileText size={13} /></button>
                <button onClick={() => open(i)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13} /></button>
                <button onClick={() => {
                  const bookingsHere = bookings.filter(b => b.instrumentId === i.id);
                  const certsHere = certifications.filter(c => c.instrumentId === i.id);
                  const parts = [`"${i.name}" will be permanently removed, along with its maintenance history.`];
                  if (bookingsHere.length > 0) parts.push(`${bookingsHere.length} booking${bookingsHere.length > 1 ? 's' : ''} (past and future) will be deleted.`);
                  if (certsHere.length > 0) parts.push(`${certsHere.length} certification${certsHere.length > 1 ? 's' : ''} will be unlinked (kept as general).`);
                  confirmDelete('Delete Instrument?', parts.join(' '), () => {
                    bookingsHere.forEach(b => removeBooking(b.id));
                    certsHere.forEach(c => updateCertification({ ...c, instrumentId: undefined }));
                    deleteMaintenanceLogsForInstrument(i.id);
                    removeInstrument(i.id);
                  });
                }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
              </div></td>
            </tr>
          ); })}
        </tbody></table>
      </div></div>

      {/* Instrument Form */}
      {showForm && <Modal title={editing ? 'Edit Instrument' : 'Add Instrument'} onClose={() => setShowForm(false)}>
        <div className="space-y-3">
          <Field label="Name"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
          <Field label="Icon">
            <div className="flex flex-wrap gap-1.5 p-2 border border-gray-200 rounded-xl max-h-28 overflow-y-auto">
              {instrumentIcons.map(emoji => (
                <button key={emoji} type="button" onClick={() => setForm({ ...form, icon: emoji })}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${form.icon === emoji ? 'bg-[#102C53] ring-2 ring-[#4DC9FF] scale-110' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  {emoji}
                </button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
                {instrumentCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Location">
              <select value={form.locationId || ''} onChange={e => setLocationId(e.target.value)} className={inputCls}>
                <option value="">— Select location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}{l.building ? ` (${l.building})` : ''}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description"><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className={inputCls} /></Field>

          {/* Inventory section */}
          <div className="border-t border-gray-100 pt-3 mt-1">
            <p className="text-xs font-semibold text-gray-500 font-manrope uppercase tracking-wider mb-2">Inventory</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Serial Number"><input value={form.serialNumber || ''} onChange={e => setForm({ ...form, serialNumber: e.target.value || undefined })} placeholder="e.g., SN-12345" className={inputCls} /></Field>
              <Field label="Manufacturer"><input value={form.manufacturer || ''} onChange={e => setForm({ ...form, manufacturer: e.target.value || undefined })} placeholder="e.g., Zeiss" className={inputCls} /></Field>
              <Field label="Model"><input value={form.model || ''} onChange={e => setForm({ ...form, model: e.target.value || undefined })} placeholder="e.g., LSM 900" className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Field label="Purchase Date"><input type="date" value={form.purchaseDate || ''} onChange={e => setForm({ ...form, purchaseDate: e.target.value || undefined })} className={inputCls} /></Field>
              <Field label="Commission Date"><input type="date" value={form.commissionDate || ''} onChange={e => setForm({ ...form, commissionDate: e.target.value || undefined })} className={inputCls} /></Field>
            </div>
          </div>

          {/* Maintenance section */}
          <div className="border-t border-gray-100 pt-3 mt-1">
            <p className="text-xs font-semibold text-gray-500 font-manrope uppercase tracking-wider mb-2">Maintenance Schedule</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Period (months)"><input type="number" min={0} value={form.maintenancePeriodMonths ?? ''} onChange={e => setForm({ ...form, maintenancePeriodMonths: e.target.value ? Number(e.target.value) : undefined })} placeholder="e.g., 12" className={inputCls} /></Field>
              <Field label="Last Maintenance"><input type="date" value={form.lastMaintenanceDate || ''} onChange={e => setForm({ ...form, lastMaintenanceDate: e.target.value || undefined })} className={inputCls} /></Field>
              <Field label="Next Expected"><input type="date" value={form.nextMaintenanceDate || ''} onChange={e => setForm({ ...form, nextMaintenanceDate: e.target.value || undefined })} className={inputCls} /></Field>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.requiresCertification} onChange={e => setForm({ ...form, requiresCertification: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-[#102C53]" /><span className="text-sm font-manrope text-gray-700">Requires certification</span></label>
          <button onClick={save} disabled={!form.name} className={btnPrimary}><Save size={16} /> {editing ? 'Save' : 'Add'}</button>
        </div>
      </Modal>}

      {/* Maintenance Log Modal */}
      {showMaintenance && <Modal title={`Maintenance Log — ${instruments.find(i => i.id === showMaintenance)?.name || ''}`} onClose={() => { setShowMaintenance(null); setMForm(null); }}>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500 font-manrope">{mLogs.length} entries</p>
            {!mForm && <button onClick={() => setMForm(emptyLog(showMaintenance))} className="flex items-center gap-1 px-3 py-1.5 bg-[#102C53] text-white text-xs font-medium font-manrope rounded-lg hover:bg-[#1a3d6e]"><Plus size={12} /> Add Entry</button>}
          </div>

          {mForm && (
            <div className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-200">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Date"><input type="date" value={mForm.date} onChange={e => setMForm({ ...mForm, date: e.target.value })} className={inputCls} /></Field>
                <Field label="Type">
                  <select value={mForm.type} onChange={e => setMForm({ ...mForm, type: e.target.value as MaintenanceLog['type'] })} className={inputCls}>
                    <option value="scheduled">Scheduled</option>
                    <option value="repair">Repair</option>
                    <option value="calibration">Calibration</option>
                    <option value="inspection">Inspection</option>
                  </select>
                </Field>
              </div>
              <Field label="Description"><input value={mForm.description} onChange={e => setMForm({ ...mForm, description: e.target.value })} placeholder="What was done" className={inputCls} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Performed By"><input value={mForm.performedBy} onChange={e => setMForm({ ...mForm, performedBy: e.target.value })} className={inputCls} /></Field>
                <Field label="Cost (€)"><input type="number" min={0} value={mForm.cost ?? ''} onChange={e => setMForm({ ...mForm, cost: e.target.value ? Number(e.target.value) : undefined })} placeholder="Optional" className={inputCls} /></Field>
              </div>
              <Field label="Notes"><input value={mForm.notes || ''} onChange={e => setMForm({ ...mForm, notes: e.target.value || undefined })} placeholder="Optional" className={inputCls} /></Field>
              <div className="flex gap-2">
                <button onClick={saveMLog} disabled={!mForm.description} className="flex items-center gap-1 px-3 py-1.5 bg-[#102C53] text-white text-xs font-medium rounded-lg hover:bg-[#1a3d6e] disabled:opacity-40"><Save size={12} /> Save</button>
                <button onClick={() => setMForm(null)} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700">Cancel</button>
              </div>
            </div>
          )}

          {mLogs.length === 0 && !mForm && <p className="text-xs text-gray-400 font-manrope text-center py-6">No maintenance records yet</p>}
          {mLogs.length > 0 && (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {mLogs.map(log => {
                const typeColors: Record<string, string> = { scheduled: 'bg-blue-50 text-blue-700', repair: 'bg-red-50 text-red-700', calibration: 'bg-purple-50 text-purple-700', inspection: 'bg-amber-50 text-amber-700' };
                return (
                  <div key={log.id} className="bg-white rounded-lg p-3 border border-gray-100 text-xs font-manrope">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 font-medium">{log.date}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${typeColors[log.type] || 'bg-gray-100 text-gray-700'}`}>{log.type}</span>
                        {log.cost != null && <span className="text-gray-400">€{log.cost}</span>}
                      </div>
                      <button onClick={() => confirmDelete('Delete entry?', log.description, () => delMLog(log.id, log.instrumentId))} className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500"><Trash2 size={11} /></button>
                    </div>
                    <p className="text-gray-700">{log.description}</p>
                    <p className="text-gray-400 mt-0.5">By: {log.performedBy}{log.notes ? ` — ${log.notes}` : ''}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>}

      <ConfirmDialog />
    </>
  );
}

// ============================================================
// Storage Units Tab (was Dewars)
// ============================================================
function StorageUnitsTab() {
  const { storageUnits, addStorageUnit, updateStorageUnit, removeStorageUnit, cryoVials, removeCryoVial, reagents, updateReagent, locations } = useLabContext();
  const [ConfirmDialog, confirmDelete] = useConfirm();
  const [editing, setEditing] = useState<StorageUnit | null>(null);
  const [showForm, setShowForm] = useState(false);
  const allTypes = Object.keys(storageUnitTypes) as StorageUnitType[];
  const empty = (): StorageUnit => ({ id: `su-${Date.now()}`, name: '', type: 'FRIDGE', temperature: '+4 °C', model: '', location: '' });
  const [form, setForm] = useState<StorageUnit>(empty());
  const open = (s?: StorageUnit) => { setForm(s ? { ...s } : empty()); setEditing(s || null); setShowForm(true); };
  const save = () => { if (!form.name) return; editing ? updateStorageUnit(form) : addStorageUnit(form); setShowForm(false); };

  // When type changes, auto-fill temperature and clear irrelevant config
  const changeType = (t: StorageUnitType) => {
    setForm(f => ({
      ...f, type: t, temperature: storageUnitTypes[t].temperature,
      // Clear fields not relevant to the new type
      ...(isRackBased(t) ? { numShelves: undefined, numDoors: undefined } : { numRacks: undefined, boxesPerRack: undefined, gridRows: undefined, gridCols: undefined }),
    }));
  };

  const importSpec: ImportSpec<StorageUnit> = {
    title: 'Import storage units (CSV)',
    headers: ['Name', 'Type', 'Temperature', 'Model', 'Location', 'Racks', 'Boxes/Rack', 'Grid Rows', 'Grid Cols', 'Shelves', 'Doors'],
    template: [
      ['LN₂ Dewar A', 'DEWAR', '−196 °C', 'MVE 815', 'Room 101', 6, 10, 9, 9, '', ''],
      ['Fridge A', 'FRIDGE', '+4 °C', 'Liebherr', 'Room 101', '', '', '', '', 3, 1],
    ],
    templateName: 'storage_units_template',
    notes: <>
      <p><strong>Type</strong>: one of {allTypes.join(', ')}. If Temperature is blank it&rsquo;s auto-filled from the type.</p>
      <p>Use Racks/Boxes/Grid for LN₂ dewars; Shelves/Doors for freezers, fridges &amp; cabinets. <strong>Location</strong> matched by name.</p>
    </>,
    onAdd: addStorageUnit,
    parseRow: (rec, rowNum) => {
      if (!rec['Name']) return { skip: `Row ${rowNum}: missing name` };
      const tRaw = rec['Type'].toUpperCase().replace(/[\s-]+/g, '_');
      const type: StorageUnitType = (allTypes as string[]).includes(tRaw)
        ? tRaw as StorageUnitType
        : (allTypes.find(t => storageUnitTypes[t].label.toLowerCase() === rec['Type'].toLowerCase()) || 'FRIDGE');
      const locVal = rec['Location'];
      const loc = locVal ? locations.find(l => l.id === locVal || l.name.toLowerCase() === locVal.toLowerCase()) : undefined;
      const numOrU = (v: string) => { const n = Number(v); return v !== '' && Number.isFinite(n) ? n : undefined; };
      const item: StorageUnit = {
        id: `su-${Date.now()}-${rowNum}`, name: rec['Name'], type,
        temperature: rec['Temperature'] || storageUnitTypes[type].temperature, model: rec['Model'],
        location: loc?.name || locVal, locationId: loc?.id,
        numRacks: numOrU(rec['Racks']), boxesPerRack: numOrU(rec['Boxes/Rack']),
        gridRows: numOrU(rec['Grid Rows']), gridCols: numOrU(rec['Grid Cols']),
        numShelves: numOrU(rec['Shelves']), numDoors: numOrU(rec['Doors']),
      };
      const notes: string[] = [];
      if (rec['Type'] && !(allTypes as string[]).includes(tRaw) && type === 'FRIDGE' && rec['Type'].toLowerCase() !== 'fridge') notes.push(`type "${rec['Type']}" not recognized → set to FRIDGE`);
      if (locVal && !loc) notes.push(`location "${locVal}" not matched`);
      return notes.length ? { item, note: `Row ${rowNum} (${item.name}): ${notes.join('; ')}` } : { item };
    },
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{storageUnits.length} storage units</p>
        <div className="flex gap-2">
          <ImportButton spec={importSpec} />
          <button onClick={() => downloadCSV(
            ['Name','Type','Temperature','Model','Location','Layout','Vials','Reagents'],
            storageUnits.map(s => {
              const vialCount = cryoVials.filter(v => v.storageUnitId === s.id).length;
              const reagentCount = reagents.filter(r => r.storageUnitId === s.id).length;
              const layout = isRackBased(s.type)
                ? (s.numRacks ? `${s.numRacks}R x ${s.boxesPerRack}B x ${s.gridRows}x${s.gridCols}` : '—')
                : (s.numDoors || s.numShelves ? `${s.numDoors || 1} door(s) x ${s.numShelves || 0} shelves` : '—');
              return [s.name, s.type, s.temperature, s.model, s.location, layout, vialCount, reagentCount];
            }), 'storage_units')} className={btnExport}><Download size={14} /> Export</button>
          <button onClick={() => open()} className={btnAdd}><Plus size={14} /> Add Unit</button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {storageUnits.map(s => {
          const info = storageUnitTypes[s.type] || { label: s.type, icon: '📦' };
          const vialCount = cryoVials.filter(v => v.storageUnitId === s.id).length;
          const reagentCount = reagents.filter(r => r.storageUnitId === s.id).length;
          const totalSlots = isRackBased(s.type) ? (s.numRacks || 0) * (s.boxesPerRack || 0) * (s.gridRows || 0) * (s.gridCols || 0) : 0;
          const pct = totalSlots > 0 ? Math.round((vialCount / totalSlots) * 100) : 0;
          return (
            <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className="text-2xl">{info.icon}</div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 font-manrope">{s.name}</h3>
                    <p className="text-[10px] text-gray-400 font-manrope">{info.label} &middot; {s.temperature}</p>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  <button onClick={() => open(s)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={12} /></button>
                  <button onClick={() => {
                    const vialsHere = cryoVials.filter(v => v.storageUnitId === s.id);
                    const reagentsHere = reagents.filter(r => r.storageUnitId === s.id);
                    const parts = [`"${s.name}" will be permanently removed.`];
                    if (vialsHere.length) parts.push(`Its ${vialsHere.length} stored vial${vialsHere.length > 1 ? 's' : ''} will also be permanently deleted.`);
                    if (reagentsHere.length) parts.push(`${reagentsHere.length} reagent${reagentsHere.length > 1 ? 's' : ''} will be unlinked from it (kept in inventory).`);
                    confirmDelete('Delete Storage Unit?', parts.join(' '), () => {
                      vialsHere.forEach(v => removeCryoVial(v.id));
                      reagentsHere.forEach(r => updateReagent({ ...r, storageUnitId: undefined }));
                      removeStorageUnit(s.id);
                    });
                  }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
                </div>
              </div>
              <div className="space-y-1 text-[11px] font-manrope text-gray-500">
                {s.model && <div className="flex justify-between"><span>Model</span><span className="text-gray-700">{s.model}</span></div>}
                <div className="flex justify-between"><span>Location</span><span className="text-gray-700">{locations.find(l => l.id === s.locationId)?.name || s.location || '—'}</span></div>
                {reagentCount > 0 && <div className="flex justify-between"><span>Reagents</span><span className="text-gray-700">{reagentCount} items</span></div>}
                {/* Rack-based: show grid config + vial occupancy */}
                {isRackBased(s.type) && totalSlots > 0 && (
                  <>
                    <div className="flex justify-between"><span>Racks / Boxes</span><span className="text-gray-700">{s.numRacks}R &times; {s.boxesPerRack}B &times; {s.gridRows}&times;{s.gridCols}</span></div>
                    <div className="flex justify-between"><span>Vials</span><span className="text-gray-700">{vialCount} / {totalSlots} ({pct}%)</span></div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full mt-1">
                      <div className="h-full bg-cyan-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </>
                )}
                {/* Shelf-based: show compartments + shelves */}
                {isShelfBased(s.type) && (s.numDoors || s.numShelves) && (
                  <div className="flex justify-between"><span>Layout</span><span className="text-gray-700">{s.numDoors === 2 ? '2 doors (L+R)' : '1 door'} &middot; {s.numShelves || 0} shelves</span></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {showForm && <Modal title={editing ? 'Edit Storage Unit' : 'Add Storage Unit'} onClose={() => setShowForm(false)}>
        <div className="space-y-3">
          <Field label="Name"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g., ULT Freezer #1" className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type">
              <select value={form.type} onChange={e => changeType(e.target.value as StorageUnitType)} className={inputCls}>
                {allTypes.map(t => <option key={t} value={t}>{storageUnitTypes[t].icon} {storageUnitTypes[t].label} ({storageUnitTypes[t].temperature})</option>)}
              </select>
            </Field>
            <Field label="Temperature"><input value={form.temperature} onChange={e => setForm({ ...form, temperature: e.target.value })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Model"><input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="e.g., Thermo TSX600" className={inputCls} /></Field>
            <Field label="Location">
              <select value={form.locationId || ''} onChange={e => { const loc = locations.find(l => l.id === e.target.value); setForm({ ...form, locationId: e.target.value || undefined, location: loc?.name || form.location }); }} className={inputCls}>
                <option value="">— Select location</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}{l.building ? ` (${l.building})` : ''}</option>)}
              </select>
            </Field>
          </div>

          {/* === Rack / Box / Vial Grid — only for cryo-type (DEWAR, ULT_FREEZER, FREEZER_40) === */}
          {isRackBased(form.type) && (
            <div className="border-t border-gray-100 pt-3 mt-2">
              <p className="text-xs font-semibold text-gray-600 font-manrope mb-2">
                Rack / Box / Vial Grid <span className="font-normal text-gray-400">(cryo &amp; ultra-low storage)</span>
              </p>
              <div className="grid grid-cols-4 gap-2">
                <Field label="Racks"><input type="number" min={0} value={form.numRacks ?? ''} onChange={e => setForm({ ...form, numRacks: e.target.value === '' ? undefined : Number(e.target.value) })} className={inputCls} /></Field>
                <Field label="Boxes/Rack"><input type="number" min={0} value={form.boxesPerRack ?? ''} onChange={e => setForm({ ...form, boxesPerRack: e.target.value === '' ? undefined : Number(e.target.value) })} className={inputCls} /></Field>
                <Field label="Grid rows"><input type="number" min={0} max={15} value={form.gridRows ?? ''} onChange={e => setForm({ ...form, gridRows: e.target.value === '' ? undefined : Number(e.target.value) })} className={inputCls} /></Field>
                <Field label="Grid cols"><input type="number" min={0} max={15} value={form.gridCols ?? ''} onChange={e => setForm({ ...form, gridCols: e.target.value === '' ? undefined : Number(e.target.value) })} className={inputCls} /></Field>
              </div>
              {(form.numRacks && form.boxesPerRack && form.gridRows && form.gridCols) ? (
                <div className="bg-cyan-50 rounded-xl p-2.5 mt-2 text-xs font-manrope text-cyan-700">
                  Total capacity: {form.numRacks * form.boxesPerRack * form.gridRows * form.gridCols} vial slots
                </div>
              ) : null}
            </div>
          )}

          {/* === Shelves / Compartments — for fridge, freezer, cabinet, etc. === */}
          {isShelfBased(form.type) && (
            <div className="border-t border-gray-100 pt-3 mt-2">
              <p className="text-xs font-semibold text-gray-600 font-manrope mb-2">
                Doors &amp; Shelves
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Doors">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setForm({ ...form, numDoors: 1 })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium font-manrope transition-all ${form.numDoors === 1 || !form.numDoors ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      1 door
                    </button>
                    <button type="button" onClick={() => setForm({ ...form, numDoors: 2 })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium font-manrope transition-all ${form.numDoors === 2 ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      2 doors (L+R)
                    </button>
                  </div>
                </Field>
                <Field label="Shelves"><input type="number" min={0} value={form.numShelves ?? ''} onChange={e => setForm({ ...form, numShelves: e.target.value === '' ? undefined : Number(e.target.value) })} className={inputCls} /></Field>
              </div>
            </div>
          )}

          <button onClick={save} disabled={!form.name} className={btnPrimary}><Save size={16} /> {editing ? 'Save' : 'Add Storage Unit'}</button>
        </div>
      </Modal>}
      <ConfirmDialog />
    </>
  );
}

// ============================================================
// Reagents Tab — with macro-category selector
// ============================================================
function ReagentsTab() {
  const { reagents, addNewReagent, updateReagent, removeReagent, storageUnits } = useLabContext();
  const [ConfirmDialog, confirmDelete] = useConfirm();
  const [activeMacro, setActiveMacro] = useState<ReagentMacroCategory>('Reagents');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('All');
  const [editing, setEditing] = useState<Reagent | null>(null);
  const [showForm, setShowForm] = useState(false);

  const macroInfo = reagentMacroCategories[activeMacro];
  // Items in this macro-category
  const macroFiltered = useMemo(() => reagents.filter(r => macroInfo.subCategories.includes(r.category)), [reagents, macroInfo]);
  // Further filter by selected sub-category
  const filtered = useMemo(() => selectedSubCat === 'All' ? macroFiltered : macroFiltered.filter(r => r.category === selectedSubCat), [macroFiltered, selectedSubCat]);
  // All sub-categories for current macro (from data + from definition, deduplicated)
  const availableSubCategories = useMemo(() => {
    const fromData = new Set(macroFiltered.map(r => r.category));
    macroInfo.subCategories.forEach(c => fromData.add(c));
    return Array.from(fromData);
  }, [macroFiltered, macroInfo]);
  // Sub-category counts
  const subCatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    macroFiltered.forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1; });
    return counts;
  }, [macroFiltered]);

  // Reset sub-category filter when switching macro
  const switchMacro = (k: ReagentMacroCategory) => { setActiveMacro(k); setSelectedSubCat('All'); };

  const defaultCategory = selectedSubCat !== 'All' ? selectedSubCat : macroInfo.subCategories[0];
  const empty = (): Reagent => ({ id: generateId(), name: '', category: defaultCategory, currentStock: 0, maxStock: 10, unit: 'units', expiryDate: '', location: '', storageUnitId: undefined, supplier: '', catalogNumber: '', alertThreshold: 2 });
  const [form, setForm] = useState<Reagent>(empty());

  const open = (r?: Reagent) => { setForm(r ? { ...r } : empty()); setEditing(r || null); setShowForm(true); };
  const save = () => { if (!form.name) return; editing ? updateReagent(form) : addNewReagent(form); setShowForm(false); };

  const getUnitName = (id?: string) => { if (!id) return '—'; const u = storageUnits.find(s => s.id === id); return u ? `${storageUnitTypes[u.type]?.icon || ''} ${u.name}` : id; };

  // Sorting
  const rAcc = useMemo(() => ({ name: (r: Reagent) => r.name, category: (r: Reagent) => r.category, stock: (r: Reagent) => r.currentStock, supplier: (r: Reagent) => r.supplier, storage: (r: Reagent) => getUnitName(r.storageUnitId), expiry: (r: Reagent) => r.expiryDate || 'zzz' }), [storageUnits]);
  const { sorted: sortedReagents, sortKey: rSortKey, sortAsc: rSortAsc, toggle: rToggle } = useSort(filtered, 'name', rAcc);

  // Counts per macro-category
  const macroCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    allMacroKeys.forEach(k => { counts[k] = reagents.filter(r => reagentMacroCategories[k].subCategories.includes(r.category)).length; });
    return counts;
  }, [reagents]);

  // ---- CSV import spec ----
  const findUnitId = (val: string): string | undefined => {
    const v = val.trim().toLowerCase();
    if (!v) return undefined;
    const u = storageUnits.find(s => s.name.toLowerCase() === v || `${storageUnitTypes[s.type]?.icon || ''} ${s.name}`.trim().toLowerCase() === v);
    return u?.id;
  };
  const importSpec: ImportSpec<Reagent> = {
    title: 'Import items (CSV)',
    headers: ['Name', 'Category', 'Stock', 'Max', 'Unit', 'Supplier', 'Cat#', 'Storage Unit', 'Expiry', 'Alert'],
    aliases: { 'Cat#': ['catalog', 'catalog #', 'catalog number', 'cat'], 'Stock': ['current stock'], 'Max': ['max stock'], 'Unit': ['units'], 'Storage Unit': ['storage'], 'Expiry': ['expiry date'], 'Alert': ['alert at', 'alert threshold'] },
    template: [
      ['DMEM High Glucose', 'Culture Media', 10, 12, 'bottles (500mL)', 'Gibco', '11965092', '', '2026-06-15', 2],
      ['Trypsin-EDTA 0.05%', 'Reagents', 5, 8, 'bottles', 'Gibco', '25300054', 'Fridge A (+4 °C)', '2026-09-01', 2],
      ['DAPI', 'Staining', 1, 3, 'vials', 'Sigma', 'D9542', 'Freezer −20 °C', '2027-01-01', 1],
    ],
    templateName: 'consumables_template',
    notes: <>
      <p><strong>Category</strong>: a sub-category (e.g. Culture Media, Reagents…). If blank, items go to <em>{defaultCategory}</em>.</p>
      <p><strong>Storage Unit</strong>: must match an existing unit name; otherwise imported without a link. <strong>Expiry</strong>: YYYY-MM-DD.</p>
    </>,
    onAdd: addNewReagent,
    parseRow: (rec, rowNum) => {
      if (!rec['Name']) return { skip: `Row ${rowNum}: missing name` };
      const storageVal = rec['Storage Unit'];
      const storageUnitId = findUnitId(storageVal);
      const num = (v: string, fb: number) => { const n = Number(v); return v !== '' && Number.isFinite(n) ? n : fb; };
      const currentStock = num(rec['Stock'], 0);
      const item: Reagent = {
        id: generateId(), name: rec['Name'], category: rec['Category'] || defaultCategory,
        currentStock, maxStock: num(rec['Max'], Math.max(currentStock, 1)), unit: rec['Unit'] || 'units',
        expiryDate: rec['Expiry'], location: storageUnitId ? (storageUnits.find(s => s.id === storageUnitId)?.name || '') : '',
        storageUnitId, supplier: rec['Supplier'], catalogNumber: rec['Cat#'], alertThreshold: num(rec['Alert'], 0),
      };
      return storageVal && !storageUnitId
        ? { item, note: `Row ${rowNum} (${item.name}): storage "${storageVal}" not found — imported without a storage unit` }
        : { item };
    },
  };

  return (
    <>
      {/* Macro-category selector */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {allMacroKeys.map(k => {
          const info = reagentMacroCategories[k];
          const count = macroCounts[k] || 0;
          return (
            <button key={k} onClick={() => switchMacro(k)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium font-manrope whitespace-nowrap transition-all ${activeMacro === k ? 'bg-[#102C53] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <span>{info.icon}</span> {info.label} <span className="opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-category filter (shown when macro has multiple sub-categories) */}
      {availableSubCategories.length > 1 && (
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
          <button onClick={() => setSelectedSubCat('All')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium font-manrope whitespace-nowrap transition-all ${selectedSubCat === 'All' ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
            All <span className="opacity-70">{macroFiltered.length}</span>
          </button>
          {availableSubCategories.map(cat => (
            <button key={cat} onClick={() => setSelectedSubCat(cat)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium font-manrope whitespace-nowrap transition-all ${selectedSubCat === cat ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
              {cat} <span className="opacity-70">{subCatCounts[cat] || 0}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{filtered.length} items{selectedSubCat !== 'All' ? ` in ${selectedSubCat}` : ` in ${macroInfo.label}`}</p>
        <div className="flex gap-2">
          <ImportButton spec={importSpec} />
          <button onClick={() => downloadCSV(['Name','Category','Stock','Max','Unit','Supplier','Cat#','Storage Unit','Expiry','Alert'], filtered.map(r => [r.name, r.category, r.currentStock, r.maxStock, r.unit, r.supplier, r.catalogNumber, getUnitName(r.storageUnitId), r.expiryDate, r.alertThreshold]), `inventory_${activeMacro.toLowerCase().replace(/\s+/g, '_')}`)} className={btnExport}><Download size={14} /> Export</button>
          <button onClick={() => open()} className={btnAdd}><Plus size={14} /> Add</button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-xs font-manrope"><thead><tr className="bg-gray-50 border-b border-gray-200">
          <SortTh label="Name" k="name" sortKey={rSortKey} sortAsc={rSortAsc} toggle={rToggle} />
          {availableSubCategories.length > 1 && <SortTh label="Category" k="category" sortKey={rSortKey} sortAsc={rSortAsc} toggle={rToggle} />}
          <SortTh label="Stock" k="stock" sortKey={rSortKey} sortAsc={rSortAsc} toggle={rToggle} />
          <SortTh label="Supplier" k="supplier" sortKey={rSortKey} sortAsc={rSortAsc} toggle={rToggle} />
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Cat#</th>
          <SortTh label="Storage" k="storage" sortKey={rSortKey} sortAsc={rSortAsc} toggle={rToggle} />
          <SortTh label="Expiry" k="expiry" sortKey={rSortKey} sortAsc={rSortAsc} toggle={rToggle} />
          <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Actions</th>
        </tr></thead><tbody className="divide-y divide-gray-100">
          {sortedReagents.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
              {availableSubCategories.length > 1 && <td className="px-3 py-2 text-gray-500">{r.category}</td>}
              <td className="px-3 py-2"><span className={r.currentStock <= r.alertThreshold ? 'text-red-600 font-medium' : 'text-gray-900'}>{r.currentStock}/{r.maxStock} {r.unit}</span></td>
              <td className="px-3 py-2 text-gray-500">{r.supplier}</td><td className="px-3 py-2 text-gray-500 font-mono">{r.catalogNumber}</td>
              <td className="px-3 py-2 text-gray-500 max-w-[120px] truncate">{getUnitName(r.storageUnitId)}</td>
              <td className="px-3 py-2 text-gray-500">{r.expiryDate}</td>
              <td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">
                <button onClick={() => open(r)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13} /></button>
                <button onClick={() => confirmDelete('Delete Item?', `"${r.name}" will be permanently removed from inventory.`, () => removeReagent(r.id))} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
              </div></td>
            </tr>
          ))}
          {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">No items in this category</td></tr>}
        </tbody></table>
      </div></div>
      {showForm && <Modal title={editing ? `Edit ${macroInfo.label} Item` : `Add ${macroInfo.label} Item`} onClose={() => setShowForm(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
            <Field label="Category">
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
                {availableSubCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Stock"><input type="number" min={0} value={form.currentStock || ''} onChange={e => setForm({ ...form, currentStock: e.target.value === '' ? 0 : Number(e.target.value) })} className={inputCls} /></Field>
            <Field label="Max"><input type="number" min={1} value={form.maxStock || ''} onChange={e => setForm({ ...form, maxStock: e.target.value === '' ? 0 : Number(e.target.value) })} className={inputCls} /></Field>
            <Field label="Alert At"><input type="number" min={0} value={form.alertThreshold || ''} onChange={e => setForm({ ...form, alertThreshold: e.target.value === '' ? 0 : Number(e.target.value) })} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit"><input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className={inputCls} /></Field>
            <Field label="Storage Unit">
              <select value={form.storageUnitId || ''} onChange={e => setForm({ ...form, storageUnitId: e.target.value || undefined, location: storageUnits.find(s => s.id === e.target.value)?.name || form.location })} className={inputCls}>
                <option value="">— Not assigned</option>
                {storageUnits.map(s => <option key={s.id} value={s.id}>{storageUnitTypes[s.type]?.icon} {s.name} ({s.temperature})</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Supplier"><input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} className={inputCls} /></Field>
            <Field label="Catalog #"><input value={form.catalogNumber} onChange={e => setForm({ ...form, catalogNumber: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Expiry Date"><input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} className={inputCls} /></Field>
          <button onClick={save} disabled={!form.name} className={btnPrimary}><Save size={16} /> {editing ? 'Save' : 'Add Item'}</button>
        </div>
      </Modal>}

      <ConfirmDialog />
    </>
  );
}

// ============================================================
// Cryo Vials Tab
// ============================================================
function CryoTab() {
  const { cryoVials, addCryoVial, removeCryoVial, user, storageUnits } = useLabContext();
  const [ConfirmDialog, confirmDelete] = useConfirm();
  const [showForm, setShowForm] = useState(false);
  // Only grid-capable units for cryo
  const gridUnits = storageUnits.filter(s => s.numRacks && s.boxesPerRack && s.gridRows && s.gridCols);
  const empty = () => ({ cellLine: '', passage: 0, date: new Date().toISOString().split('T')[0], userId: user.id, userName: user.name, storageUnitId: gridUnits[0]?.id || '', rack: 1, box: 1, row: 0, col: 0, notes: '' });
  const [form, setForm] = useState(empty());

  const save = () => {
    if (!form.cellLine || !form.storageUnitId) return;
    addCryoVial(form);
    setShowForm(false);
    setForm(empty());
  };

  const getUnitName = (id: string) => { const u = storageUnits.find(s => s.id === id); return u ? `${storageUnitTypes[u.type]?.icon || ''} ${u.name}` : id; };
  const getPositionStr = (v: typeof cryoVials[0]) => { const su = storageUnits.find(s => s.id === v.storageUnitId); const rows = su?.gridRows ? getRowLabels(su.gridRows) : getRowLabels(5); return `R${v.rack}B${v.box} ${rows[v.row] || '?'}${v.col + 1}`; };

  const vAcc = useMemo(() => ({ cellLine: (v: typeof cryoVials[0]) => v.cellLine, passage: (v: typeof cryoVials[0]) => v.passage, storage: (v: typeof cryoVials[0]) => getUnitName(v.storageUnitId), position: (v: typeof cryoVials[0]) => getPositionStr(v), user: (v: typeof cryoVials[0]) => v.userName, date: (v: typeof cryoVials[0]) => v.date }), [storageUnits]);
  const { sorted: sortedVials, sortKey: vSortKey, sortAsc: vSortAsc, toggle: vToggle } = useSort(cryoVials, 'cellLine', vAcc);

  const importSpec: ImportSpec<Omit<CryoVial, 'id'>> = {
    title: 'Import cryo vials (CSV)',
    headers: ['Cell Line', 'Passage', 'Storage Unit', 'Rack', 'Box', 'Row', 'Col', 'Stored By', 'Date', 'Notes'],
    aliases: { 'Cell Line': ['cellline', 'cell'], 'Stored By': ['user', 'stored by'] },
    template: [
      ['HUVEC', 5, gridUnits[0]?.name || 'LN₂ Dewar A', 1, 1, 0, 0, '', new Date().toISOString().split('T')[0], 'Early passage'],
    ],
    templateName: 'cryo_vials_template',
    notes: <>
      <p><strong>Storage Unit</strong>: must match an existing rack-based unit by name. Rows/Cols are 0-based; Rack/Box start at 1.</p>
      <p><strong>Stored By</strong>: defaults to you if blank. <strong>Date</strong>: YYYY-MM-DD.</p>
    </>,
    onAdd: addCryoVial,
    parseRow: (rec, rowNum) => {
      if (!rec['Cell Line']) return { skip: `Row ${rowNum}: missing cell line` };
      const suVal = rec['Storage Unit'];
      const su = storageUnits.find(s => s.id === suVal || s.name.toLowerCase() === suVal.toLowerCase());
      if (!su) return { skip: `Row ${rowNum} (${rec['Cell Line']}): storage unit "${suVal}" not found — skipped` };
      const numD = (v: string, fb: number) => { const n = Number(v); return v !== '' && Number.isFinite(n) ? n : fb; };
      const item: Omit<CryoVial, 'id'> = {
        cellLine: rec['Cell Line'], passage: numD(rec['Passage'], 0),
        date: rec['Date'] || new Date().toISOString().split('T')[0],
        userId: user.id, userName: rec['Stored By'] || user.name, storageUnitId: su.id,
        rack: numD(rec['Rack'], 1), box: numD(rec['Box'], 1), row: numD(rec['Row'], 0), col: numD(rec['Col'], 0),
        notes: rec['Notes'],
      };
      return { item };
    },
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{cryoVials.length} vials stored</p>
        <div className="flex gap-2">
          <ImportButton spec={importSpec} />
          <button onClick={() => downloadCSV(['Cell Line','Passage','Storage Unit','Position','Stored By','Date','Notes'], cryoVials.map(v => {
            const su = storageUnits.find(s => s.id === v.storageUnitId);
            const rows = su?.gridRows ? getRowLabels(su.gridRows) : getRowLabels(5);
            return [v.cellLine, v.passage, getUnitName(v.storageUnitId), `R${v.rack}B${v.box} ${rows[v.row] || '?'}${v.col + 1}`, v.userName, v.date, v.notes];
          }), 'cryo_vials')} className={btnExport}><Download size={14} /> Export</button>
          <button onClick={() => { setForm(empty()); setShowForm(true); }} className={btnAdd}><Plus size={14} /> Add Vial</button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-xs font-manrope"><thead><tr className="bg-gray-50 border-b border-gray-200">
          <SortTh label="Cell Line" k="cellLine" sortKey={vSortKey} sortAsc={vSortAsc} toggle={vToggle} />
          <SortTh label="P" k="passage" sortKey={vSortKey} sortAsc={vSortAsc} toggle={vToggle} />
          <SortTh label="Storage" k="storage" sortKey={vSortKey} sortAsc={vSortAsc} toggle={vToggle} />
          <SortTh label="Position" k="position" sortKey={vSortKey} sortAsc={vSortAsc} toggle={vToggle} />
          <SortTh label="Stored By" k="user" sortKey={vSortKey} sortAsc={vSortAsc} toggle={vToggle} />
          <SortTh label="Date" k="date" sortKey={vSortKey} sortAsc={vSortAsc} toggle={vToggle} />
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Notes</th>
          <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Actions</th>
        </tr></thead><tbody className="divide-y divide-gray-100">
          {sortedVials.map(v => {
            const su = storageUnits.find(s => s.id === v.storageUnitId);
            const rows = su?.gridRows ? getRowLabels(su.gridRows) : getRowLabels(5);
            return (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">{v.cellLine}</td><td className="px-3 py-2 text-gray-600">P{v.passage}</td>
                <td className="px-3 py-2 text-gray-500">{su ? `${storageUnitTypes[su.type]?.icon || ''} ${su.name}` : v.storageUnitId}</td>
                <td className="px-3 py-2 text-gray-600 font-mono">R{v.rack} B{v.box} {rows[v.row] || '?'}{v.col + 1}</td>
                <td className="px-3 py-2 text-gray-500">{v.userName}</td><td className="px-3 py-2 text-gray-500">{v.date}</td>
                <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{v.notes}</td>
                <td className="px-3 py-2 text-right"><button onClick={() => confirmDelete('Remove Vial?', `${v.cellLine} P${v.passage} will be permanently removed.`, () => removeCryoVial(v.id))} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button></td>
              </tr>
            );
          })}
        </tbody></table>
      </div></div>
      {showForm && <Modal title="Add Vial" onClose={() => setShowForm(false)}>
        <div className="space-y-3">
          <Field label="Cell Line"><input value={form.cellLine} onChange={e => setForm({ ...form, cellLine: e.target.value })} placeholder="HUVECs, iPSC-CMs..." className={inputCls} list="cllist" /><datalist id="cllist">{Array.from(new Set(cryoVials.map(v => v.cellLine))).map(c => <option key={c} value={c} />)}</datalist></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Passage"><input type="number" min={0} value={form.passage || ''} onChange={e => setForm({ ...form, passage: e.target.value === '' ? 0 : Number(e.target.value) })} className={inputCls} /></Field>
            <Field label="Date"><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Storage Unit"><select value={form.storageUnitId} onChange={e => setForm({ ...form, storageUnitId: e.target.value })} className={inputCls}>
            {gridUnits.map(s => <option key={s.id} value={s.id}>{storageUnitTypes[s.type]?.icon} {s.name} ({s.temperature})</option>)}
          </select></Field>
          <div className="grid grid-cols-4 gap-2">
            <Field label="Rack"><input type="number" min={1} value={form.rack || ''} onChange={e => setForm({ ...form, rack: e.target.value === '' ? 0 : Number(e.target.value) })} className={inputCls} /></Field>
            <Field label="Box"><input type="number" min={1} value={form.box || ''} onChange={e => setForm({ ...form, box: e.target.value === '' ? 0 : Number(e.target.value) })} className={inputCls} /></Field>
            <Field label="Row"><input type="number" min={0} value={form.row} onChange={e => setForm({ ...form, row: Number(e.target.value) })} className={inputCls} /></Field>
            <Field label="Col"><input type="number" min={0} value={form.col} onChange={e => setForm({ ...form, col: Number(e.target.value) })} className={inputCls} /></Field>
          </div>
          <Field label="Notes"><input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className={inputCls} /></Field>
          <button onClick={save} disabled={!form.cellLine} className="w-full py-3 bg-cyan-500 text-white rounded-xl font-semibold text-sm font-manrope hover:bg-cyan-600 disabled:opacity-40 flex items-center justify-center gap-2"><Save size={16} /> Store Vial</button>
        </div>
      </Modal>}
      <ConfirmDialog />
    </>
  );
}

// ============================================================
// Manuals Tab (with PDF upload)
// ============================================================
function ManualsTab() {
  const { manuals, addManual, updateManual, removeManual } = useLabContext();
  const [ConfirmDialog, confirmDelete] = useConfirm();
  const [editing, setEditing] = useState<Manual | null>(null);
  const [showForm, setShowForm] = useState(false);
  const categories: Manual['category'][] = ['protocol', 'manual', 'sds'];
  const catLabels: Record<string, string> = { protocol: 'Protocol', manual: 'Manual', sds: 'Safety Data Sheet' };
  const empty = (): Manual => ({ id: generateId(), title: '', category: 'protocol', description: '', lastUpdated: new Date().toISOString().split('T')[0], uploadedBy: '' });
  const [form, setForm] = useState<Manual>(empty());
  const fileRef = useRef<HTMLInputElement>(null);
  const open = (m?: Manual) => { setForm(m ? { ...m } : empty()); setEditing(m || null); setPendingFile(null); setShowForm(true); };
  const save = async () => {
    if (!form.title) return;
    setUploading(true);
    try {
      let finalForm = { ...form };
      if (pendingFile) {
        const { uploadManualFile } = await import('@/lib/supabase-storage');
        const url = await uploadManualFile(finalForm.id, pendingFile);
        if (url) { finalForm = { ...finalForm, fileUrl: url }; }
        else { alert('File upload failed. The manual will be saved without the PDF.'); }
      }
      delete finalForm.fileData;
      editing ? updateManual(finalForm) : addManual(finalForm);
      setShowForm(false);
    } finally { setUploading(false); }
  };

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert('File too large. Max 50 MB.'); return; }
    setPendingFile(file);
    setForm(f => ({ ...f, fileName: file.name, fileUrl: 'pending' }));
  };

  const mAcc = useMemo(() => ({ title: (m: Manual) => m.title, category: (m: Manual) => m.category, updated: (m: Manual) => m.lastUpdated || '', by: (m: Manual) => m.uploadedBy || '' }), []);
  const { sorted: sortedManuals, sortKey: mSortKey, sortAsc: mSortAsc, toggle: mToggle } = useSort(manuals, 'title', mAcc);

  const importSpec: ImportSpec<Manual> = {
    title: 'Import documents (CSV)',
    headers: ['Title', 'Category', 'Description', 'Instrument', 'Updated', 'Uploaded By'],
    aliases: { 'Updated': ['last updated', 'date'], 'Uploaded By': ['author', 'by'] },
    template: [
      ['Confocal SOP', 'protocol', 'Step-by-step imaging protocol', 'Confocal Microscope', new Date().toISOString().split('T')[0], 'Lab'],
      ['Acetone SDS', 'sds', 'Safety data sheet', '', new Date().toISOString().split('T')[0], 'Lab'],
    ],
    templateName: 'documents_template',
    notes: <p><strong>Category</strong>: protocol, manual, or sds (defaults to protocol). PDF files can&rsquo;t be imported via CSV — attach them afterwards by editing the record.</p>,
    onAdd: addManual,
    parseRow: (rec, rowNum) => {
      if (!rec['Title']) return { skip: `Row ${rowNum}: missing title` };
      const catRaw = rec['Category'].toLowerCase();
      const category = (['protocol', 'manual', 'sds'] as Manual['category'][]).includes(catRaw as Manual['category']) ? catRaw as Manual['category'] : 'protocol';
      const item: Manual = {
        id: generateId(), title: rec['Title'], category, description: rec['Description'],
        instrument: rec['Instrument'] || undefined,
        lastUpdated: rec['Updated'] || new Date().toISOString().split('T')[0],
        uploadedBy: rec['Uploaded By'] || 'Import',
      };
      return { item };
    },
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{manuals.length} documents</p>
        <div className="flex gap-2">
          <ImportButton spec={importSpec} />
          <button onClick={() => downloadCSV(['Title','Category','Description','Instrument','Updated','Uploaded By','Has PDF'], manuals.map(m => [m.title, m.category, m.description, m.instrument || '', m.lastUpdated, m.uploadedBy, m.fileUrl ? 'Yes' : 'No']), 'manuals')} className={btnExport}><Download size={14} /> Export</button>
          <button onClick={() => open()} className={btnAdd}><Plus size={14} /> Add</button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-xs font-manrope"><thead><tr className="bg-gray-50 border-b border-gray-200">
          <SortTh label="Title" k="title" sortKey={mSortKey} sortAsc={mSortAsc} toggle={mToggle} />
          <SortTh label="Category" k="category" sortKey={mSortKey} sortAsc={mSortAsc} toggle={mToggle} />
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Instrument</th>
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">PDF</th>
          <SortTh label="Updated" k="updated" sortKey={mSortKey} sortAsc={mSortAsc} toggle={mToggle} />
          <SortTh label="By" k="by" sortKey={mSortKey} sortAsc={mSortAsc} toggle={mToggle} />
          <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Actions</th>
        </tr></thead><tbody className="divide-y divide-gray-100">
          {sortedManuals.map(m => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900 max-w-[250px] truncate">{m.title}</td>
              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${m.category === 'protocol' ? 'bg-blue-50 text-blue-700' : m.category === 'manual' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{catLabels[m.category]}</span></td>
              <td className="px-3 py-2 text-gray-500">{m.instrument || '—'}</td>
              <td className="px-3 py-2">{m.fileUrl ? <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-[10px] font-medium">&#10003; {m.fileName}</span> : <span className="text-gray-300 text-[10px]">—</span>}</td>
              <td className="px-3 py-2 text-gray-500">{m.lastUpdated}</td><td className="px-3 py-2 text-gray-500">{m.uploadedBy}</td>
              <td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">
                {m.fileUrl && <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600"><Download size={13} /></a>}
                <button onClick={() => open(m)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13} /></button>
                <button onClick={() => confirmDelete('Delete Document?', `"${m.title}" will be permanently removed.`, () => removeManual(m.id))} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
              </div></td>
            </tr>
          ))}
        </tbody></table>
      </div></div>
      {showForm && <Modal title={editing ? 'Edit Document' : 'Add Document'} onClose={() => setShowForm(false)}>
        <div className="space-y-3">
          <Field label="Title"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category"><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Manual['category'] })} className={inputCls}>{categories.map(c => <option key={c} value={c}>{catLabels[c]}</option>)}</select></Field>
            <Field label="Linked Instrument"><input value={form.instrument || ''} onChange={e => setForm({ ...form, instrument: e.target.value || undefined })} placeholder="e.g., confocal" className={inputCls} /></Field>
          </div>
          <Field label="Description"><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className={inputCls + ' resize-none'} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Last Updated"><input type="date" value={form.lastUpdated} onChange={e => setForm({ ...form, lastUpdated: e.target.value })} className={inputCls} /></Field>
            <Field label="Uploaded By"><input value={form.uploadedBy} onChange={e => setForm({ ...form, uploadedBy: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="PDF File (max 50 MB)">
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 px-3 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm font-manrope text-gray-600 hover:border-[#4DC9FF] hover:text-[#102C53] transition-all flex-1">
                <Upload size={14} /> {pendingFile ? pendingFile.name : form.fileUrl ? form.fileName || 'File attached' : 'Choose PDF...'}
              </button>
              {(pendingFile || form.fileUrl) && <button type="button" onClick={() => { setPendingFile(null); setForm(f => ({ ...f, fileUrl: undefined, fileName: undefined })); }} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><X size={14} /></button>}
            </div>
          </Field>
          <button onClick={save} disabled={!form.title || uploading} className={btnPrimary}><Save size={16} /> {uploading ? 'Uploading...' : editing ? 'Save' : 'Add Document'}</button>
        </div>
      </Modal>}
      <ConfirmDialog />
    </>
  );
}

// ============================================================
// Calendar Tab
// ============================================================
function CalendarTab() {
  const { bookings, instruments, bookingSettings } = useLabContext();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const changeDate = (days: number) => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + days); setSelectedDate(d.toISOString().split('T')[0]); };
  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dayBookings = bookings.filter(b => b.date === selectedDate).sort((a, b) => a.startHour - b.startHour);
  const byInstrument = useMemo(() => { const map = new Map<string, typeof dayBookings>(); dayBookings.forEach(b => { const l = map.get(b.instrumentId) || []; l.push(b); map.set(b.instrumentId, l); }); return map; }, [dayBookings]);
  const HOURS = buildBookingSlots(bookingSettings);
  const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(selectedDate + 'T12:00:00'); d.setDate(d.getDate() + (i - 3)); return d; });

  return (
    <>
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between">
        <button onClick={() => changeDate(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900 font-manrope">{dateLabel}</p>
          <p className="text-xs text-gray-400 font-manrope">{dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''} across {byInstrument.size} instrument{byInstrument.size !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => changeDate(1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronRight size={18} /></button>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {weekDays.map(d => { const ds = d.toISOString().split('T')[0]; const count = bookings.filter(b => b.date === ds).length; const isToday = ds === new Date().toISOString().split('T')[0]; const isSel = ds === selectedDate; return (
          <button key={ds} onClick={() => setSelectedDate(ds)} className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-manrope transition-all shrink-0 ${isSel ? 'bg-[#102C53] text-white' : isToday ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
            <span className="font-medium">{d.toLocaleDateString('en', { weekday: 'short' })}</span><span className="text-lg font-bold mt-0.5">{d.getDate()}</span>{count > 0 && <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSel ? 'bg-white' : 'bg-blue-400'}`} />}
          </button>); })}
      </div>
      {dayBookings.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center text-gray-400 font-manrope text-sm">No bookings for this day</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto">
          <table className="w-full text-xs font-manrope border-collapse"><thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-2 py-2.5 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 w-16">Time</th>
            {Array.from(byInstrument.keys()).map(id => { const inst = instruments.find(i => i.id === id); return <th key={id} className="px-2 py-2.5 text-center font-semibold text-gray-700 min-w-[120px]"><span className="text-sm">{inst?.icon}</span> {inst?.name || id}</th>; })}
          </tr></thead><tbody>
            {HOURS.map(hour => { const hasAny = Array.from(byInstrument.values()).some(bks => bks.some(b => hour >= b.startHour && hour < b.endHour)); const working = isWorkingHour(hour, bookingSettings); return (
              <tr key={hour} className={`border-t border-gray-50 ${!hasAny ? 'opacity-40' : ''} ${working ? '' : 'bg-amber-50/40'}`}>
                <td className={`px-2 py-1.5 font-mono sticky left-0 ${working ? 'text-gray-400 bg-white' : 'text-amber-500 bg-amber-50'}`}>{formatTime(hour)}{!working && <Moon size={9} className="inline ml-0.5 opacity-70" />}</td>
                {Array.from(byInstrument.keys()).map(id => { const bks = byInstrument.get(id) || []; const bk = bks.find(b => hour >= b.startHour && hour < b.endHour); const isS = bk && bk.startHour === hour; return (
                  <td key={id} className="px-1 py-0.5">{bk ? <div className={`rounded px-2 py-1 ${isS ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800'}`}>{isS ? <div><span className="font-semibold">{bk.userName}</span><span className="ml-1 opacity-70">{formatTime(bk.startHour)}-{formatTime(bk.endHour)}</span>{bk.notes && <div className="text-[9px] opacity-80 truncate">{bk.notes}</div>}</div> : <span className="text-[9px] opacity-50">&nbsp;</span>}</div> : <div className="h-6" />}</td>); })}
              </tr>); })}
          </tbody></table>
        </div></div>
      )}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 font-manrope mb-3">Day Summary</h3>
        {dayBookings.length === 0 ? <p className="text-xs text-gray-400 font-manrope">No bookings</p> : (
          <div className="space-y-2">{dayBookings.map(b => { const inst = instruments.find(i => i.id === b.instrumentId); return (
            <div key={b.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
              <span className="text-lg shrink-0">{inst?.icon}</span>
              <div className="flex-1 min-w-0"><p className="text-xs font-medium text-gray-900 font-manrope">{inst?.name}</p><p className="text-[10px] text-gray-500 font-manrope">{b.userName} &middot; {b.notes}</p></div>
              <span className="text-xs font-mono text-gray-600 shrink-0">{formatTime(b.startHour)}-{formatTime(b.endHour)}</span>
            </div>); })}</div>
        )}
      </div>
    </>
  );
}

// ============================================================
// Schedule / Booking Hours Tab
// ============================================================
function ScheduleTab() {
  const { bookingSettings, updateBookingSettings } = useLabContext();
  const [draft, setDraft] = useState<BookingSettings>(bookingSettings);
  const [saved, setSaved] = useState(false);

  const hourOptions = Array.from({ length: 25 }, (_, i) => i); // 0..24
  const set = (patch: Partial<BookingSettings>) => { setDraft(d => ({ ...d, ...patch })); setSaved(false); };
  const dirty = JSON.stringify(draft) !== JSON.stringify(bookingSettings);
  const handleSave = () => { updateBookingSettings(draft); setSaved(true); };

  const previewSlots = buildBookingSlots(draft);

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={16} className="text-[#102C53]" />
          <h2 className="text-sm font-bold text-gray-900 font-manrope">Booking Hours</h2>
        </div>
        <p className="text-xs text-gray-500 font-manrope mb-4">Working hours are highlighted on every instrument calendar. Bookings outside this band are allowed but marked as &ldquo;extra hours&rdquo;.</p>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-emerald-700 mb-1 font-manrope"><Sun size={12} /> Working hours start</label>
            <select value={draft.workStartHour} onChange={e => set({ workStartHour: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope outline-none focus:ring-2 focus:ring-[#4DC9FF]">
              {hourOptions.map(h => <option key={h} value={h}>{formatTime(h)}</option>)}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-emerald-700 mb-1 font-manrope"><Sun size={12} /> Working hours end</label>
            <select value={draft.workEndHour} onChange={e => set({ workEndHour: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope outline-none focus:ring-2 focus:ring-[#4DC9FF]">
              {hourOptions.map(h => <option key={h} value={h}>{formatTime(h)}</option>)}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-amber-600 mb-1 font-manrope"><Moon size={12} /> Calendar opens at</label>
            <select value={draft.openStartHour} onChange={e => set({ openStartHour: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope outline-none focus:ring-2 focus:ring-[#4DC9FF]">
              {hourOptions.map(h => <option key={h} value={h}>{formatTime(h)}</option>)}
            </select>
          </div>
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-amber-600 mb-1 font-manrope"><Moon size={12} /> Calendar closes at</label>
            <select value={draft.openEndHour} onChange={e => set({ openEndHour: Number(e.target.value) })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope outline-none focus:ring-2 focus:ring-[#4DC9FF]">
              {hourOptions.map(h => <option key={h} value={h}>{formatTime(h)}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Slot granularity</label>
            <div className="flex gap-2">
              {[30, 60].map(m => (
                <button key={m} onClick={() => set({ slotMinutes: m as 30 | 60 })} className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium font-manrope transition-all ${draft.slotMinutes === m ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {m === 30 ? '30 minutes' : '1 hour'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 rounded-xl">
          <p className="text-[11px] font-medium text-gray-600 font-manrope mb-2">Preview ({previewSlots.length} slots / day)</p>
          <div className="flex flex-wrap gap-1">
            {previewSlots.map(h => (
              <span key={h} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isWorkingHour(h, draft) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{formatTime(h)}</span>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button onClick={handleSave} disabled={!dirty} className="flex items-center gap-1.5 px-4 py-2.5 bg-[#102C53] text-white rounded-xl text-sm font-semibold font-manrope hover:bg-[#1a3d6e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Save size={15} /> Save hours
          </button>
          {saved && !dirty && <span className="flex items-center gap-1 text-xs text-green-600 font-manrope"><CheckCircle2 size={14} /> Saved</span>}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 font-manrope flex items-start gap-2">
        <AlertCircle size={14} className="shrink-0 mt-0.5" />
        <span>To share these hours across all users (and to store half-hour bookings), the Supabase migration <code className="bg-amber-100 px-1 rounded">scripts/supabase-booking-settings.sql</code> must be run once. Until then, changes apply only on this device.</span>
      </div>
    </div>
  );
}

// ============================================================
// Backup & Restore Tab
// ============================================================
function BackupTab() {
  const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });
  const jsonFileRef = useRef<HTMLInputElement>(null);
  const pdfFileRef = useRef<HTMLInputElement>(null);

  const showStatus = (type: 'success' | 'error', message: string) => {
    setStatus({ type, message });
    if (type === 'success') setTimeout(() => setStatus({ type: 'idle', message: '' }), 5000);
  };

  const handleExportJSON = async () => {
    setStatus({ type: 'loading', message: 'Exporting database...' });
    try {
      const { exportDatabaseJSON, downloadText, formatBackupDate } = await import('@/lib/backup');
      const json = await exportDatabaseJSON();
      downloadText(json, `mimic-backup-${formatBackupDate()}.json`);
      showStatus('success', 'Database exported successfully');
    } catch (e) { showStatus('error', `Export failed: ${e}`); }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('This will REPLACE all current data in the database. Are you sure?')) { e.target.value = ''; return; }
    setStatus({ type: 'loading', message: 'Restoring database...' });
    try {
      const text = await file.text();
      const { importDatabaseJSON } = await import('@/lib/backup');
      const result = await importDatabaseJSON(text);
      if (result.ok) { showStatus('success', 'Database restored successfully. Reload the page to see changes.'); }
      else { showStatus('error', `Restore completed with errors:\n${result.errors.join('\n')}`); }
    } catch (err) { showStatus('error', `Restore failed: ${err}`); }
    e.target.value = '';
  };

  const handleExportPDFs = async () => {
    setStatus({ type: 'loading', message: 'Downloading PDF files...' });
    try {
      const { exportPDFsZip, downloadBlob, formatBackupDate } = await import('@/lib/backup');
      const zip = await exportPDFsZip();
      if (!zip) { showStatus('error', 'No PDF files found in storage'); return; }
      downloadBlob(zip, `mimic-pdfs-${formatBackupDate()}.zip`);
      showStatus('success', 'PDFs downloaded successfully');
    } catch (e) { showStatus('error', `PDF export failed: ${e}`); }
  };

  const handleImportPDFs = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('This will upload all PDFs from the ZIP to storage (existing files with the same name will be overwritten). Continue?')) { e.target.value = ''; return; }
    setStatus({ type: 'loading', message: 'Uploading PDF files...' });
    try {
      const { importPDFsZip } = await import('@/lib/backup');
      const result = await importPDFsZip(file);
      if (result.ok) { showStatus('success', `${result.uploaded} PDF(s) restored successfully`); }
      else { showStatus('error', `Uploaded ${result.uploaded} files with errors:\n${result.errors.join('\n')}`); }
    } catch (err) { showStatus('error', `PDF restore failed: ${err}`); }
    e.target.value = '';
  };

  const cardCls = 'bg-white rounded-xl p-5 shadow-sm border border-gray-100';
  const btnPrimary = 'flex items-center gap-2 px-4 py-2.5 bg-[#102C53] text-white text-sm font-medium font-manrope rounded-xl hover:bg-[#102C53]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const btnOutline = 'flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 text-gray-600 text-sm font-medium font-manrope rounded-xl hover:border-[#4DC9FF] hover:text-[#102C53] transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const isLoading = status.type === 'loading';

  return (
    <>
      {/* Status banner */}
      {status.type !== 'idle' && (
        <div className={`flex items-start gap-3 p-4 rounded-xl text-sm font-manrope ${
          status.type === 'loading' ? 'bg-blue-50 text-blue-800' :
          status.type === 'success' ? 'bg-green-50 text-green-800' :
          'bg-red-50 text-red-800'
        }`}>
          {status.type === 'loading' && <Loader2 size={16} className="animate-spin shrink-0 mt-0.5" />}
          {status.type === 'success' && <CheckCircle2 size={16} className="shrink-0 mt-0.5" />}
          {status.type === 'error' && <AlertCircle size={16} className="shrink-0 mt-0.5" />}
          <span className="whitespace-pre-wrap">{status.message}</span>
        </div>
      )}

      {/* Database */}
      <div className={cardCls}>
        <div className="flex items-center gap-2 mb-1">
          <DatabaseBackup size={18} className="text-[#102C53]" />
          <h2 className="text-sm font-bold text-gray-900 font-manrope">Database Backup</h2>
        </div>
        <p className="text-xs text-gray-500 font-manrope mb-4">Export or restore all data (users, instruments, reagents, bookings, cryo, wishlist, logs, manuals metadata, etc.) as a single JSON file.</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExportJSON} disabled={isLoading} className={btnPrimary}>
            <Download size={16} /> Export Database (JSON)
          </button>
          <input ref={jsonFileRef} type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
          <button onClick={() => jsonFileRef.current?.click()} disabled={isLoading} className={btnOutline}>
            <UploadCloud size={16} /> Restore Database (JSON)
          </button>
        </div>
      </div>

      {/* PDFs */}
      <div className={cardCls}>
        <div className="flex items-center gap-2 mb-1">
          <FileArchive size={18} className="text-[#102C53]" />
          <h2 className="text-sm font-bold text-gray-900 font-manrope">PDF Files Backup</h2>
        </div>
        <p className="text-xs text-gray-500 font-manrope mb-4">Download all uploaded PDFs (protocols, manuals, safety data sheets) as a ZIP file organized by category, or restore from a previously downloaded ZIP.</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleExportPDFs} disabled={isLoading} className={btnPrimary}>
            <Download size={16} /> Download All PDFs (ZIP)
          </button>
          <input ref={pdfFileRef} type="file" accept=".zip" onChange={handleImportPDFs} className="hidden" />
          <button onClick={() => pdfFileRef.current?.click()} disabled={isLoading} className={btnOutline}>
            <UploadCloud size={16} /> Restore PDFs (ZIP)
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
        <h3 className="text-xs font-bold text-amber-900 font-manrope mb-2 flex items-center gap-1.5"><AlertCircle size={14} /> Important Notes</h3>
        <ul className="text-xs text-amber-800 font-manrope space-y-1 list-disc list-inside">
          <li><strong>Database Restore</strong> replaces all existing data — make sure to export first as a safety measure.</li>
          <li><strong>PDF Restore</strong> uploads files and overwrites duplicates, but does not delete files not in the ZIP.</li>
          <li>After restoring the database, <strong>reload the page</strong> to see the updated data.</li>
          <li>Recommended: export a backup regularly (e.g., weekly) and store it in a safe location.</li>
        </ul>
      </div>
    </>
  );
}
