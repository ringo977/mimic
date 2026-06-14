'use client';

import { useState, useMemo } from 'react';
import { Plus, X, Trash2, Info, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { useLabContext } from './LabContext';
import { useConfirm } from './ConfirmDialog';
import { formatDate, getRowLabels, storageUnitTypes } from '@/data/lab-data';

// Distinct colors for cell lines
const cellLineColors: Record<string, string> = {
  'iPSC-CMs (CDI)': 'bg-red-400',
  'HUVECs': 'bg-blue-400',
  'MCF-7': 'bg-purple-400',
  'A549': 'bg-amber-400',
  'hiPSCs (WTC-11)': 'bg-green-400',
  'hMSCs': 'bg-cyan-400',
};

function getCellLineColor(cellLine: string): string {
  if (cellLineColors[cellLine]) return cellLineColors[cellLine];
  const hash = cellLine.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const colors = ['bg-pink-400', 'bg-indigo-400', 'bg-teal-400', 'bg-orange-400', 'bg-lime-400', 'bg-rose-400'];
  return colors[hash % colors.length];
}

export default function CryoPage() {
  const { user, permissions, cryoVials, addCryoVial, removeCryoVial, storageUnits } = useLabContext();
  const [ConfirmDialog, confirmDelete] = useConfirm();

  // Only show grid-capable storage units for cryo
  const gridUnits = storageUnits.filter(s => s.numRacks && s.boxesPerRack && s.gridRows && s.gridCols);

  const [selectedUnitId, setSelectedUnitId] = useState(gridUnits[0]?.id || '');
  const [selectedRack, setSelectedRack] = useState(1);
  const [selectedBox, setSelectedBox] = useState(1);
  const [selectedVial, setSelectedVial] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addPosition, setAddPosition] = useState<{ row: number; col: number } | null>(null);

  // Form state
  const [newCellLine, setNewCellLine] = useState('');
  const [newPassageStr, setNewPassageStr] = useState('0');
  const newPassage = newPassageStr === '' ? 0 : Number(newPassageStr);
  const [newNotes, setNewNotes] = useState('');

  // Get current unit config
  const unit = gridUnits.find(s => s.id === selectedUnitId) || gridUnits[0];
  const numRacks = unit?.numRacks || 6;
  const boxesPerRack = unit?.boxesPerRack || 5;
  const gridRows = unit?.gridRows || 5;
  const gridCols = unit?.gridCols || 5;

  const RACKS = Array.from({ length: numRacks }, (_, i) => i + 1);
  const totalBoxes = boxesPerRack;
  const ROWS = getRowLabels(gridRows);
  const COLS = Array.from({ length: gridCols }, (_, i) => i + 1);
  const slotsPerBox = gridRows * gridCols;

  const boxVials = cryoVials.filter(v => v.storageUnitId === selectedUnitId && v.rack === selectedRack && v.box === selectedBox);
  const selectedVialData = selectedVial ? cryoVials.find(v => v.id === selectedVial) : null;

  const getVialAt = (row: number, col: number) => {
    return boxVials.find(v => v.row === row && v.col === col);
  };

  const handleAddVial = () => {
    if (!addPosition || !newCellLine || !selectedUnitId) return;
    addCryoVial({
      cellLine: newCellLine,
      passage: newPassage,
      date: new Date().toISOString().split('T')[0],
      userId: user.id,
      userName: user.name,
      storageUnitId: selectedUnitId,
      rack: selectedRack,
      box: selectedBox,
      row: addPosition.row,
      col: addPosition.col,
      notes: newNotes,
    });
    setShowAddModal(false);
    setNewCellLine('');
    setNewPassageStr('0');
    setNewNotes('');
  };

  const vialsInRack = (rack: number) => cryoVials.filter(v => v.storageUnitId === selectedUnitId && v.rack === rack).length;

  // Cell line legend
  const usedCellLines = Array.from(new Set(cryoVials.map(v => v.cellLine)));

  if (gridUnits.length === 0) {
    return (
      <div className="p-4 lg:p-8 max-w-6xl mx-auto">
        <h1 className="text-lg font-bold text-gray-900 font-manrope mb-4">Cryo Storage</h1>
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center text-gray-400 font-manrope">
          <div className="text-4xl mb-3">🧊</div>
          <p className="text-sm">No grid-capable storage units configured.</p>
          <p className="text-xs mt-1">Ask an admin to add a storage unit with rack/box/grid configuration.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-4">
      <h1 className="text-lg font-bold text-gray-900 font-manrope">Cryo Storage</h1>

      {/* Storage Unit Selection */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {gridUnits.map(su => {
          const info = storageUnitTypes[su.type] || { icon: '📦', label: su.type };
          const unitVials = cryoVials.filter(v => v.storageUnitId === su.id).length;
          return (
            <button
              key={su.id}
              onClick={() => { setSelectedUnitId(su.id); setSelectedRack(1); setSelectedBox(1); setSelectedVial(null); }}
              className={`flex-1 min-w-[140px] p-4 rounded-xl border-2 transition-all ${
                selectedUnitId === su.id ? 'border-[#102C53] bg-[#102C53]/5' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl mb-1">{info.icon}</div>
                <p className="text-sm font-semibold text-gray-900 font-manrope">{su.name}</p>
                <p className="text-[10px] text-gray-400 font-manrope">{info.label} &middot; {su.temperature}</p>
                <p className="text-xs text-gray-500 font-manrope">{unitVials} vials &middot; {su.gridRows}&times;{su.gridCols} grid</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Rack Overview */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 font-manrope mb-3">{unit?.name || 'Unit'} &mdash; Racks</h2>
          <div className="grid grid-cols-3 gap-2">
            {RACKS.map(rack => {
              const count = vialsInRack(rack);
              const isSelected = selectedRack === rack;
              return (
                <button
                  key={rack}
                  onClick={() => { setSelectedRack(rack); setSelectedBox(1); setSelectedVial(null); }}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    isSelected ? 'border-[#102C53] bg-[#102C53]/5' : 'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <p className="text-xs font-bold text-gray-900 font-manrope">Rack {rack}</p>
                  <p className="text-[10px] text-gray-400 font-manrope">{count} vials</p>
                  <div className="w-full h-1 bg-gray-100 rounded-full mt-1.5">
                    <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.min(100, (count / (totalBoxes * slotsPerBox)) * 100)}%` }} />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Box selection */}
          <h3 className="text-xs font-semibold text-gray-700 font-manrope mt-4 mb-2">Rack {selectedRack} &mdash; Boxes</h3>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: totalBoxes }, (_, i) => i + 1).map(box => {
              const boxCount = cryoVials.filter(v => v.storageUnitId === selectedUnitId && v.rack === selectedRack && v.box === box).length;
              const isSelected = selectedBox === box;
              return (
                <button
                  key={box}
                  onClick={() => { setSelectedBox(box); setSelectedVial(null); }}
                  className={`flex-1 min-w-[40px] p-2 rounded-lg border-2 text-center transition-all ${
                    isSelected ? 'border-cyan-500 bg-cyan-50' : 'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <p className="text-xs font-bold font-manrope">{box}</p>
                  <p className="text-[9px] text-gray-400">{boxCount}/{slotsPerBox}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Box Grid (dynamic size) */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 font-manrope">
              Box {selectedBox} <span className="text-gray-400 font-normal">({boxVials.length}/{slotsPerBox})</span>
            </h2>
          </div>

          {/* Grid */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Column headers */}
            <div className="grid bg-gray-50" style={{ gridTemplateColumns: `auto repeat(${gridCols}, 1fr)` }}>
              <div className="p-1" />
              {COLS.map(col => (
                <div key={col} className="p-1 text-center text-[9px] font-bold text-gray-500 font-manrope">{col}</div>
              ))}
            </div>

            {/* Rows */}
            {ROWS.map((rowLabel, rowIdx) => (
              <div key={rowLabel} className="grid border-t border-gray-100" style={{ gridTemplateColumns: `auto repeat(${gridCols}, 1fr)` }}>
                <div className="p-1 flex items-center justify-center text-[9px] font-bold text-gray-500 font-manrope bg-gray-50 min-w-[20px]">{rowLabel}</div>
                {COLS.map((_, colIdx) => {
                  const vial = getVialAt(rowIdx, colIdx);
                  const isSelected = selectedVial === vial?.id;
                  const isLarge = gridCols > 6;
                  return (
                    <div key={colIdx} className={`p-0.5 aspect-square flex items-center justify-center ${isLarge ? 'min-w-[20px]' : ''}`}>
                      {vial ? (
                        <button
                          onClick={() => setSelectedVial(isSelected ? null : vial.id)}
                          className={`w-full h-full rounded-full flex items-center justify-center text-white font-bold transition-all
                            ${getCellLineColor(vial.cellLine)}
                            ${isSelected ? 'ring-2 ring-offset-1 ring-[#102C53] scale-110' : 'hover:scale-105'}
                          `}
                          style={{ fontSize: isLarge ? '6px' : '8px' }}
                          title={`${vial.cellLine} P${vial.passage}`}
                        >
                          P{vial.passage}
                        </button>
                      ) : (
                        permissions.canManageCryo ? (
                          <button
                            onClick={() => { setAddPosition({ row: rowIdx, col: colIdx }); setShowAddModal(true); }}
                            className="w-full h-full rounded-full border-2 border-dashed border-gray-200 hover:border-cyan-400 hover:bg-cyan-50 flex items-center justify-center text-gray-300 hover:text-cyan-500 transition-all"
                          >
                            <Plus size={isLarge ? 6 : 10} />
                          </button>
                        ) : (
                          <div className="w-full h-full rounded-full border-2 border-dashed border-gray-100" />
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Cell Line Legend */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {usedCellLines.map(cl => (
              <span key={cl} className="inline-flex items-center gap-1 text-[9px] font-manrope text-gray-600">
                <span className={`w-2 h-2 rounded-full ${getCellLineColor(cl)}`} />
                {cl}
              </span>
            ))}
          </div>
        </div>

        {/* Vial Detail */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 font-manrope mb-3 flex items-center gap-2">
            <Info size={14} />
            Vial Details
          </h2>

          {selectedVialData ? (
            <div className="space-y-3">
              <div className="bg-cyan-50 rounded-xl p-4 text-center">
                <div className={`w-12 h-12 rounded-full ${getCellLineColor(selectedVialData.cellLine)} mx-auto flex items-center justify-center text-white text-sm font-bold mb-2`}>
                  P{selectedVialData.passage}
                </div>
                <p className="text-sm font-bold text-gray-900 font-manrope">{selectedVialData.cellLine}</p>
                <p className="text-xs text-gray-500 font-manrope">Passage {selectedVialData.passage}</p>
              </div>

              <div className="space-y-2 text-xs font-manrope">
                <div className="flex justify-between">
                  <span className="text-gray-500">Storage</span>
                  <span className="text-gray-900 font-medium">
                    {(() => { const su = storageUnits.find(s => s.id === selectedVialData.storageUnitId); return su ? `${storageUnitTypes[su.type]?.icon || ''} ${su.name}` : selectedVialData.storageUnitId; })()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Position</span>
                  <span className="text-gray-900 font-medium">R{selectedVialData.rack} B{selectedVialData.box} {ROWS[selectedVialData.row]}{selectedVialData.col + 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Stored</span>
                  <span className="text-gray-900">{formatDate(selectedVialData.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">By</span>
                  <span className="text-gray-900">{selectedVialData.userName}</span>
                </div>
                {selectedVialData.notes && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Notes</span>
                    <span className="text-gray-900 text-right">{selectedVialData.notes}</span>
                  </div>
                )}
              </div>

              {permissions.canManageCryo && (
                <button
                  onClick={() => confirmDelete('Withdraw Vial?', `${selectedVialData.cellLine} P${selectedVialData.passage} will be removed from storage.`, () => { removeCryoVial(selectedVialData.id); setSelectedVial(null); })}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-medium font-manrope hover:bg-red-100 transition-colors mt-4"
                >
                  <Trash2 size={14} /> Withdraw Vial
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 font-manrope text-sm">
              <div className="text-3xl mb-2">&#10052;&#65039;</div>
              Select a vial to see details
            </div>
          )}
        </div>
      </div>

      {/* ============ Full Vial Inventory with Search ============ */}
      <VialInventory />

      {/* Add Vial Modal */}
      {showAddModal && addPosition && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 font-manrope">Store New Vial</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div className="bg-cyan-50 rounded-xl p-3 text-sm font-manrope">
                <span className="font-semibold">Position: </span>
                {unit?.name || 'Unit'} R{selectedRack} B{selectedBox} {ROWS[addPosition.row]}{addPosition.col + 1}
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Cell Line</label>
                <input
                  value={newCellLine}
                  onChange={e => setNewCellLine(e.target.value)}
                  placeholder="e.g., HUVECs, iPSC-CMs, hiPSCs"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                  list="celllines"
                />
                <datalist id="celllines">
                  {usedCellLines.map(cl => <option key={cl} value={cl} />)}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Passage Number</label>
                <input
                  type="number"
                  min={0}
                  value={newPassageStr}
                  onChange={e => setNewPassageStr(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Notes</label>
                <input
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="e.g., Batch #, Lot #, conditions"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                />
              </div>

              <button
                onClick={handleAddVial}
                disabled={!newCellLine}
                className="w-full py-3 bg-cyan-500 text-white rounded-xl font-semibold text-sm font-manrope hover:bg-cyan-600 transition-colors disabled:opacity-40"
              >
                Store Vial
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}

// ============================================================
// Full Vial Inventory — searchable, sortable table
// ============================================================
type VialSortKey = 'cellLine' | 'passage' | 'storage' | 'position' | 'userName' | 'date';

function VialInventory() {
  const { cryoVials, removeCryoVial, storageUnits, permissions } = useLabContext();
  const [ConfirmDialog, confirmDelete] = useConfirm();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<VialSortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (key: VialSortKey) => {
    if (sortKey === key) { setSortAsc(!sortAsc); } else { setSortKey(key); setSortAsc(true); }
  };

  const getUnitName = (id: string) => { const u = storageUnits.find(s => s.id === id); return u ? `${storageUnitTypes[u.type]?.icon || ''} ${u.name}` : id; };
  const getPositionStr = (v: typeof cryoVials[0]) => {
    const su = storageUnits.find(s => s.id === v.storageUnitId);
    const rows = su?.gridRows ? getRowLabels(su.gridRows) : getRowLabels(5);
    return `R${v.rack} B${v.box} ${rows[v.row] || '?'}${v.col + 1}`;
  };

  const filtered = useMemo(() => {
    let list = [...cryoVials];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.cellLine.toLowerCase().includes(q) ||
        v.userName.toLowerCase().includes(q) ||
        v.notes.toLowerCase().includes(q) ||
        getUnitName(v.storageUnitId).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'cellLine': cmp = a.cellLine.localeCompare(b.cellLine); break;
        case 'passage': cmp = a.passage - b.passage; break;
        case 'storage': cmp = getUnitName(a.storageUnitId).localeCompare(getUnitName(b.storageUnitId)); break;
        case 'position': cmp = getPositionStr(a).localeCompare(getPositionStr(b)); break;
        case 'userName': cmp = a.userName.localeCompare(b.userName); break;
        case 'date': cmp = a.date.localeCompare(b.date); break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cryoVials, search, sortKey, sortAsc]);

  const orphanVials = useMemo(() => cryoVials.filter(v => !storageUnits.some(s => s.id === v.storageUnitId)), [cryoVials, storageUnits]);

  const SortHeader = ({ label, k }: { label: string; k: VialSortKey }) => (
    <th className="px-3 py-2.5 text-left font-semibold text-gray-700 cursor-pointer select-none hover:text-gray-900 group" onClick={() => toggleSort(k)}>
      <span className="inline-flex items-center gap-0.5">{label}
        {sortKey === k ? (sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />) : <ChevronDown size={10} className="opacity-0 group-hover:opacity-30" />}
      </span>
    </th>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-3">
        <h2 className="text-sm font-semibold text-gray-900 font-manrope whitespace-nowrap">All Vials ({cryoVials.length})</h2>
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search cell line, user, notes..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
        </div>
        {search && <p className="text-[11px] text-gray-400 font-manrope">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>}
      </div>
      {orphanVials.length > 0 && permissions.canManageCryo && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-3">
          <p className="text-xs text-amber-800 font-manrope">
            {orphanVials.length} orphaned vial{orphanVials.length > 1 ? 's' : ''} reference a storage unit that no longer exists.
          </p>
          <button
            onClick={() => confirmDelete('Remove orphaned vials?', `${orphanVials.length} vial${orphanVials.length > 1 ? 's' : ''} whose storage unit was deleted will be permanently removed. This cannot be undone.`, () => orphanVials.forEach(v => removeCryoVial(v.id)))}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold font-manrope bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            Clean up
          </button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-manrope">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            <SortHeader label="Cell Line" k="cellLine" />
            <SortHeader label="P" k="passage" />
            <SortHeader label="Storage" k="storage" />
            <SortHeader label="Position" k="position" />
            <SortHeader label="Stored By" k="userName" />
            <SortHeader label="Date" k="date" />
            <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Notes</th>
            {permissions.canManageCryo && <th className="px-3 py-2.5 text-right font-semibold text-gray-700"></th>}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">
                  <span className="inline-flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${getCellLineColor(v.cellLine)}`} />
                    {v.cellLine}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-600">P{v.passage}</td>
                <td className="px-3 py-2 text-gray-500">{getUnitName(v.storageUnitId)}</td>
                <td className="px-3 py-2 text-gray-600 font-mono">{getPositionStr(v)}</td>
                <td className="px-3 py-2 text-gray-500">{v.userName}</td>
                <td className="px-3 py-2 text-gray-500">{v.date}</td>
                <td className="px-3 py-2 text-gray-500 max-w-[150px] truncate">{v.notes || '—'}</td>
                {permissions.canManageCryo && (
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => confirmDelete('Withdraw Vial?', `${v.cellLine} P${v.passage} will be removed from storage.`, () => removeCryoVial(v.id))} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">No vials found</td></tr>}
          </tbody>
        </table>
      </div>
      <ConfirmDialog />
    </div>
  );
}
