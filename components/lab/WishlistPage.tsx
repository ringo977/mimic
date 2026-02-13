'use client';

import { useState } from 'react';
import { Plus, X, Check, XCircle, Download, AlertCircle } from 'lucide-react';
import { useLabContext } from './LabContext';
import { formatDateTime } from '@/data/lab-data';

const urgencyColors = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  ordered: 'bg-blue-100 text-blue-700',
};

export default function WishlistPage() {
  const { user, permissions, wishlist, addWishlistItem, updateWishlistStatus } = useLabContext();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'ordered'>('all');

  // Form
  const [name, setName] = useState('');
  const [type, setType] = useState<'reagent' | 'antibody' | 'consumable' | 'equipment'>('reagent');
  const [catalogNumber, setCatalogNumber] = useState('');
  const [supplier, setSupplier] = useState('');
  const [estimatedCostStr, setEstimatedCostStr] = useState('0');
  const [quantityStr, setQuantityStr] = useState('1');
  const estimatedCost = estimatedCostStr === '' ? 0 : Number(estimatedCostStr);
  const quantity = quantityStr === '' ? 0 : Number(quantityStr);
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [notes, setNotes] = useState('');

  const filtered = filter === 'all' ? wishlist : wishlist.filter(w => w.status === filter);

  const handleSubmit = () => {
    if (!name || !supplier) return;
    addWishlistItem({
      name, type, catalogNumber, supplier, estimatedCost, quantity, urgency,
      requestedBy: user.id, requestedByName: user.name, notes,
    });
    setShowAdd(false);
    resetForm();
  };

  const resetForm = () => {
    setName(''); setType('reagent'); setCatalogNumber(''); setSupplier('');
    setEstimatedCostStr('0'); setQuantityStr('1'); setUrgency('medium'); setNotes('');
  };

  const exportCSV = () => {
    const headers = ['Name', 'Type', 'Catalog #', 'Supplier', 'Est. Cost (€)', 'Qty', 'Urgency', 'Requested By', 'Status', 'Notes'];
    const rows = wishlist.map(w => [w.name, w.type, w.catalogNumber, w.supplier, w.estimatedCost, w.quantity, w.urgency, w.requestedByName, w.status, w.notes]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wishlist_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPending = wishlist.filter(w => w.status === 'pending').reduce((sum, w) => sum + w.estimatedCost * w.quantity, 0);
  const totalApproved = wishlist.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.estimatedCost * w.quantity, 0);

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900 font-manrope">Purchase Wishlist</h1>
        <div className="flex gap-2">
          {permissions.canExportData && (
            <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium font-manrope hover:bg-gray-200 transition-colors">
              <Download size={14} /> Export CSV
            </button>
          )}
          {permissions.canRequestOrders && (
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#102C53] text-white rounded-xl text-xs font-medium font-manrope hover:bg-[#1a3d6e] transition-colors">
              <Plus size={14} /> New Request
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-yellow-600 font-manrope">{wishlist.filter(w => w.status === 'pending').length}</p>
          <p className="text-xs text-gray-500 font-manrope">Pending</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-green-600 font-manrope">{wishlist.filter(w => w.status === 'approved').length}</p>
          <p className="text-xs text-gray-500 font-manrope">Approved</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-yellow-600 font-manrope">€{totalPending.toFixed(0)}</p>
          <p className="text-xs text-gray-500 font-manrope">Pending Total</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-green-600 font-manrope">€{totalApproved.toFixed(0)}</p>
          <p className="text-xs text-gray-500 font-manrope">Approved Total</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'pending', 'approved', 'rejected', 'ordered'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-manrope capitalize whitespace-nowrap transition-all ${
              filter === f ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f} {f !== 'all' && `(${wishlist.filter(w => w.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 font-manrope text-sm">No items found</div>
        )}
        {filtered.map(item => (
          <div key={item.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900 font-manrope">{item.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${urgencyColors[item.urgency]}`}>{item.urgency}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[item.status]}`}>{item.status}</span>
                </div>
                <p className="text-xs text-gray-500 font-manrope mt-1">
                  {item.supplier} &middot; {item.catalogNumber} &middot; Qty: {item.quantity}
                </p>
                <p className="text-xs text-gray-400 font-manrope mt-0.5">
                  Requested by {item.requestedByName} &middot; {formatDateTime(item.timestamp)}
                </p>
                {item.notes && <p className="text-xs text-gray-500 font-manrope mt-1 italic">{item.notes}</p>}
                {item.approvedBy && <p className="text-[10px] text-green-600 font-manrope mt-1">Approved by {item.approvedBy}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-900 font-manrope">€{(item.estimatedCost * item.quantity).toFixed(0)}</p>
                <p className="text-[10px] text-gray-400 font-manrope">€{item.estimatedCost}/unit</p>
              </div>
            </div>

            {/* Admin actions */}
            {permissions.canApproveOrders && item.status === 'pending' && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => updateWishlistStatus(item.id, 'approved', user.name)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-medium font-manrope hover:bg-green-100 transition-colors"
                >
                  <Check size={14} /> Approve
                </button>
                <button
                  onClick={() => updateWishlistStatus(item.id, 'rejected', user.name)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-medium font-manrope hover:bg-red-100 transition-colors"
                >
                  <XCircle size={14} /> Reject
                </button>
              </div>
            )}
            {permissions.canApproveOrders && item.status === 'approved' && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => updateWishlistStatus(item.id, 'ordered')}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-medium font-manrope hover:bg-blue-100 transition-colors"
                >
                  <AlertCircle size={14} /> Mark as Ordered
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 font-manrope">New Purchase Request</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Product Name</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Anti-VE-Cadherin" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Type</label>
                  <select value={type} onChange={e => setType(e.target.value as typeof type)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none">
                    <option value="reagent">Reagent</option>
                    <option value="antibody">Antibody</option>
                    <option value="consumable">Consumable</option>
                    <option value="equipment">Equipment</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Urgency</label>
                  <select value={urgency} onChange={e => setUrgency(e.target.value as typeof urgency)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Supplier</label>
                  <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="e.g., Abcam" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Catalog #</label>
                  <input value={catalogNumber} onChange={e => setCatalogNumber(e.target.value)} placeholder="e.g., ab33168" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Est. Cost (€/unit)</label>
                  <input type="number" min={0} value={estimatedCostStr} onChange={e => setEstimatedCostStr(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Quantity</label>
                  <input type="number" min={1} value={quantityStr} onChange={e => setQuantityStr(e.target.value)} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Why is this needed?" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none resize-none" />
              </div>
              <button onClick={handleSubmit} disabled={!name || !supplier} className="w-full py-3 bg-[#102C53] text-white rounded-xl font-semibold text-sm font-manrope hover:bg-[#1a3d6e] transition-colors disabled:opacity-40">
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
