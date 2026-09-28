'use client';

import { useState, useMemo } from 'react';
import { Search, AlertTriangle, Plus, Minus, X, Package, LayoutGrid, Refrigerator, Lock, FlaskConical, Users, Pencil } from 'lucide-react';
import { useLabContext } from './LabContext';
import ReagentFormModal from './ReagentFormModal';
import { storageUnitTypes, reagentPlaceLabel, reagentShelf, reagentDoor, doorSideLabel, isShelfBased, boxesOfUnit, canAccessStock, reagentKindLabel, Reagent, StorageUnit, DoorSide, ReagentKind } from '@/data/lab-data';

export default function ReagentsPage() {
  const { user, users, permissions, reagents, withdrawReagent, addReagentStock, prepareWorkingSolution, storageUnits, storageBoxes } = useLabContext();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedKind, setSelectedKind] = useState<ReagentKind | 'All'>('All');
  const [view, setView] = useState<'list' | 'units'>('list');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');
  const [modal, setModal] = useState<{ type: 'withdraw' | 'add'; reagentId: string } | null>(null);
  const [amountStr, setAmountStr] = useState('1');
  const [purpose, setPurpose] = useState('');
  const [project, setProject] = useState(user.projects[0] || '');
  const amount = amountStr === '' ? 0 : Number(amountStr);
  // "Prepare working solution": from a stock (or from a working solution, picking its stock)
  const [prep, setPrep] = useState<{ stockId: string; workingId: string } | null>(null);
  const [prepTakenStr, setPrepTakenStr] = useState('1');
  const [prepMadeStr, setPrepMadeStr] = useState('1');
  const [prepNotes, setPrepNotes] = useState('');
  // Add a new reagent / edit an existing one (anyone with add_reagents)
  const [editForm, setEditForm] = useState<{ reagent: Reagent | null } | null>(null);

  // Who may take from this reagent (stocks are restricted to their responsibles)
  const canTake = (r: Reagent) => permissions.canWithdrawReagents && canAccessStock(user, r);
  const accessibleStocks = useMemo(() => reagents.filter(r => r.kind === 'stock' && canAccessStock(user, r)), [reagents, user]);
  const canPrepare = permissions.canWithdrawReagents && permissions.canAddReagents && accessibleStocks.length > 0;
  const responsibleNames = (r: Reagent) => (r.responsibleUserIds ?? []).map(id => users.find(u => u.id === id)?.name || '?');
  const stocks = useMemo(() => reagents.filter(r => r.kind === 'stock').sort((a, b) => a.name.localeCompare(b.name)), [reagents]);
  const workings = useMemo(() => reagents.filter(r => r.kind === 'working').sort((a, b) => a.name.localeCompare(b.name)), [reagents]);
  const kindCounts = useMemo(() => {
    const c = { stock: 0, working: 0, item: 0 };
    reagents.forEach(r => { c[r.kind ?? 'item']++; });
    return c;
  }, [reagents]);

  const openPrepare = (r: Reagent) => {
    if (r.kind === 'stock') {
      const ws = workings.filter(w => w.derivedFromId === r.id);
      setPrep({ stockId: r.id, workingId: ws[0]?.id || '' });
    } else {
      setPrep({ stockId: r.derivedFromId || '', workingId: r.id });
    }
    setPrepTakenStr('1'); setPrepMadeStr('1'); setPrepNotes('');
  };
  const prepStock = prep ? reagents.find(r => r.id === prep.stockId) : undefined;
  const prepWorking = prep ? reagents.find(r => r.id === prep.workingId) : undefined;
  const prepTaken = prepTakenStr === '' ? 0 : Number(prepTakenStr);
  const prepMade = prepMadeStr === '' ? 0 : Number(prepMadeStr);
  const prepTakenTooHigh = !!prepStock && prepTaken > prepStock.currentStock;
  const prepMadeTooHigh = !!prepWorking && prepWorking.maxStock > 0 && prepWorking.currentStock + prepMade > prepWorking.maxStock;
  const prepStockLocked = !!prepStock && !canAccessStock(user, prepStock);
  const prepOk = !!prepStock && !!prepWorking && prepTaken > 0 && prepMade > 0 && !prepTakenTooHigh && !prepMadeTooHigh && !prepStockLocked;
  const handlePrepare = () => {
    if (!prepOk || !prep) return;
    prepareWorkingSolution(prep.stockId, prepTaken, prep.workingId, prepMade, prepNotes.trim() || undefined);
    setPrep(null);
  };

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(reagents.map(r => r.category)))];
  }, [reagents]);

  const filtered = useMemo(() => {
    return reagents.filter(r => {
      const matchCat = selectedCategory === 'All' || r.category === selectedCategory;
      const matchKind = selectedKind === 'All' || (r.kind ?? 'item') === selectedKind;
      const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.catalogNumber.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchKind && matchSearch;
    });
  }, [reagents, selectedCategory, selectedKind, search]);

  const modalReagent = modal ? reagents.find(r => r.id === modal.reagentId) : null;

  // Same bounds the server enforces (and rejects, not clamps): withdraw at
  // most what is in stock; restock up to the maximum, or freely when no
  // maximum is set (maxStock 0).
  const maxAmount = modalReagent
    ? (modal?.type === 'withdraw'
        ? modalReagent.currentStock
        : (modalReagent.maxStock > 0 ? Math.max(0, modalReagent.maxStock - modalReagent.currentStock) : Number.POSITIVE_INFINITY))
    : 0;
  const amountTooHigh = !!modalReagent && amount > maxAmount;

  const handleSubmit = () => {
    if (!modal || !modalReagent) return;
    if (amount <= 0 || amountTooHigh) return;
    if (modal.type === 'withdraw') {
      withdrawReagent(modal.reagentId, amount, purpose, project);
    } else {
      addReagentStock(modal.reagentId, amount);
    }
    setModal(null);
    setAmountStr('1');
    setPurpose('');
  };

  const stockPercent = (r: typeof reagents[0]) => r.maxStock > 0 ? Math.min(100, Math.round((r.currentStock / r.maxStock) * 100)) : 0;
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
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-gray-900 font-manrope">Reagent Stock</h1>
        <div className="flex items-center gap-2">
        {permissions.canAddReagents && (
          <button onClick={() => setEditForm({ reagent: null })} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#102C53] text-white rounded-lg text-xs font-medium font-manrope hover:bg-[#1a3d6e] transition-colors" title="Add a reagent that is new to the lab">
            <Plus size={13} /> New reagent
          </button>
        )}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-manrope">
          <button onClick={() => setView('list')} className={`flex items-center gap-1 px-3 py-1.5 ${view === 'list' ? 'bg-[#102C53] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><LayoutGrid size={13} /> Items</button>
          <button onClick={() => setView('units')} className={`flex items-center gap-1 px-3 py-1.5 ${view === 'units' ? 'bg-[#102C53] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}><Refrigerator size={13} /> By unit</button>
        </div>
        </div>
      </div>

      {view === 'units' && (
        <UnitShelvesView
          reagents={reagents} storageUnits={storageUnits} storageBoxes={storageBoxes}
          selectedUnitId={selectedUnitId} onSelectUnit={setSelectedUnitId}
          search={search} onSearch={setSearch}
          canWithdraw={permissions.canWithdrawReagents} canAdd={permissions.canAddReagents}
          canTake={canTake}
          onWithdraw={id => { setModal({ type: 'withdraw', reagentId: id }); setAmountStr('1'); setPurpose(''); setProject(user.projects[0] || ''); }}
          onAdd={id => { setModal({ type: 'add', reagentId: id }); setAmountStr('1'); }}
        />
      )}

      {view === 'list' && <>

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

      {/* Stock / working solution / item */}
      {(kindCounts.stock > 0 || kindCounts.working > 0) && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(['All', 'stock', 'working', 'item'] as const).map(k => (
            <button
              key={k}
              onClick={() => setSelectedKind(k)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium font-manrope whitespace-nowrap border transition-all ${
                selectedKind === k ? 'bg-[#4DC9FF]/15 border-[#4DC9FF] text-[#102C53]' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {k === 'All' ? 'All types' : `${reagentKindLabel[k]}s`}{k !== 'All' && <span className="text-gray-400"> {kindCounts[k]}</span>}
            </button>
          ))}
          <span className="ml-auto self-center text-[10px] text-gray-400 font-manrope whitespace-nowrap hidden sm:inline">
            <Lock size={9} className="inline -mt-0.5" /> {accessibleStocks.length > 0 || !permissions.canWithdrawReagents
              ? 'stocks: only their responsibles can take from them'
              : 'stocks: you are not responsible for any yet — ask the lab manager'}
          </span>
        </div>
      )}

      {/* Reagent Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(r => (
          <div key={r.id} className={`bg-white rounded-xl p-4 shadow-sm border ${r.kind === 'stock' ? 'border-[#102C53]/30' : 'border-gray-100'}`}>
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-gray-900 font-manrope truncate flex items-center gap-1.5">
                  <KindBadge kind={r.kind} />
                  <span className="truncate">{r.name}</span>
                </h3>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{r.supplier} &middot; {r.catalogNumber}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {r.currentStock <= r.alertThreshold && <AlertTriangle size={14} className="text-amber-500" />}
                {permissions.canAddReagents && (
                  <button onClick={() => setEditForm({ reagent: r })} className="p-1 rounded-lg text-gray-300 hover:text-[#102C53] hover:bg-gray-100 transition-colors" title="Edit (lot, expiry, location, supplier…)" aria-label="Edit reagent">
                    <Pencil size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Stock: bar against the maximum when one is set, otherwise
                just the quantity (red when at/below the alert threshold) */}
            <div className="mt-3">
              {r.maxStock > 0 ? (
                <>
                  <div className="flex justify-between text-xs font-manrope mb-1">
                    <span className="text-gray-500">{r.currentStock} / {r.maxStock} {r.unit}</span>
                    <span className={`font-semibold ${stockPercent(r) <= 20 ? 'text-red-500' : stockPercent(r) <= 40 ? 'text-amber-500' : 'text-emerald-600'}`}>
                      {stockPercent(r)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${stockColor(r)}`} style={{ width: `${stockPercent(r)}%` }} />
                  </div>
                </>
              ) : (
                <div className="flex justify-between items-baseline text-xs font-manrope">
                  <span className={`font-semibold ${r.currentStock <= r.alertThreshold ? 'text-red-600' : 'text-gray-900'}`}>{r.currentStock} <span className="font-normal text-gray-500">{r.unit}</span></span>
                  {r.alertThreshold > 0 && <span className="text-[10px] text-gray-400">alert at {r.alertThreshold}</span>}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-400 font-manrope flex-wrap">
              <span className="flex items-center gap-1"><Package size={10} />{(() => {
                const su = r.storageUnitId ? storageUnits.find(s => s.id === r.storageUnitId) : undefined;
                const label = reagentPlaceLabel(r, storageUnits, storageBoxes);
                return su ? `${storageUnitTypes[su.type]?.icon || ''} ${label}` : label;
              })()}</span>
              <span className={isExpiringSoon(r) ? 'text-red-500 font-medium' : ''}>
                Exp: {new Date(r.expiryDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
              </span>
              {r.lot && <span className="font-mono">lot {r.lot}</span>}
              {r.owner && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{r.owner}</span>}
            </div>
            {r.kind === 'stock' && (
              <p className="mt-1.5 text-[10px] font-manrope flex items-center gap-1 text-[#102C53]">
                <Users size={10} />
                {responsibleNames(r).length ? <>Responsible: {responsibleNames(r).join(', ')}</> : <span className="text-amber-600">No responsible assigned yet</span>}
              </p>
            )}
            {r.kind === 'working' && (() => {
              const st = r.derivedFromId ? reagents.find(x => x.id === r.derivedFromId) : undefined;
              return <p className="mt-1.5 text-[10px] text-gray-500 font-manrope flex items-center gap-1"><FlaskConical size={10} /> {st ? <>From stock: <span className="text-gray-700">{st.name}</span></> : 'Stock not linked yet'}</p>;
            })()}
            {r.notes && <p className="mt-1.5 text-[10px] text-gray-400 font-manrope italic">{r.notes}</p>}

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              {permissions.canWithdrawReagents && (canTake(r) ? (
                <button
                  onClick={() => { setModal({ type: 'withdraw', reagentId: r.id }); setAmountStr('1'); setPurpose(''); setProject(user.projects[0] || ''); }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium font-manrope hover:bg-amber-100 transition-colors"
                >
                  <Minus size={12} /> Withdraw
                </button>
              ) : (
                <span
                  title={`Stock reserved to its responsibles${responsibleNames(r).length ? ': ' + responsibleNames(r).join(', ') : ''}`}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-gray-50 text-gray-400 text-xs font-medium font-manrope cursor-not-allowed"
                >
                  <Lock size={12} /> Responsibles only
                </span>
              ))}
              {permissions.canAddReagents && (
                <button
                  onClick={() => { setModal({ type: 'add', reagentId: r.id }); setAmountStr('1'); }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium font-manrope hover:bg-emerald-100 transition-colors"
                >
                  <Plus size={12} /> Restock
                </button>
              )}
            </div>
            {canPrepare && (r.kind === 'stock' && canTake(r) || r.kind === 'working') && (
              <button
                onClick={() => openPrepare(r)}
                className="w-full mt-2 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-[#4DC9FF]/60 text-[#102C53] text-[11px] font-medium font-manrope hover:bg-[#4DC9FF]/10 transition-colors"
              >
                <FlaskConical size={12} /> Prepare working solution
              </button>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400 font-manrope text-sm">No reagents found</div>
      )}
      </>}

      {editForm && (
        <ReagentFormModal
          initial={editForm.reagent}
          defaultCategory={selectedCategory !== 'All' ? selectedCategory : undefined}
          onClose={() => setEditForm(null)}
        />
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
                  max={Number.isFinite(maxAmount) ? maxAmount : undefined}
                  value={amountStr}
                  onChange={e => setAmountStr(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none ${amountTooHigh ? 'border-red-300' : 'border-gray-200'}`}
                />
                <p className={`text-[11px] mt-1 font-manrope ${amountTooHigh ? 'text-red-600' : 'text-gray-400'}`}>
                  {modal.type === 'withdraw'
                    ? `Max ${maxAmount} ${modalReagent.unit} available`
                    : Number.isFinite(maxAmount) ? `Room for ${maxAmount} ${modalReagent.unit} (max stock ${modalReagent.maxStock})` : 'No maximum set for this reagent'}
                </p>
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
                disabled={amount <= 0 || amountTooHigh}
                className={`w-full py-3 rounded-xl font-semibold text-sm font-manrope text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  modal.type === 'withdraw' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-500 hover:bg-emerald-600'
                }`}
              >
                {modal.type === 'withdraw' ? `Withdraw ${amount || ''}` : `Add ${amount || ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prepare working solution */}
      {prep && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-gray-900 font-manrope flex items-center gap-2"><FlaskConical size={18} className="text-[#102C53]" /> Prepare working solution</h2>
              <button onClick={() => setPrep(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <p className="text-xs text-gray-500 font-manrope mb-5">Takes from the stock and tops up the working solution in one movement, with a single log line.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">From stock</label>
                <select
                  value={prep.stockId}
                  onChange={e => setPrep({ ...prep, stockId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                >
                  <option value="">— choose a stock —</option>
                  {stocks.map(s => <option key={s.id} value={s.id} disabled={!canAccessStock(user, s)}>{s.name} ({s.currentStock} {s.unit}){canAccessStock(user, s) ? '' : ' — responsibles only'}</option>)}
                </select>
                {prepStock && (
                  <p className="text-[11px] mt-1 text-gray-400 font-manrope">
                    {prepStock.currentStock} {prepStock.unit} available · {reagentPlaceLabel(prepStock, storageUnits, storageBoxes)}
                    {responsibleNames(prepStock).length ? ` · responsible: ${responsibleNames(prepStock).join(', ')}` : ''}
                  </p>
                )}
                {prepStockLocked && <p className="text-[11px] mt-1 text-red-600 font-manrope">You are not among the responsibles of this stock.</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Amount taken from stock{prepStock ? ` (${prepStock.unit})` : ''}</label>
                <input
                  type="number" min={0} step="any"
                  value={prepTakenStr}
                  onChange={e => setPrepTakenStr(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none ${prepTakenTooHigh ? 'border-red-300' : 'border-gray-200'}`}
                />
                {prepTakenTooHigh && <p className="text-[11px] mt-1 text-red-600 font-manrope">Only {prepStock?.currentStock} {prepStock?.unit} in stock</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Working solution</label>
                <select
                  value={prep.workingId}
                  onChange={e => setPrep({ ...prep, workingId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                >
                  <option value="">— choose a working solution —</option>
                  {(() => {
                    const linked = workings.filter(w => prep.stockId && w.derivedFromId === prep.stockId);
                    const others = workings.filter(w => !linked.includes(w));
                    return <>
                      {linked.length > 0 && <optgroup label="Made from this stock">{linked.map(w => <option key={w.id} value={w.id}>{w.name} ({w.currentStock} {w.unit})</option>)}</optgroup>}
                      <optgroup label={linked.length ? 'Other working solutions' : 'Working solutions'}>{others.map(w => <option key={w.id} value={w.id}>{w.name} ({w.currentStock} {w.unit})</option>)}</optgroup>
                    </>;
                  })()}
                </select>
                {prepWorking && (
                  <p className="text-[11px] mt-1 text-gray-400 font-manrope">
                    Now {prepWorking.currentStock}{prepWorking.maxStock > 0 ? ` / ${prepWorking.maxStock}` : ''} {prepWorking.unit} · {reagentPlaceLabel(prepWorking, storageUnits, storageBoxes)}
                    {prepStock && prepWorking.derivedFromId && prepWorking.derivedFromId !== prepStock.id ? ' · usually made from another stock' : ''}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Amount produced{prepWorking ? ` (${prepWorking.unit})` : ''}</label>
                <input
                  type="number" min={0} step="any"
                  value={prepMadeStr}
                  onChange={e => setPrepMadeStr(e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none ${prepMadeTooHigh ? 'border-red-300' : 'border-gray-200'}`}
                />
                {prepMadeTooHigh && <p className="text-[11px] mt-1 text-red-600 font-manrope">Exceeds the maximum stock of {prepWorking?.maxStock} {prepWorking?.unit}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Notes (optional)</label>
                <input
                  value={prepNotes}
                  onChange={e => setPrepNotes(e.target.value)}
                  placeholder="e.g., 10 µg/mL in PBS, 20 aliquots of 50 µL"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                />
              </div>

              <button
                onClick={handlePrepare}
                disabled={!prepOk}
                className="w-full py-3 rounded-xl font-semibold text-sm font-manrope text-white bg-[#102C53] hover:bg-[#0c2140] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {prepStock && prepWorking ? `−${prepTaken || ''} ${prepStock.unit} stock → +${prepMade || ''} ${prepWorking.unit} working solution` : 'Prepare'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KindBadge({ kind }: { kind?: ReagentKind }) {
  if (!kind || kind === 'item') return null;
  return kind === 'stock'
    ? <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-px rounded bg-[#102C53] text-white text-[9px] font-semibold tracking-wide font-manrope" title="Stock — reserved to its responsibles"><Lock size={8} /> STOCK</span>
    : <span className="shrink-0 px-1.5 py-px rounded bg-[#4DC9FF]/20 text-[#102C53] text-[9px] font-semibold tracking-wide font-manrope" title="Working solution">WS</span>;
}

// ============================================================
// By unit: shelves top → bottom, boxes and loose items on each
// ============================================================
function UnitShelvesView({ reagents, storageUnits, storageBoxes, selectedUnitId, onSelectUnit, search, onSearch, canWithdraw, canAdd, canTake, onWithdraw, onAdd }: {
  reagents: Reagent[];
  storageUnits: StorageUnit[];
  storageBoxes: ReturnType<typeof boxesOfUnit>;
  selectedUnitId: string;
  onSelectUnit: (id: string) => void;
  search: string;
  onSearch: (s: string) => void;
  canWithdraw: boolean;
  canAdd: boolean;
  canTake: (r: Reagent) => boolean;
  onWithdraw: (id: string) => void;
  onAdd: (id: string) => void;
}) {
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    reagents.forEach(r => { if (r.storageUnitId) m.set(r.storageUnitId, (m.get(r.storageUnitId) || 0) + 1); });
    return m;
  }, [reagents]);
  const units = useMemo(() => storageUnits.filter(u => (counts.get(u.id) || 0) > 0 || boxesOfUnit(storageBoxes, u.id).length > 0), [storageUnits, counts, storageBoxes]);
  const unit = units.find(u => u.id === selectedUnitId) || units[0];
  const unassigned = reagents.filter(r => !r.storageUnitId);

  const items = useMemo(() => {
    if (!unit) return [];
    const q = search.toLowerCase();
    return reagents.filter(r => r.storageUnitId === unit.id && (!q || r.name.toLowerCase().includes(q) || r.catalogNumber.toLowerCase().includes(q)));
  }, [reagents, unit, search]);

  const shelfCount = unit && isShelfBased(unit.type) ? (unit.numShelves || 0) : 0;
  const boxes = unit ? boxesOfUnit(storageBoxes, unit.id) : [];
  const maxShelfUsed = Math.max(0, ...items.map(r => reagentShelf(r, storageBoxes) || 0), ...boxes.map(b => b.shelf || 0));
  const shelves = Array.from({ length: Math.max(shelfCount, maxShelfUsed) }, (_, i) => i + 1);
  const twoDoors = !!unit && isShelfBased(unit.type) && (unit.numDoors || 1) > 1;
  const onShelf = (n: number | undefined, door?: DoorSide | null) =>
    items.filter(r => reagentShelf(r, storageBoxes) === n && (door === undefined || (reagentDoor(r, storageBoxes) ?? null) === door));
  const boxesOnShelf = (n: number | undefined, door?: DoorSide | null) =>
    boxes.filter(b => (b.shelf ?? undefined) === n && (door === undefined || (b.door ?? null) === door));

  const Row = ({ r }: { r: Reagent }) => {
    const low = r.currentStock <= r.alertThreshold;
    return (
      <div className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0 text-xs font-manrope">
        <span className={`flex-1 min-w-0 truncate flex items-center gap-1 ${low ? 'text-red-600' : 'text-gray-800'}`} title={r.name}><KindBadge kind={r.kind} /><span className="truncate">{r.name}</span></span>
        <span className="text-gray-400 shrink-0 tabular-nums">{r.currentStock}{r.maxStock > 0 && <span className="text-gray-300">/{r.maxStock}</span>} {r.unit}</span>
        {low && <AlertTriangle size={12} className="text-amber-500 shrink-0" />}
        {canWithdraw && (canTake(r)
          ? <button onClick={() => onWithdraw(r.id)} className="p-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100" title="Withdraw"><Minus size={11} /></button>
          : <span className="p-1 rounded bg-gray-50 text-gray-400 cursor-not-allowed" title="Stock reserved to its responsibles"><Lock size={11} /></span>)}
        {canAdd && <button onClick={() => onAdd(r.id)} className="p-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100" title="Restock"><Plus size={11} /></button>}
      </div>
    );
  };

  const Group = ({ title, list, boxesHere }: { title: string; list: Reagent[]; boxesHere: typeof boxes }) => {
    const loose = list.filter(r => !r.boxId || !boxesHere.some(b => b.id === r.boxId));
    if (list.length === 0 && boxesHere.length === 0) {
      return (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 px-4 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 font-manrope">{title}</span>
          <span className="text-[10px] text-gray-300 font-manrope">empty</span>
        </div>
      );
    }
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700 font-manrope">{title}</span>
          <span className="text-[10px] text-gray-400 font-manrope">{list.length} item{list.length === 1 ? '' : 's'}{boxesHere.length ? ` · ${boxesHere.length} box${boxesHere.length === 1 ? '' : 'es'}` : ''}</span>
        </div>
        {boxesHere.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2">
            {boxesHere.map(b => {
              const inBox = list.filter(r => r.boxId === b.id);
              return (
                <div key={b.id} className="rounded-lg border border-gray-200 bg-gray-50/60 p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-gray-700 font-manrope">📦 {b.label}</span>
                    <span className="text-[10px] text-gray-400 font-manrope">{inBox.length}</span>
                  </div>
                  {inBox.length === 0
                    ? <p className="text-[10px] text-gray-300 font-manrope">nothing linked yet</p>
                    : inBox.map(r => <Row key={r.id} r={r} />)}
                </div>
              );
            })}
          </div>
        )}
        {loose.length > 0 && (
          <div>
            {boxesHere.length > 0 && <p className="text-[10px] text-gray-400 font-manrope mb-1">Loose on the shelf</p>}
            {loose.map(r => <Row key={r.id} r={r} />)}
          </div>
        )}
      </div>
    );
  };

  if (units.length === 0) {
    return <div className="text-center py-12 text-gray-400 font-manrope text-sm">No reagent is linked to a storage unit yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {units.map(u => (
          <button key={u.id} onClick={() => onSelectUnit(u.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-manrope whitespace-nowrap transition-all ${unit?.id === u.id ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {storageUnitTypes[u.type]?.icon} {u.name} <span className="opacity-60">{counts.get(u.id) || 0}</span>
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input value={search} onChange={e => onSearch(e.target.value)} placeholder={`Search in ${unit?.name || 'this unit'}…`}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none" />
      </div>

      {unit && (
        <p className="text-[11px] text-gray-400 font-manrope">
          {unit.temperature}{unit.location ? ` · ${unit.location}` : ''}
          {shelfCount > 0 ? ` · ${shelfCount} shelves, 1 = top` : isShelfBased(unit.type) ? ' · shelf count not set (Admin → Storage)' : ''}
          {twoDoors ? ' · double door' : ''}
        </p>
      )}

      {twoDoors && (
        <div className="grid grid-cols-2 gap-3 text-center text-[10px] font-semibold text-gray-400 font-manrope uppercase tracking-wide">
          <span>{doorSideLabel.left} door</span><span>{doorSideLabel.right} door</span>
        </div>
      )}
      {shelves.map(n => twoDoors ? (
        <div key={n} className="space-y-1">
          <div className="grid grid-cols-2 gap-3">
            <Group title={`Shelf ${n} · ${doorSideLabel.left}`} list={onShelf(n, 'left')} boxesHere={boxesOnShelf(n, 'left')} />
            <Group title={`Shelf ${n} · ${doorSideLabel.right}`} list={onShelf(n, 'right')} boxesHere={boxesOnShelf(n, 'right')} />
          </div>
          {(onShelf(n, null).length > 0 || boxesOnShelf(n, null).length > 0) && (
            <Group title={`Shelf ${n} · door not specified`} list={onShelf(n, null)} boxesHere={boxesOnShelf(n, null)} />
          )}
        </div>
      ) : (
        <Group key={n} title={`Shelf ${n}`} list={onShelf(n)} boxesHere={boxesOnShelf(n)} />
      ))}
      {(onShelf(undefined).length > 0 || boxesOnShelf(undefined).length > 0) && (
        <Group title={shelves.length ? 'No shelf specified' : 'Contents'} list={onShelf(undefined)} boxesHere={boxesOnShelf(undefined)} />
      )}

      {unassigned.length > 0 && (
        <p className="text-[11px] text-gray-400 font-manrope text-center pt-2">{unassigned.length} item{unassigned.length === 1 ? '' : 's'} not linked to any storage unit (shown in the Items view).</p>
      )}
    </div>
  );
}
