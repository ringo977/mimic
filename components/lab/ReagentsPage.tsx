'use client';

import { useState, useMemo } from 'react';
import { Search, AlertTriangle, Plus, Minus, X, Package } from 'lucide-react';
import { useLabContext } from './LabContext';

export default function ReagentsPage() {
  const { user, permissions, reagents, withdrawReagent, addReagentStock } = useLabContext();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [modal, setModal] = useState<{ type: 'withdraw' | 'add'; reagentId: string } | null>(null);
  const [amount, setAmount] = useState(1);
  const [purpose, setPurpose] = useState('');
  const [project, setProject] = useState(user.projects[0] || '');

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(reagents.map(r => r.category)))];
  }, [reagents]);

  const filtered = useMemo(() => {
    return reagents.filter(r => {
      const matchCat = selectedCategory === 'All' || r.category === selectedCategory;
      const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.catalogNumber.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [reagents, selectedCategory, search]);

  const modalReagent = modal ? reagents.find(r => r.id === modal.reagentId) : null;

  const handleSubmit = () => {
    if (!modal || !modalReagent) return;
    if (modal.type === 'withdraw') {
      withdrawReagent(modal.reagentId, amount, purpose, project);
    } else {
      addReagentStock(modal.reagentId, amount);
    }
    setModal(null);
    setAmount(1);
    setPurpose('');
  };

  const stockPercent = (r: typeof reagents[0]) => Math.round((r.currentStock / r.maxStock) * 100);
  const stockColor = (r: typeof reagents[0]) => {
    const pct = stockPercent(r);
    if (pct <= 20) return 'bg-red-500';
    if (pct <= 40) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const isExpiringSoon = (r: typeof reagents[0]) => {
    const days = (new Date(r.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days < 60;
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-4">
      <h1 className="text-lg font-bold text-gray-900 font-manrope">Reagent Stock</h1>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search reagents or catalog #..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-manrope whitespace-nowrap transition-all ${
              selectedCategory === cat ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Reagent Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(r => (
          <div key={r.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-gray-900 font-manrope truncate">{r.name}</h3>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{r.supplier} &middot; {r.catalogNumber}</p>
              </div>
              {r.currentStock <= r.alertThreshold && (
                <AlertTriangle size={14} className="text-amber-500 shrink-0 ml-2" />
              )}
            </div>

            {/* Stock bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs font-manrope mb-1">
                <span className="text-gray-500">{r.currentStock} / {r.maxStock} {r.unit}</span>
                <span className={`font-semibold ${stockPercent(r) <= 20 ? 'text-red-500' : stockPercent(r) <= 40 ? 'text-amber-500' : 'text-emerald-600'}`}>
                  {stockPercent(r)}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${stockColor(r)}`} style={{ width: `${stockPercent(r)}%` }} />
              </div>
            </div>

            {/* Info */}
            <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-400 font-manrope">
              <span className="flex items-center gap-1"><Package size={10} />{r.location}</span>
              <span className={isExpiringSoon(r) ? 'text-red-500 font-medium' : ''}>
                Exp: {new Date(r.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              {permissions.canWithdrawReagents && (
                <button
                  onClick={() => { setModal({ type: 'withdraw', reagentId: r.id }); setAmount(1); setPurpose(''); setProject(user.projects[0] || ''); }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium font-manrope hover:bg-amber-100 transition-colors"
                >
                  <Minus size={12} /> Withdraw
                </button>
              )}
              {permissions.canAddReagents && (
                <button
                  onClick={() => { setModal({ type: 'add', reagentId: r.id }); setAmount(1); }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium font-manrope hover:bg-emerald-100 transition-colors"
                >
                  <Plus size={12} /> Restock
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400 font-manrope text-sm">No reagents found</div>
      )}

      {/* Modal */}
      {modal && modalReagent && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 font-manrope">
                {modal.type === 'withdraw' ? 'Withdraw Reagent' : 'Restock Reagent'}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-900 font-manrope">{modalReagent.name}</p>
                <p className="text-xs text-gray-500 font-manrope">Current: {modalReagent.currentStock} {modalReagent.unit}</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Amount ({modalReagent.unit})</label>
                <input
                  type="number"
                  min={1}
                  max={modal.type === 'withdraw' ? modalReagent.currentStock : modalReagent.maxStock - modalReagent.currentStock}
                  value={amount}
                  onChange={e => setAmount(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                />
              </div>

              {modal.type === 'withdraw' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Purpose</label>
                    <input
                      value={purpose}
                      onChange={e => setPurpose(e.target.value)}
                      placeholder="e.g., Cell culture, chip coating"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Project</label>
                    <select
                      value={project}
                      onChange={e => setProject(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                    >
                      {user.projects.map(p => <option key={p} value={p}>{p}</option>)}
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </>
              )}

              <button
                onClick={handleSubmit}
                className={`w-full py-3 rounded-xl font-semibold text-sm font-manrope text-white transition-colors ${
                  modal.type === 'withdraw' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                {modal.type === 'withdraw' ? `Withdraw ${amount}` : `Add ${amount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
