'use client';

import { useState } from 'react';
import { Plus, X, Trash2, Info } from 'lucide-react';
import { useLabContext } from './LabContext';
import { formatDate, getRowLabels } from '@/data/lab-data';

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
  const { user, permissions, cryoVials, addCryoVial, removeCryoVial, dewars } = useLabContext();
  const [selectedDewarId, setSelectedDewarId] = useState(dewars[0]?.id || 'dewar-1');
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

  // Get current dewar config
  const dewar = dewars.find(d => d.id === selectedDewarId) || { id: selectedDewarId, name: selectedDewarId, model: '', location: '', numRacks: 6, boxesPerRack: 5, gridRows: 5, gridCols: 5 };
  const RACKS = Array.from({ length: dewar.numRacks }, (_, i) => i + 1);
  const totalBoxes = dewar.boxesPerRack;
  const ROWS = getRowLabels(dewar.gridRows);
  const COLS = Array.from({ length: dewar.gridCols }, (_, i) => i + 1);
  const slotsPerBox = dewar.gridRows * dewar.gridCols;

  const boxVials = cryoVials.filter(v => v.dewarId === selectedDewarId && v.rack === selectedRack && v.box === selectedBox);
  const selectedVialData = selectedVial ? cryoVials.find(v => v.id === selectedVial) : null;

  const getVialAt = (row: number, col: number) => {
    return boxVials.find(v => v.row === row && v.col === col);
  };

  const handleAddVial = () => {
    if (!addPosition || !newCellLine) return;
    addCryoVial({
      cellLine: newCellLine,
      passage: newPassage,
      date: new Date().toISOString().split('T')[0],
      userId: user.id,
      userName: user.name,
      dewarId: selectedDewarId,
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

  const vialsInRack = (rack: number) => cryoVials.filter(v => v.dewarId === selectedDewarId && v.rack === rack).length;

  // Cell line legend
  const usedCellLines = Array.from(new Set(cryoVials.map(v => v.cellLine)));

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-4">
      <h1 className="text-lg font-bold text-gray-900 font-manrope">Cryo Storage</h1>

      {/* Dewar Selection */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {dewars.map(dw => {
          const tankVials = cryoVials.filter(v => v.dewarId === dw.id).length;
          return (
            <button
              key={dw.id}
              onClick={() => { setSelectedDewarId(dw.id); setSelectedRack(1); setSelectedBox(1); setSelectedVial(null); }}
              className={`flex-1 min-w-[140px] p-4 rounded-xl border-2 transition-all ${
                selectedDewarId === dw.id ? 'border-[#102C53] bg-[#102C53]/5' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl mb-1">🧊</div>
                <p className="text-sm font-semibold text-gray-900 font-manrope">{dw.name}</p>
                <p className="text-[10px] text-gray-400 font-manrope">{dw.model}</p>
                <p className="text-xs text-gray-500 font-manrope">{tankVials} vials · {dw.gridRows}×{dw.gridCols} grid</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Rack Overview */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 font-manrope mb-3">{dewar.name} &mdash; Racks</h2>
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
              const boxCount = cryoVials.filter(v => v.dewarId === selectedDewarId && v.rack === selectedRack && v.box === box).length;
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
            <div className="grid bg-gray-50" style={{ gridTemplateColumns: `auto repeat(${dewar.gridCols}, 1fr)` }}>
              <div className="p-1" />
              {COLS.map(col => (
                <div key={col} className="p-1 text-center text-[9px] font-bold text-gray-500 font-manrope">{col}</div>
              ))}
            </div>

            {/* Rows */}
            {ROWS.map((rowLabel, rowIdx) => (
              <div key={rowLabel} className="grid border-t border-gray-100" style={{ gridTemplateColumns: `auto repeat(${dewar.gridCols}, 1fr)` }}>
                <div className="p-1 flex items-center justify-center text-[9px] font-bold text-gray-500 font-manrope bg-gray-50 min-w-[20px]">{rowLabel}</div>
                {COLS.map((_, colIdx) => {
                  const vial = getVialAt(rowIdx, colIdx);
                  const isSelected = selectedVial === vial?.id;
                  // Adjust cell size based on grid size
                  const isLarge = dewar.gridCols > 6;
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
                  <span className="text-gray-500">Dewar</span>
                  <span className="text-gray-900 font-medium">{dewars.find(d => d.id === selectedVialData.dewarId)?.name || selectedVialData.dewarId}</span>
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
                  onClick={() => { removeCryoVial(selectedVialData.id); setSelectedVial(null); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-medium font-manrope hover:bg-red-100 transition-colors mt-4"
                >
                  <Trash2 size={14} /> Withdraw Vial
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400 font-manrope text-sm">
              <div className="text-3xl mb-2">❄️</div>
              Select a vial to see details
            </div>
          )}
        </div>
      </div>

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
                {dewar.name} R{selectedRack} B{selectedBox} {ROWS[addPosition.row]}{addPosition.col + 1}
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
    </div>
  );
}
