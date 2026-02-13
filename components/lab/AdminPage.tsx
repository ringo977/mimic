'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, Edit2, X, Users, FlaskConical, Microscope, Save, Download, Snowflake, BookOpen, FolderKanban, Award, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLabContext } from './LabContext';
import { LabUser, UserRole, Reagent, Instrument, Manual, CryoVial, rolePermissions, generateId, formatDate, formatTime } from '@/data/lab-data';

type Tab = 'users' | 'reagents' | 'instruments' | 'cryo' | 'manuals' | 'projects' | 'certifications' | 'calendar';

export default function AdminPage() {
  const ctx = useLabContext();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  const tabs: { id: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { id: 'users', label: 'Users', icon: Users, count: ctx.users.length },
    { id: 'reagents', label: 'Reagents', icon: FlaskConical, count: ctx.reagents.length },
    { id: 'instruments', label: 'Instruments', icon: Microscope, count: ctx.instruments.length },
    { id: 'cryo', label: 'Cryo Vials', icon: Snowflake, count: ctx.cryoVials.length },
    { id: 'manuals', label: 'Manuals', icon: BookOpen, count: ctx.manuals.length },
    { id: 'projects', label: 'Projects', icon: FolderKanban },
    { id: 'certifications', label: 'Certifications', icon: Award },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4">
      <h1 className="text-lg font-bold text-gray-900 font-manrope">Admin Panel</h1>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium font-manrope whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              <Icon size={14} /> {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
            </button>
          );
        })}
      </div>
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'reagents' && <ReagentsTab />}
      {activeTab === 'instruments' && <InstrumentsTab />}
      {activeTab === 'cryo' && <CryoTab />}
      {activeTab === 'manuals' && <ManualsTab />}
      {activeTab === 'projects' && <ProjectsTab />}
      {activeTab === 'certifications' && <CertificationsTab />}
      {activeTab === 'calendar' && <CalendarTab />}
    </div>
  );
}

// ============================================================
// Shared: CSV export helper
// ============================================================
function downloadCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// Shared: modal wrapper
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

// Shared: Input field
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">{label}</label>{children}</div>;
}

const inputCls = "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none";

// ============================================================
// Users Tab
// ============================================================
function UsersTab() {
  const { users, addUser, updateUser, removeUser } = useLabContext();
  const [editing, setEditing] = useState<LabUser | null>(null);
  const [showForm, setShowForm] = useState(false);
  const roles: UserRole[] = ['admin', 'pi', 'lab_manager', 'postdoc', 'phd', 'msc'];
  const empty = (): LabUser => ({ id: generateId(), email: '', pin: '0000', name: '', role: 'phd', certifications: [], projects: [] });
  const [form, setForm] = useState<LabUser>(empty());

  const open = (u?: LabUser) => { setForm(u ? { ...u } : empty()); setEditing(u || null); setShowForm(true); };
  const save = () => { if (!form.name || !form.email) return; editing ? updateUser(form) : addUser(form); setShowForm(false); };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{users.length} users</p>
        <div className="flex gap-2">
          <button onClick={() => downloadCSV(['Name','Email','Role','PIN','Certifications','Projects'], users.map(u => [u.name,u.email,u.role,u.pin,u.certifications.join('; '),u.projects.join('; ')]), 'users')} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium font-manrope hover:bg-gray-200"><Download size={14} /> Export</button>
          <button onClick={() => open()} className="flex items-center gap-1.5 px-4 py-2 bg-[#102C53] text-white rounded-xl text-xs font-medium font-manrope hover:bg-[#1a3d6e]"><Plus size={14} /> Add User</button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-xs font-manrope"><thead><tr className="bg-gray-50 border-b border-gray-200">
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Name</th>
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Email</th>
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Role</th>
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">PIN</th>
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Certs</th>
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Projects</th>
          <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Actions</th>
        </tr></thead><tbody className="divide-y divide-gray-100">
          {users.map(u => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{u.name}</td>
              <td className="px-3 py-2 text-gray-600">{u.email}</td>
              <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">{rolePermissions[u.role].label}</span></td>
              <td className="px-3 py-2 text-gray-500 font-mono">{u.pin}</td>
              <td className="px-3 py-2 text-gray-500">{u.certifications.length}</td>
              <td className="px-3 py-2 text-gray-500 max-w-[150px] truncate">{u.projects.join(', ')}</td>
              <td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">
                <button onClick={() => open(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13} /></button>
                <button onClick={() => removeUser(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
              </div></td>
            </tr>
          ))}
        </tbody></table>
      </div></div>
      {showForm && <Modal title={editing ? 'Edit User' : 'Add User'} onClose={() => setShowForm(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Full Name"><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className={inputCls} /></Field>
            <Field label="Email"><input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role"><select value={form.role} onChange={e => setForm({...form, role: e.target.value as UserRole})} className={inputCls}>{roles.map(r => <option key={r} value={r}>{rolePermissions[r].label}</option>)}</select></Field>
            <Field label="PIN"><input maxLength={4} value={form.pin} onChange={e => setForm({...form, pin: e.target.value})} className={inputCls + ' font-mono tracking-widest'} /></Field>
          </div>
          <Field label="Certifications (comma-separated instrument IDs)"><input value={form.certifications.join(', ')} onChange={e => setForm({...form, certifications: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} placeholder="confocal, spin-coater" className={inputCls} /></Field>
          <Field label="Projects (comma-separated)"><input value={form.projects.join(', ')} onChange={e => setForm({...form, projects: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} placeholder="PHOENIX, REMODEL" className={inputCls} /></Field>
          <button onClick={save} disabled={!form.name||!form.email} className="w-full py-3 bg-[#102C53] text-white rounded-xl font-semibold text-sm font-manrope hover:bg-[#1a3d6e] disabled:opacity-40 flex items-center justify-center gap-2"><Save size={16} /> {editing ? 'Save' : 'Add User'}</button>
        </div>
      </Modal>}
    </>
  );
}

// ============================================================
// Reagents Tab
// ============================================================
function ReagentsTab() {
  const { reagents, addNewReagent, updateReagent, removeReagent } = useLabContext();
  const [editing, setEditing] = useState<Reagent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const empty = (): Reagent => ({ id: generateId(), name: '', category: 'Reagents', currentStock: 0, maxStock: 10, unit: 'units', expiryDate: '', location: '', supplier: '', catalogNumber: '', alertThreshold: 2 });
  const [form, setForm] = useState<Reagent>(empty());
  const open = (r?: Reagent) => { setForm(r ? {...r} : empty()); setEditing(r || null); setShowForm(true); };
  const save = () => { if (!form.name) return; editing ? updateReagent(form) : addNewReagent(form); setShowForm(false); };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{reagents.length} reagents</p>
        <div className="flex gap-2">
          <button onClick={() => downloadCSV(['Name','Category','Stock','Max','Unit','Supplier','Cat#','Location','Expiry','Alert'], reagents.map(r=>[r.name,r.category,r.currentStock,r.maxStock,r.unit,r.supplier,r.catalogNumber,r.location,r.expiryDate,r.alertThreshold]), 'reagents')} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium font-manrope hover:bg-gray-200"><Download size={14} /> Export</button>
          <button onClick={() => open()} className="flex items-center gap-1.5 px-4 py-2 bg-[#102C53] text-white rounded-xl text-xs font-medium font-manrope hover:bg-[#1a3d6e]"><Plus size={14} /> Add</button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-xs font-manrope"><thead><tr className="bg-gray-50 border-b border-gray-200">
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Name</th><th className="px-3 py-2.5 text-left font-semibold text-gray-700">Category</th>
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Stock</th><th className="px-3 py-2.5 text-left font-semibold text-gray-700">Supplier</th>
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Cat#</th><th className="px-3 py-2.5 text-left font-semibold text-gray-700">Location</th>
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Expiry</th><th className="px-3 py-2.5 text-right font-semibold text-gray-700">Actions</th>
        </tr></thead><tbody className="divide-y divide-gray-100">
          {reagents.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td><td className="px-3 py-2 text-gray-500">{r.category}</td>
              <td className="px-3 py-2"><span className={r.currentStock<=r.alertThreshold?'text-red-600 font-medium':'text-gray-900'}>{r.currentStock}/{r.maxStock} {r.unit}</span></td>
              <td className="px-3 py-2 text-gray-500">{r.supplier}</td><td className="px-3 py-2 text-gray-500 font-mono">{r.catalogNumber}</td>
              <td className="px-3 py-2 text-gray-500">{r.location}</td><td className="px-3 py-2 text-gray-500">{r.expiryDate}</td>
              <td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">
                <button onClick={()=>open(r)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13}/></button>
                <button onClick={()=>removeReagent(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13}/></button>
              </div></td>
            </tr>
          ))}
        </tbody></table>
      </div></div>
      {showForm && <Modal title={editing?'Edit Reagent':'Add Reagent'} onClose={()=>setShowForm(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className={inputCls}/></Field>
            <Field label="Category"><input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className={inputCls} list="rcat"/><datalist id="rcat">{Array.from(new Set(reagents.map(r=>r.category))).map(c=><option key={c} value={c}/>)}</datalist></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Stock"><input type="number" min={0} value={form.currentStock||''} onChange={e=>setForm({...form,currentStock:e.target.value===''?0:Number(e.target.value)})} className={inputCls}/></Field>
            <Field label="Max"><input type="number" min={1} value={form.maxStock||''} onChange={e=>setForm({...form,maxStock:e.target.value===''?0:Number(e.target.value)})} className={inputCls}/></Field>
            <Field label="Alert At"><input type="number" min={0} value={form.alertThreshold||''} onChange={e=>setForm({...form,alertThreshold:e.target.value===''?0:Number(e.target.value)})} className={inputCls}/></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit"><input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} className={inputCls}/></Field>
            <Field label="Location"><input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className={inputCls}/></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Supplier"><input value={form.supplier} onChange={e=>setForm({...form,supplier:e.target.value})} className={inputCls}/></Field>
            <Field label="Catalog #"><input value={form.catalogNumber} onChange={e=>setForm({...form,catalogNumber:e.target.value})} className={inputCls}/></Field>
          </div>
          <Field label="Expiry Date"><input type="date" value={form.expiryDate} onChange={e=>setForm({...form,expiryDate:e.target.value})} className={inputCls}/></Field>
          <button onClick={save} disabled={!form.name} className="w-full py-3 bg-[#102C53] text-white rounded-xl font-semibold text-sm font-manrope hover:bg-[#1a3d6e] disabled:opacity-40 flex items-center justify-center gap-2"><Save size={16}/> {editing?'Save':'Add Reagent'}</button>
        </div>
      </Modal>}
    </>
  );
}

// ============================================================
// Instruments Tab
// ============================================================
function InstrumentsTab() {
  const { instruments, addInstrument, updateInstrument, removeInstrument } = useLabContext();
  const [editing, setEditing] = useState<Instrument|null>(null);
  const [showForm, setShowForm] = useState(false);
  const empty = (): Instrument => ({ id: generateId(), name: '', category: 'Cell Culture', location: '', requiresCertification: false, description: '', icon: '🔬' });
  const [form, setForm] = useState<Instrument>(empty());
  const open = (i?: Instrument) => { setForm(i?{...i}:empty()); setEditing(i||null); setShowForm(true); };
  const save = () => { if (!form.name) return; editing?updateInstrument(form):addInstrument(form); setShowForm(false); };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{instruments.length} instruments</p>
        <div className="flex gap-2">
          <button onClick={()=>downloadCSV(['Name','Category','Location','Description','Cert Required'], instruments.map(i=>[i.name,i.category,i.location,i.description,i.requiresCertification?'Yes':'No']), 'instruments')} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium font-manrope hover:bg-gray-200"><Download size={14}/> Export</button>
          <button onClick={()=>open()} className="flex items-center gap-1.5 px-4 py-2 bg-[#102C53] text-white rounded-xl text-xs font-medium font-manrope hover:bg-[#1a3d6e]"><Plus size={14}/> Add</button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-xs font-manrope"><thead><tr className="bg-gray-50 border-b border-gray-200">
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700"></th><th className="px-3 py-2.5 text-left font-semibold text-gray-700">Name</th>
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Category</th><th className="px-3 py-2.5 text-left font-semibold text-gray-700">Location</th>
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Cert.</th><th className="px-3 py-2.5 text-right font-semibold text-gray-700">Actions</th>
        </tr></thead><tbody className="divide-y divide-gray-100">
          {instruments.map(i => (
            <tr key={i.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 text-lg">{i.icon}</td><td className="px-3 py-2 font-medium text-gray-900">{i.name}</td>
              <td className="px-3 py-2 text-gray-500">{i.category}</td><td className="px-3 py-2 text-gray-500">{i.location}</td>
              <td className="px-3 py-2">{i.requiresCertification?<span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium">Yes</span>:<span className="text-gray-400 text-[10px]">No</span>}</td>
              <td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">
                <button onClick={()=>open(i)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13}/></button>
                <button onClick={()=>removeInstrument(i.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13}/></button>
              </div></td>
            </tr>
          ))}
        </tbody></table>
      </div></div>
      {showForm && <Modal title={editing?'Edit Instrument':'Add Instrument'} onClose={()=>setShowForm(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-3">
            <Field label="Icon"><input value={form.icon} onChange={e=>setForm({...form,icon:e.target.value})} className={inputCls+' text-center text-lg'}/></Field>
            <div className="col-span-4"><Field label="Name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} className={inputCls}/></Field></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category"><input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className={inputCls} list="icat"/><datalist id="icat">{Array.from(new Set(instruments.map(i=>i.category))).map(c=><option key={c} value={c}/>)}</datalist></Field>
            <Field label="Location"><input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className={inputCls}/></Field>
          </div>
          <Field label="Description"><input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className={inputCls}/></Field>
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.requiresCertification} onChange={e=>setForm({...form,requiresCertification:e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-[#102C53]"/><span className="text-sm font-manrope text-gray-700">Requires certification</span></label>
          <button onClick={save} disabled={!form.name} className="w-full py-3 bg-[#102C53] text-white rounded-xl font-semibold text-sm font-manrope hover:bg-[#1a3d6e] disabled:opacity-40 flex items-center justify-center gap-2"><Save size={16}/> {editing?'Save':'Add'}</button>
        </div>
      </Modal>}
    </>
  );
}

// ============================================================
// Cryo Vials Tab
// ============================================================
function CryoTab() {
  const { cryoVials, addCryoVial, removeCryoVial, user } = useLabContext();
  const [showForm, setShowForm] = useState(false);
  const ROWS = ['A','B','C','D','E'];
  const empty = () => ({ cellLine: '', passage: 0, date: new Date().toISOString().split('T')[0], userId: user.id, userName: user.name, tank: 1, rack: 1, box: 1, row: 0, col: 0, notes: '' });
  const [form, setForm] = useState(empty());

  const save = () => {
    if (!form.cellLine) return;
    addCryoVial(form);
    setShowForm(false);
    setForm(empty());
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{cryoVials.length} vials stored</p>
        <div className="flex gap-2">
          <button onClick={()=>downloadCSV(['Cell Line','Passage','Position','Stored By','Date','Notes'], cryoVials.map(v=>[v.cellLine,v.passage,`T${v.tank}R${v.rack}B${v.box} ${ROWS[v.row]}${v.col+1}`,v.userName,v.date,v.notes]), 'cryo_vials')} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium font-manrope hover:bg-gray-200"><Download size={14}/> Export</button>
          <button onClick={()=>{setForm(empty());setShowForm(true);}} className="flex items-center gap-1.5 px-4 py-2 bg-[#102C53] text-white rounded-xl text-xs font-medium font-manrope hover:bg-[#1a3d6e]"><Plus size={14}/> Add Vial</button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-xs font-manrope"><thead><tr className="bg-gray-50 border-b border-gray-200">
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Cell Line</th><th className="px-3 py-2.5 text-left font-semibold text-gray-700">P</th>
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Position</th><th className="px-3 py-2.5 text-left font-semibold text-gray-700">Stored By</th>
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Date</th><th className="px-3 py-2.5 text-left font-semibold text-gray-700">Notes</th>
          <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Actions</th>
        </tr></thead><tbody className="divide-y divide-gray-100">
          {cryoVials.map(v => (
            <tr key={v.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{v.cellLine}</td><td className="px-3 py-2 text-gray-600">P{v.passage}</td>
              <td className="px-3 py-2 text-gray-600 font-mono">T{v.tank} R{v.rack} B{v.box} {ROWS[v.row]}{v.col+1}</td>
              <td className="px-3 py-2 text-gray-500">{v.userName}</td><td className="px-3 py-2 text-gray-500">{v.date}</td>
              <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{v.notes}</td>
              <td className="px-3 py-2 text-right"><button onClick={()=>removeCryoVial(v.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13}/></button></td>
            </tr>
          ))}
        </tbody></table>
      </div></div>
      {showForm && <Modal title="Add Vial" onClose={()=>setShowForm(false)}>
        <div className="space-y-3">
          <Field label="Cell Line"><input value={form.cellLine} onChange={e=>setForm({...form,cellLine:e.target.value})} placeholder="HUVECs, iPSC-CMs..." className={inputCls} list="cllist"/><datalist id="cllist">{Array.from(new Set(cryoVials.map(v=>v.cellLine))).map(c=><option key={c} value={c}/>)}</datalist></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Passage"><input type="number" min={0} value={form.passage||''} onChange={e=>setForm({...form,passage:e.target.value===''?0:Number(e.target.value)})} className={inputCls}/></Field>
            <Field label="Date"><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className={inputCls}/></Field>
          </div>
          <div className="grid grid-cols-5 gap-2">
            <Field label="Tank"><input type="number" min={1} value={form.tank||''} onChange={e=>setForm({...form,tank:e.target.value===''?0:Number(e.target.value)})} className={inputCls}/></Field>
            <Field label="Rack"><input type="number" min={1} max={6} value={form.rack||''} onChange={e=>setForm({...form,rack:e.target.value===''?0:Number(e.target.value)})} className={inputCls}/></Field>
            <Field label="Box"><input type="number" min={1} max={5} value={form.box||''} onChange={e=>setForm({...form,box:e.target.value===''?0:Number(e.target.value)})} className={inputCls}/></Field>
            <Field label="Row"><select value={form.row} onChange={e=>setForm({...form,row:Number(e.target.value)})} className={inputCls}>{ROWS.map((r,i)=><option key={r} value={i}>{r}</option>)}</select></Field>
            <Field label="Col"><select value={form.col} onChange={e=>setForm({...form,col:Number(e.target.value)})} className={inputCls}>{[1,2,3,4,5].map(c=><option key={c} value={c-1}>{c}</option>)}</select></Field>
          </div>
          <Field label="Notes"><input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} className={inputCls}/></Field>
          <button onClick={save} disabled={!form.cellLine} className="w-full py-3 bg-cyan-500 text-white rounded-xl font-semibold text-sm font-manrope hover:bg-cyan-600 disabled:opacity-40 flex items-center justify-center gap-2"><Save size={16}/> Store Vial</button>
        </div>
      </Modal>}
    </>
  );
}

// ============================================================
// Manuals Tab
// ============================================================
function ManualsTab() {
  const { manuals, addManual, updateManual, removeManual } = useLabContext();
  const [editing, setEditing] = useState<Manual|null>(null);
  const [showForm, setShowForm] = useState(false);
  const categories: Manual['category'][] = ['protocol', 'manual', 'sds'];
  const catLabels = { protocol: 'Protocol', manual: 'Manual', sds: 'Safety Data Sheet' };
  const empty = (): Manual => ({ id: generateId(), title: '', category: 'protocol', description: '', lastUpdated: new Date().toISOString().split('T')[0], uploadedBy: '' });
  const [form, setForm] = useState<Manual>(empty());
  const open = (m?: Manual) => { setForm(m?{...m}:empty()); setEditing(m||null); setShowForm(true); };
  const save = () => { if (!form.title) return; editing?updateManual(form):addManual(form); setShowForm(false); };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{manuals.length} documents</p>
        <div className="flex gap-2">
          <button onClick={()=>downloadCSV(['Title','Category','Description','Instrument','Updated','Uploaded By'], manuals.map(m=>[m.title,m.category,m.description,m.instrument||'',m.lastUpdated,m.uploadedBy]), 'manuals')} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium font-manrope hover:bg-gray-200"><Download size={14}/> Export</button>
          <button onClick={()=>open()} className="flex items-center gap-1.5 px-4 py-2 bg-[#102C53] text-white rounded-xl text-xs font-medium font-manrope hover:bg-[#1a3d6e]"><Plus size={14}/> Add</button>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-xs font-manrope"><thead><tr className="bg-gray-50 border-b border-gray-200">
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Title</th><th className="px-3 py-2.5 text-left font-semibold text-gray-700">Category</th>
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Instrument</th><th className="px-3 py-2.5 text-left font-semibold text-gray-700">Updated</th>
          <th className="px-3 py-2.5 text-left font-semibold text-gray-700">By</th><th className="px-3 py-2.5 text-right font-semibold text-gray-700">Actions</th>
        </tr></thead><tbody className="divide-y divide-gray-100">
          {manuals.map(m => (
            <tr key={m.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900 max-w-[250px] truncate">{m.title}</td>
              <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${m.category==='protocol'?'bg-blue-50 text-blue-700':m.category==='manual'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{catLabels[m.category]}</span></td>
              <td className="px-3 py-2 text-gray-500">{m.instrument||'—'}</td><td className="px-3 py-2 text-gray-500">{m.lastUpdated}</td>
              <td className="px-3 py-2 text-gray-500">{m.uploadedBy}</td>
              <td className="px-3 py-2 text-right"><div className="flex justify-end gap-1">
                <button onClick={()=>open(m)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13}/></button>
                <button onClick={()=>removeManual(m.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13}/></button>
              </div></td>
            </tr>
          ))}
        </tbody></table>
      </div></div>
      {showForm && <Modal title={editing?'Edit Document':'Add Document'} onClose={()=>setShowForm(false)}>
        <div className="space-y-3">
          <Field label="Title"><input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className={inputCls}/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category"><select value={form.category} onChange={e=>setForm({...form,category:e.target.value as Manual['category']})} className={inputCls}>{categories.map(c=><option key={c} value={c}>{catLabels[c]}</option>)}</select></Field>
            <Field label="Linked Instrument (optional)"><input value={form.instrument||''} onChange={e=>setForm({...form,instrument:e.target.value||undefined})} placeholder="e.g., confocal" className={inputCls}/></Field>
          </div>
          <Field label="Description"><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} rows={2} className={inputCls+' resize-none'}/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Last Updated"><input type="date" value={form.lastUpdated} onChange={e=>setForm({...form,lastUpdated:e.target.value})} className={inputCls}/></Field>
            <Field label="Uploaded By"><input value={form.uploadedBy} onChange={e=>setForm({...form,uploadedBy:e.target.value})} className={inputCls}/></Field>
          </div>
          <button onClick={save} disabled={!form.title} className="w-full py-3 bg-[#102C53] text-white rounded-xl font-semibold text-sm font-manrope hover:bg-[#1a3d6e] disabled:opacity-40 flex items-center justify-center gap-2"><Save size={16}/> {editing?'Save':'Add Document'}</button>
        </div>
      </Modal>}
    </>
  );
}

// ============================================================
// Projects Tab
// ============================================================
function ProjectsTab() {
  const { users, reagents } = useLabContext();
  const allProjects = useMemo(() => {
    const set = new Set<string>();
    users.forEach(u => u.projects.forEach(p => set.add(p)));
    return Array.from(set).sort();
  }, [users]);

  return (
    <>
      <p className="text-sm text-gray-500 font-manrope">{allProjects.length} projects (extracted from user assignments)</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {allProjects.map(project => {
          const projectUsers = users.filter(u => u.projects.includes(project));
          return (
            <div key={project} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <FolderKanban size={16} className="text-[#102C53]" />
                <h3 className="text-sm font-bold text-gray-900 font-manrope">{project}</h3>
              </div>
              <p className="text-xs text-gray-500 font-manrope mb-2">{projectUsers.length} member{projectUsers.length !== 1 ? 's' : ''}</p>
              <div className="space-y-1">
                {projectUsers.map(u => (
                  <div key={u.id} className="flex items-center gap-2 text-xs font-manrope">
                    <div className="w-5 h-5 rounded-full bg-[#102C53] flex items-center justify-center text-white text-[8px] font-bold shrink-0">
                      {u.name.split(' ')[0][0]}{u.name.split(' ').pop()?.substring(0,2).toUpperCase()}
                    </div>
                    <span className="text-gray-700">{u.name}</span>
                    <span className="text-gray-400 text-[10px]">{rolePermissions[u.role].label}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 font-manrope">
        Projects are managed through user assignments. Edit a user in the Users tab to add/remove projects.
      </div>
    </>
  );
}

// ============================================================
// Certifications Tab
// ============================================================
function CertificationsTab() {
  const { users, instruments } = useLabContext();
  const certInstruments = instruments.filter(i => i.requiresCertification);

  return (
    <>
      <p className="text-sm text-gray-500 font-manrope">{certInstruments.length} instruments requiring certification</p>
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"><div className="overflow-x-auto">
        <table className="w-full text-xs font-manrope">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <th className="px-3 py-2.5 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10">User</th>
            {certInstruments.map(i => (
              <th key={i.id} className="px-2 py-2.5 text-center font-semibold text-gray-700 whitespace-nowrap">
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-sm">{i.icon}</span>
                  <span className="text-[9px] max-w-[60px] truncate">{i.name.replace(/\s*#\d+/, '')}</span>
                </div>
              </th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {users.filter(u => u.role !== 'admin').map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900 sticky left-0 bg-white whitespace-nowrap">{u.name}</td>
                {certInstruments.map(i => {
                  const hasCert = u.certifications.includes(i.id);
                  return (
                    <td key={i.id} className="px-2 py-2 text-center">
                      {hasCert ?
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-600 text-[10px] font-bold">✓</span> :
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-300 text-[10px]">—</span>
                      }
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div></div>
      <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 font-manrope">
        Certifications are managed through user profiles. Edit a user in the Users tab to add/remove instrument certifications (use instrument IDs like &quot;confocal&quot;, &quot;spin-coater&quot;, etc.).
      </div>
    </>
  );
}

// ============================================================
// Calendar Tab - All bookings overview
// ============================================================
function CalendarTab() {
  const { bookings, instruments } = useLabContext();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const changeDate = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dayBookings = bookings.filter(b => b.date === selectedDate).sort((a, b) => a.startHour - b.startHour);

  // Group by instrument
  const byInstrument = useMemo(() => {
    const map = new Map<string, typeof dayBookings>();
    dayBookings.forEach(b => {
      const list = map.get(b.instrumentId) || [];
      list.push(b);
      map.set(b.instrumentId, list);
    });
    return map;
  }, [dayBookings]);

  const HOURS = Array.from({ length: 13 }, (_, i) => i + 8);

  // Week nav
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + (i - 3));
    return d;
  });

  return (
    <>
      {/* Date nav */}
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between">
        <button onClick={() => changeDate(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronLeft size={18} /></button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900 font-manrope">{dateLabel}</p>
          <p className="text-xs text-gray-400 font-manrope">{dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''} across {byInstrument.size} instrument{byInstrument.size !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => changeDate(1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronRight size={18} /></button>
      </div>

      {/* Week strip */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {weekDays.map(d => {
          const ds = d.toISOString().split('T')[0];
          const count = bookings.filter(b => b.date === ds).length;
          const isToday = ds === new Date().toISOString().split('T')[0];
          const isSelected = ds === selectedDate;
          return (
            <button key={ds} onClick={() => setSelectedDate(ds)}
              className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-manrope transition-all shrink-0 ${isSelected ? 'bg-[#102C53] text-white' : isToday ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
              <span className="font-medium">{d.toLocaleDateString('en', { weekday: 'short' })}</span>
              <span className="text-lg font-bold mt-0.5">{d.getDate()}</span>
              {count > 0 && <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-blue-400'}`} />}
            </button>
          );
        })}
      </div>

      {/* Timeline grid: hours (rows) x instruments (columns) */}
      {dayBookings.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center text-gray-400 font-manrope text-sm">
          No bookings for this day
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-manrope border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-2 py-2.5 text-left font-semibold text-gray-700 sticky left-0 bg-gray-50 z-10 w-16">Time</th>
                  {Array.from(byInstrument.keys()).map(instId => {
                    const inst = instruments.find(i => i.id === instId);
                    return (
                      <th key={instId} className="px-2 py-2.5 text-center font-semibold text-gray-700 min-w-[120px]">
                        <span className="text-sm">{inst?.icon}</span> {inst?.name || instId}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {HOURS.map(hour => {
                  const hasAny = Array.from(byInstrument.values()).some(bks => bks.some(b => hour >= b.startHour && hour < b.endHour));
                  return (
                    <tr key={hour} className={`border-t border-gray-50 ${!hasAny ? 'opacity-40' : ''}`}>
                      <td className="px-2 py-1.5 text-gray-400 font-mono sticky left-0 bg-white">{formatTime(hour)}</td>
                      {Array.from(byInstrument.keys()).map(instId => {
                        const bks = byInstrument.get(instId) || [];
                        const booking = bks.find(b => hour >= b.startHour && hour < b.endHour);
                        const isStart = booking && booking.startHour === hour;
                        return (
                          <td key={instId} className="px-1 py-0.5">
                            {booking ? (
                              <div className={`rounded px-2 py-1 ${isStart ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-800'}`}>
                                {isStart ? (
                                  <div>
                                    <span className="font-semibold">{booking.userName}</span>
                                    <span className="ml-1 opacity-70">{formatTime(booking.startHour)}-{formatTime(booking.endHour)}</span>
                                    {booking.notes && <div className="text-[9px] opacity-80 truncate">{booking.notes}</div>}
                                  </div>
                                ) : <span className="text-[9px] opacity-50">&nbsp;</span>}
                              </div>
                            ) : <div className="h-6" />}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Day summary list */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900 font-manrope mb-3">Day Summary</h3>
        {dayBookings.length === 0 ? <p className="text-xs text-gray-400 font-manrope">No bookings</p> : (
          <div className="space-y-2">
            {dayBookings.map(b => {
              const inst = instruments.find(i => i.id === b.instrumentId);
              return (
                <div key={b.id} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                  <span className="text-lg shrink-0">{inst?.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 font-manrope">{inst?.name}</p>
                    <p className="text-[10px] text-gray-500 font-manrope">{b.userName} &middot; {b.notes}</p>
                  </div>
                  <span className="text-xs font-mono text-gray-600 shrink-0">{formatTime(b.startHour)}-{formatTime(b.endHour)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
