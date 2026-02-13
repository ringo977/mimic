'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit2, X, Users, FlaskConical, Microscope, Save, Download } from 'lucide-react';
import { useLabContext } from './LabContext';
import { LabUser, UserRole, Reagent, Instrument, rolePermissions, generateId } from '@/data/lab-data';

type Tab = 'users' | 'reagents' | 'instruments';

export default function AdminPage() {
  const ctx = useLabContext();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-4">
      <h1 className="text-lg font-bold text-gray-900 font-manrope">Admin Panel</h1>

      {/* Tab selector */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          { id: 'users' as Tab, label: 'Users', icon: Users, count: ctx.users.length },
          { id: 'reagents' as Tab, label: 'Reagents', icon: FlaskConical, count: ctx.reagents.length },
          { id: 'instruments' as Tab, label: 'Instruments', icon: Microscope, count: ctx.instruments.length },
        ]).map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium font-manrope whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon size={16} /> {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'reagents' && <ReagentsTab />}
      {activeTab === 'instruments' && <InstrumentsTab />}
    </div>
  );
}

// ============================================================
// Users Tab
// ============================================================
function UsersTab() {
  const { users, addUser, updateUser, removeUser } = useLabContext();
  const [editing, setEditing] = useState<LabUser | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const roles: UserRole[] = ['admin', 'pi', 'lab_manager', 'postdoc', 'phd', 'msc'];

  const emptyUser = (): LabUser => ({
    id: generateId(), email: '', pin: '0000', name: '', role: 'phd',
    certifications: [], projects: [],
  });

  const [form, setForm] = useState<LabUser>(emptyUser());

  const openAdd = () => { setForm(emptyUser()); setShowAdd(true); setEditing(null); };
  const openEdit = (u: LabUser) => { setForm({ ...u }); setEditing(u); setShowAdd(true); };

  const handleSave = () => {
    if (!form.name || !form.email) return;
    if (editing) {
      updateUser(form);
    } else {
      addUser(form);
    }
    setShowAdd(false); setEditing(null);
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'PIN', 'Certifications', 'Projects'];
    const rows = users.map(u => [u.name, u.email, u.role, u.pin, u.certifications.join('; '), u.projects.join('; ')]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'users.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{users.length} users registered</p>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium font-manrope hover:bg-gray-200">
            <Download size={14} /> Export
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-[#102C53] text-white rounded-xl text-xs font-medium font-manrope hover:bg-[#1a3d6e]">
            <Plus size={14} /> Add User
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-manrope">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Name</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Email</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Role</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">PIN</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Certifications</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Projects</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{u.name}</td>
                  <td className="px-3 py-2 text-gray-600">{u.email}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-medium">
                      {rolePermissions[u.role].label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500 font-mono">{u.pin}</td>
                  <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{u.certifications.length} certs</td>
                  <td className="px-3 py-2 text-gray-500 max-w-[150px] truncate">{u.projects.join(', ')}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13} /></button>
                      <button onClick={() => removeUser(u.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 font-manrope">{editing ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Full Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Role</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none">
                    {roles.map(r => <option key={r} value={r}>{rolePermissions[r].label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">PIN</label>
                  <input maxLength={4} value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none font-mono tracking-widest" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Certifications (comma-separated instrument IDs)</label>
                <input value={form.certifications.join(', ')} onChange={e => setForm({ ...form, certifications: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="confocal, spin-coater, flow-cytometer" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Projects (comma-separated)</label>
                <input value={form.projects.join(', ')} onChange={e => setForm({ ...form, projects: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="PHOENIX, REMODEL" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
              </div>
              <button onClick={handleSave} disabled={!form.name || !form.email} className="w-full py-3 bg-[#102C53] text-white rounded-xl font-semibold text-sm font-manrope hover:bg-[#1a3d6e] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                <Save size={16} /> {editing ? 'Save Changes' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// Reagents Tab
// ============================================================
function ReagentsTab() {
  const { reagents, addNewReagent, updateReagent, removeReagent } = useLabContext();
  const [editing, setEditing] = useState<Reagent | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const emptyReagent = (): Reagent => ({
    id: generateId(), name: '', category: 'Reagents', currentStock: 0, maxStock: 10,
    unit: 'units', expiryDate: '', location: '', supplier: '', catalogNumber: '', alertThreshold: 2,
  });

  const [form, setForm] = useState<Reagent>(emptyReagent());

  const openAdd = () => { setForm(emptyReagent()); setShowAdd(true); setEditing(null); };
  const openEdit = (r: Reagent) => { setForm({ ...r }); setEditing(r); setShowAdd(true); };

  const handleSave = () => {
    if (!form.name) return;
    if (editing) { updateReagent(form); } else { addNewReagent(form); }
    setShowAdd(false); setEditing(null);
  };

  const exportCSV = () => {
    const headers = ['Name', 'Category', 'Stock', 'Max', 'Unit', 'Supplier', 'Catalog #', 'Location', 'Expiry', 'Alert'];
    const rows = reagents.map(r => [r.name, r.category, r.currentStock, r.maxStock, r.unit, r.supplier, r.catalogNumber, r.location, r.expiryDate, r.alertThreshold]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'reagents.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{reagents.length} reagents in inventory</p>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium font-manrope hover:bg-gray-200">
            <Download size={14} /> Export
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-[#102C53] text-white rounded-xl text-xs font-medium font-manrope hover:bg-[#1a3d6e]">
            <Plus size={14} /> Add Reagent
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-manrope">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Name</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Category</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Stock</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Unit</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Supplier</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Cat. #</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Location</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Expiry</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reagents.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
                  <td className="px-3 py-2 text-gray-500">{r.category}</td>
                  <td className="px-3 py-2">
                    <span className={`font-medium ${r.currentStock <= r.alertThreshold ? 'text-red-600' : 'text-gray-900'}`}>
                      {r.currentStock}/{r.maxStock}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-500">{r.unit}</td>
                  <td className="px-3 py-2 text-gray-500">{r.supplier}</td>
                  <td className="px-3 py-2 text-gray-500 font-mono">{r.catalogNumber}</td>
                  <td className="px-3 py-2 text-gray-500">{r.location}</td>
                  <td className="px-3 py-2 text-gray-500">{r.expiryDate}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13} /></button>
                      <button onClick={() => removeReagent(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 font-manrope">{editing ? 'Edit Reagent' : 'Add Reagent'}</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Category</label>
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Culture Media, Staining..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" list="reagent-cats" />
                  <datalist id="reagent-cats">
                    {Array.from(new Set(reagents.map(r => r.category))).map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Current Stock</label>
                  <input type="number" min={0} value={form.currentStock || ''} onChange={e => setForm({ ...form, currentStock: e.target.value === '' ? 0 : Number(e.target.value) })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Max Stock</label>
                  <input type="number" min={1} value={form.maxStock || ''} onChange={e => setForm({ ...form, maxStock: e.target.value === '' ? 0 : Number(e.target.value) })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Alert At</label>
                  <input type="number" min={0} value={form.alertThreshold || ''} onChange={e => setForm({ ...form, alertThreshold: e.target.value === '' ? 0 : Number(e.target.value) })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Unit</label>
                  <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="bottles, vials, aliquots..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Location</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="4°C Fridge A, -20°C Freezer..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Supplier</label>
                  <input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Catalog #</label>
                  <input value={form.catalogNumber} onChange={e => setForm({ ...form, catalogNumber: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Expiry Date</label>
                <input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
              </div>
              <button onClick={handleSave} disabled={!form.name} className="w-full py-3 bg-[#102C53] text-white rounded-xl font-semibold text-sm font-manrope hover:bg-[#1a3d6e] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                <Save size={16} /> {editing ? 'Save Changes' : 'Add Reagent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// Instruments Tab
// ============================================================
function InstrumentsTab() {
  const { instruments, addInstrument, updateInstrument, removeInstrument } = useLabContext();
  const [editing, setEditing] = useState<Instrument | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const emptyInstrument = (): Instrument => ({
    id: generateId(), name: '', category: 'Cell Culture', location: '', requiresCertification: false, description: '', icon: '🔬',
  });

  const [form, setForm] = useState<Instrument>(emptyInstrument());

  const openAdd = () => { setForm(emptyInstrument()); setShowAdd(true); setEditing(null); };
  const openEdit = (i: Instrument) => { setForm({ ...i }); setEditing(i); setShowAdd(true); };

  const handleSave = () => {
    if (!form.name) return;
    if (editing) { updateInstrument(form); } else { addInstrument(form); }
    setShowAdd(false); setEditing(null);
  };

  const exportCSV = () => {
    const headers = ['Name', 'Category', 'Location', 'Description', 'Certification Required'];
    const rows = instruments.map(i => [i.name, i.category, i.location, i.description, i.requiresCertification ? 'Yes' : 'No']);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'instruments.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 font-manrope">{instruments.length} instruments configured</p>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium font-manrope hover:bg-gray-200">
            <Download size={14} /> Export
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 px-4 py-2 bg-[#102C53] text-white rounded-xl text-xs font-medium font-manrope hover:bg-[#1a3d6e]">
            <Plus size={14} /> Add Instrument
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-manrope">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Icon</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Name</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Category</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Location</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Description</th>
                <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Cert.</th>
                <th className="px-3 py-2.5 text-right font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {instruments.map(i => (
                <tr key={i.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-lg">{i.icon}</td>
                  <td className="px-3 py-2 font-medium text-gray-900">{i.name}</td>
                  <td className="px-3 py-2 text-gray-500">{i.category}</td>
                  <td className="px-3 py-2 text-gray-500">{i.location}</td>
                  <td className="px-3 py-2 text-gray-500 max-w-[200px] truncate">{i.description}</td>
                  <td className="px-3 py-2">
                    {i.requiresCertification ?
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-medium">Yes</span> :
                      <span className="px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 text-[10px]">No</span>
                    }
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(i)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600"><Edit2 size={13} /></button>
                      <button onClick={() => removeInstrument(i.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 font-manrope">{editing ? 'Edit Instrument' : 'Add Instrument'}</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Icon</label>
                  <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-center text-lg focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Name</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Category</label>
                  <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" list="inst-cats" />
                  <datalist id="inst-cats">
                    {Array.from(new Set(instruments.map(i => i.category))).map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Location</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="Room 101, Cleanroom..." className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Description</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.requiresCertification} onChange={e => setForm({ ...form, requiresCertification: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-[#102C53] focus:ring-[#4DC9FF]" />
                <span className="text-sm font-manrope text-gray-700">Requires certification</span>
              </label>
              <button onClick={handleSave} disabled={!form.name} className="w-full py-3 bg-[#102C53] text-white rounded-xl font-semibold text-sm font-manrope hover:bg-[#1a3d6e] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                <Save size={16} /> {editing ? 'Save Changes' : 'Add Instrument'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
