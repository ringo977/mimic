'use client';

import { useState } from 'react';
import { Plus, X, Check, XCircle, Download, AlertCircle, Package, Truck, Archive } from 'lucide-react';
import { useLabContext } from './LabContext';
import { formatDateTime, storageUnitTypes, generateId, Reagent } from '@/data/lab-data';

const urgencyColors = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  ordered: 'bg-blue-100 text-blue-700',
  delivered: 'bg-emerald-100 text-emerald-700',
};

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'ordered' | 'delivered';

export default function WishlistPage() {
  const { user, permissions, wishlist, addWishlistItem, updateWishlistStatus,
    storageUnits, reagents, addNewReagent, addReagentStock } = useLabContext();
  const [showAdd, setShowAdd] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');

  // Stock modal state
  const [stockItem, setStockItem] = useState<string | null>(null);
  const [stockMode, setStockMode] = useState<'new' | 'existing'>('new');
  const [stockReagentId, setStockReagentId] = useState('');
  const [stockUnitId, setStockUnitId] = useState(storageUnits[0]?.id || '');
  const [stockQtyStr, setStockQtyStr] = useState('');
  const stockQty = stockQtyStr === '' ? 0 : Number(stockQtyStr);
  // Editable fields for new reagent creation
  const [sName, setSName] = useState('');
  const [sCategory, setSCategory] = useState('Reagents');
  const [sSupplier, setSSupplier] = useState('');
  const [sCatalog, setSCatalog] = useState('');
  const [sUnit, setSUnit] = useState('units');
  const [sMaxStockStr, setSMaxStockStr] = useState('');
  const sMaxStock = sMaxStockStr === '' ? 0 : Number(sMaxStockStr);
  const [sAlertStr, setSAlertStr] = useState('1');
  const sAlert = sAlertStr === '' ? 0 : Number(sAlertStr);
  const [sExpiry, setSExpiry] = useState('');

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

  // Open stocking modal for a delivered item
  const openStockModal = (itemId: string) => {
    const item = wishlist.find(w => w.id === itemId);
    if (!item) return;
    setStockItem(itemId);
    setStockQtyStr(String(item.quantity));
    setStockUnitId(storageUnits[0]?.id || '');
    // Pre-fill editable fields from wishlist item
    setSName(item.name);
    setSCategory(item.type === 'antibody' ? 'Antibodies' : item.type === 'consumable' ? 'Consumables' : 'Reagents');
    setSSupplier(item.supplier);
    setSCatalog(item.catalogNumber);
    setSUnit('units');
    setSMaxStockStr(String(item.quantity * 2));
    setSAlertStr('1');
    setSExpiry(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    // Check if there's already a matching reagent
    const match = reagents.find(r =>
      r.catalogNumber.toLowerCase() === item.catalogNumber.toLowerCase() &&
      r.supplier.toLowerCase() === item.supplier.toLowerCase()
    );
    if (match) {
      setStockMode('existing');
      setStockReagentId(match.id);
    } else {
      setStockMode('new');
      setStockReagentId('');
    }
  };

  const handleStock = () => {
    if (!stockItem || stockQty <= 0) return;

    if (stockMode === 'existing' && stockReagentId) {
      // Add stock to existing reagent
      addReagentStock(stockReagentId, stockQty);
    } else {
      // Create new reagent from editable fields
      if (!sName) return;
      const su = storageUnits.find(s => s.id === stockUnitId);
      const newReagent: Reagent = {
        id: generateId(),
        name: sName,
        category: sCategory,
        currentStock: stockQty,
        maxStock: sMaxStock > 0 ? sMaxStock : stockQty * 2,
        unit: sUnit || 'units',
        expiryDate: sExpiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        location: su?.name || '',
        storageUnitId: stockUnitId || undefined,
        supplier: sSupplier,
        catalogNumber: sCatalog,
        alertThreshold: sAlert > 0 ? sAlert : 1,
      };
      addNewReagent(newReagent);
    }

    // Update wishlist item with stocking info
    updateWishlistStatus(stockItem, 'delivered', user.name);
    setStockItem(null);
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
  const totalApproved = wishlist.filter(w => w.status === 'approved' || w.status === 'ordered').reduce((sum, w) => sum + w.estimatedCost * w.quantity, 0);

  const allFilters: FilterStatus[] = ['all', 'pending', 'approved', 'ordered', 'delivered', 'rejected'];

  const stockModalItem = stockItem ? wishlist.find(w => w.id === stockItem) : null;
  const matchingReagent = stockModalItem ? reagents.find(r =>
    r.catalogNumber.toLowerCase() === stockModalItem.catalogNumber.toLowerCase() &&
    r.supplier.toLowerCase() === stockModalItem.supplier.toLowerCase()
  ) : null;

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
          <p className="text-2xl font-bold text-blue-600 font-manrope">{wishlist.filter(w => w.status === 'ordered').length}</p>
          <p className="text-xs text-gray-500 font-manrope">Ordered</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-yellow-600 font-manrope">&euro;{totalPending.toFixed(0)}</p>
          <p className="text-xs text-gray-500 font-manrope">Pending Total</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-2xl font-bold text-green-600 font-manrope">&euro;{totalApproved.toFixed(0)}</p>
          <p className="text-xs text-gray-500 font-manrope">Approved + Ordered</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {allFilters.map(f => (
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
          <div key={item.id} className={`bg-white rounded-xl p-4 shadow-sm border ${item.status === 'delivered' ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900 font-manrope">{item.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${urgencyColors[item.urgency]}`}>{item.urgency}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[item.status] || 'bg-gray-100 text-gray-600'}`}>{item.status}</span>
                </div>
                <p className="text-xs text-gray-500 font-manrope mt-1">
                  {item.supplier} &middot; {item.catalogNumber} &middot; Qty: {item.quantity}
                </p>
                <p className="text-xs text-gray-400 font-manrope mt-0.5">
                  Requested by {item.requestedByName} &middot; {formatDateTime(item.timestamp)}
                </p>
                {item.notes && <p className="text-xs text-gray-500 font-manrope mt-1 italic">{item.notes}</p>}
                {item.approvedBy && item.status !== 'delivered' && <p className="text-[10px] text-green-600 font-manrope mt-1">Approved by {item.approvedBy}</p>}
                {item.status === 'delivered' && (
                  <p className="text-[10px] text-emerald-600 font-manrope mt-1 flex items-center gap-1">
                    <Package size={10} /> Delivered &amp; stocked
                    {item.deliveredAt && ` &middot; ${formatDateTime(item.deliveredAt)}`}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-gray-900 font-manrope">&euro;{(item.estimatedCost * item.quantity).toFixed(0)}</p>
                <p className="text-[10px] text-gray-400 font-manrope">&euro;{item.estimatedCost}/unit</p>
              </div>
            </div>

            {/* Status actions */}
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
                  <Truck size={14} /> Mark as Ordered
                </button>
              </div>
            )}
            {permissions.canApproveOrders && item.status === 'ordered' && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => openStockModal(item.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold font-manrope hover:bg-emerald-100 transition-colors"
                >
                  <Archive size={14} /> Delivered &mdash; Stock to Inventory
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Request Modal */}
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
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Est. Cost (&euro;/unit)</label>
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

      {/* Stock-to-Inventory Modal */}
      {stockItem && stockModalItem && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 font-manrope">Stock to Inventory</h2>
              <button onClick={() => setStockItem(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              {/* Original wishlist info */}
              <div className="bg-gray-50 rounded-xl p-3 text-xs font-manrope text-gray-500">
                <span className="font-medium text-gray-700">Original request:</span> {stockModalItem.name} &middot; {stockModalItem.supplier} &middot; {stockModalItem.catalogNumber} &middot; Qty: {stockModalItem.quantity}
                {stockModalItem.notes && <span className="italic"> &mdash; {stockModalItem.notes}</span>}
              </div>

              {/* Mode selection */}
              {matchingReagent && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2 font-manrope">Stock as</label>
                  <div className="flex gap-2">
                    <button onClick={() => setStockMode('existing')}
                      className={`flex-1 p-3 rounded-xl border-2 text-xs font-medium font-manrope text-center transition-all ${stockMode === 'existing' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <Package size={16} className="mx-auto mb-1" />
                      Add to existing<br /><span className="font-bold">{matchingReagent.name}</span>
                    </button>
                    <button onClick={() => setStockMode('new')}
                      className={`flex-1 p-3 rounded-xl border-2 text-xs font-medium font-manrope text-center transition-all ${stockMode === 'new' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                      <Plus size={16} className="mx-auto mb-1" />
                      Create new<br />reagent entry
                    </button>
                  </div>
                </div>
              )}

              {/* Existing reagent info */}
              {stockMode === 'existing' && matchingReagent && (
                <div className="bg-emerald-50 rounded-xl p-3 text-xs font-manrope text-gray-600">
                  <p>Current stock: <span className="font-semibold text-gray-900">{matchingReagent.currentStock} / {matchingReagent.maxStock} {matchingReagent.unit}</span></p>
                  {matchingReagent.storageUnitId && (() => {
                    const su = storageUnits.find(s => s.id === matchingReagent.storageUnitId);
                    return su ? <p className="mt-1">Location: <span className="font-semibold text-gray-900">{storageUnitTypes[su.type]?.icon} {su.name}</span></p> : null;
                  })()}
                </div>
              )}

              {/* Editable fields for NEW reagent */}
              {stockMode === 'new' && (
                <div className="space-y-2.5 border border-gray-100 rounded-xl p-3 bg-white">
                  <p className="text-[10px] font-semibold text-gray-400 font-manrope uppercase tracking-wider">Reagent details (editable)</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-0.5 font-manrope">Name</label>
                      <input value={sName} onChange={e => setSName(e.target.value)} className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-0.5 font-manrope">Category</label>
                      <input value={sCategory} onChange={e => setSCategory(e.target.value)} className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" list="scat" />
                      <datalist id="scat">{Array.from(new Set(reagents.map(r => r.category))).map(c => <option key={c} value={c} />)}</datalist>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-0.5 font-manrope">Supplier</label>
                      <input value={sSupplier} onChange={e => setSSupplier(e.target.value)} className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-0.5 font-manrope">Catalog #</label>
                      <input value={sCatalog} onChange={e => setSCatalog(e.target.value)} className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-0.5 font-manrope">Unit</label>
                      <input value={sUnit} onChange={e => setSUnit(e.target.value)} placeholder="e.g., bottles, vials" className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-0.5 font-manrope">Max stock</label>
                      <input type="number" min={1} value={sMaxStockStr} onChange={e => setSMaxStockStr(e.target.value)} className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-0.5 font-manrope">Alert at</label>
                      <input type="number" min={0} value={sAlertStr} onChange={e => setSAlertStr(e.target.value)} className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-0.5 font-manrope">Expiry date</label>
                      <input type="date" value={sExpiry} onChange={e => setSExpiry(e.target.value)} className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-gray-600 mb-0.5 font-manrope">Storage Unit</label>
                      <select value={stockUnitId} onChange={e => setStockUnitId(e.target.value)}
                        className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none">
                        <option value="">— None</option>
                        {storageUnits.map(s => (
                          <option key={s.id} value={s.id}>{storageUnitTypes[s.type]?.icon} {s.name} ({s.temperature})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Quantity (always shown) */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Quantity to stock</label>
                <input type="number" min={1} value={stockQtyStr} onChange={e => setStockQtyStr(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
              </div>

              <button onClick={handleStock} disabled={stockQty <= 0 || (stockMode === 'new' && !sName)}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold text-sm font-manrope hover:bg-emerald-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                <Archive size={16} />
                {stockMode === 'existing' ? `Add ${stockQty} to ${matchingReagent?.name || 'stock'}` : `Create "${sName}" & stock ${stockQty}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
