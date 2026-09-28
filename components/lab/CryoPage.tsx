'use client';

import { useState, useMemo } from 'react';
import { Plus, X, Trash2, Info, Search, ChevronUp, ChevronDown, CheckSquare, Boxes } from 'lucide-react';
import { useLabContext } from './LabContext';
import { useConfirm } from './ConfirmDialog';
import { todayStr, formatDate, getRowLabels, storageUnitTypes, boxesOfUnit, boxCapacity, isCryoBox, boxPositionLabel, parseCells, formatCells, StorageBox, cellLineColor, matchCellType } from '@/data/lab-data';

export default function CryoPage() {
  const { user, permissions, cryoVials, addCryoVials, removeCryoVial, storageUnits, storageBoxes: allBoxes, cellTypes } = useLabContext();
  const [ConfirmDialog, confirmDelete] = useConfirm();
  // Vial colour = colour of the cell type matching its cell line (Admin → Cryo → Cell types); grey if none.
  const getCellLineColor = (cellLine: string) => cellLineColor(cellLine, cellTypes);

  // Only boxes with a vial grid belong here; 1×1 boxes are reagent
  // containers ("Supplements Box") and live in the Reagents page.
  const storageBoxes = useMemo(() => allBoxes.filter(isCryoBox), [allBoxes]);

  // Units that hold cryoboxes — any type: a dewar with racks, a −80 freezer
  // with loose boxes on shelves, a fridge with a 9×9 box.
  const boxUnits = useMemo(
    () => storageUnits.filter(s => storageBoxes.some(b => b.storageUnitId === s.id)),
    [storageUnits, storageBoxes]);

  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedRack, setSelectedRack] = useState<number | undefined>(undefined);
  const [selectedBoxId, setSelectedBoxId] = useState('');
  const [selectedVial, setSelectedVial] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addPosition, setAddPosition] = useState<{ row: number; col: number } | null>(null);

  // "Where is it?" filter: highlights matching vials in the grid and lists
  // their positions across every unit, so a cell line can be located quickly.
  const [findLine, setFindLine] = useState('');
  const [findPassage, setFindPassage] = useState('');
  const [findUser, setFindUser] = useState('');
  const [findCells, setFindCells] = useState('');   // minimum cells per vial, "1M" / "500K"

  // Multi-slot selection: pick several empty positions, store them in one go
  const [multiMode, setMultiMode] = useState(false);
  const [multiSel, setMultiSel] = useState<Set<string>>(new Set());
  const slotKey = (row: number, col: number) => `${row}-${col}`;

  // "Find space": how many vials are about to be frozen
  const [spaceN, setSpaceN] = useState('');

  // Form state
  const [newCellLine, setNewCellLine] = useState('');
  const [newPassageStr, setNewPassageStr] = useState('');
  const newPassage = newPassageStr === '' ? NaN : Number(newPassageStr);   // required
  const [newCellsStr, setNewCellsStr] = useState('');
  const newCells = parseCells(newCellsStr);          // undefined = empty, null = unreadable
  const [newDate, setNewDate] = useState(todayStr());
  const [newNotes, setNewNotes] = useState('');

  const unit = boxUnits.find(s => s.id === selectedUnitId) || boxUnits[0];
  const unitBoxes = useMemo(() => unit ? boxesOfUnit(storageBoxes, unit.id) : [], [storageBoxes, unit]);
  const racks = useMemo(
    () => Array.from(new Set(unitBoxes.map(b => b.rack).filter((r): r is number => !!r))).sort((a, b) => a - b),
    [unitBoxes]);

  // Keep the selection valid when the unit (or the boxes) change
  const rack = racks.length ? (selectedRack && racks.includes(selectedRack) ? selectedRack : racks[0]) : undefined;
  const visibleBoxes = useMemo(
    () => rack ? unitBoxes.filter(b => b.rack === rack) : unitBoxes,
    [unitBoxes, rack]);
  const box = visibleBoxes.find(b => b.id === selectedBoxId) || visibleBoxes[0];

  const ROWS = getRowLabels(box?.gridRows || 1);
  const COLS = Array.from({ length: box?.gridCols || 1 }, (_, i) => i + 1);
  const slotsPerBox = box ? boxCapacity(box) : 0;

  const rackLabel = (r?: number) => (r ? unit?.rackLabels?.[r - 1] : undefined);

  /** Vials in a box: by box_id, with a fallback on the legacy rack/box coordinates */
  const vialsInBox = (b: { id: string; storageUnitId: string; rack?: number; number: number }) =>
    cryoVials.filter(v => v.boxId
      ? v.boxId === b.id
      : v.storageUnitId === b.storageUnitId && v.rack === (b.rack || 0) && v.box === b.number);

  const findMinCells = parseCells(findCells) || 0;
  const findActive = Boolean(findLine) || findPassage !== '' || Boolean(findUser) || findMinCells > 0;
  const isMatch = (v: typeof cryoVials[0]) => {
    if (!findActive) return false;
    if (findLine && !v.cellLine.toLowerCase().includes(findLine.toLowerCase())) return false;
    if (findPassage !== '' && v.passage !== Number(findPassage)) return false;
    if (findUser && !v.userName.toLowerCase().includes(findUser.toLowerCase())) return false;
    if (findMinCells > 0 && !(v.cells != null && v.cells >= findMinCells)) return false;
    return true;
  };
  const matches = useMemo(() => findActive ? cryoVials.filter(isMatch) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cryoVials, findLine, findPassage, findUser, findMinCells, findActive]);
  const clearFind = () => { setFindLine(''); setFindPassage(''); setFindUser(''); setFindCells(''); };

  const boxOf = (v: typeof cryoVials[0]) => storageBoxes.find(b => b.id === v.boxId);
  const jumpToVial = (v: typeof cryoVials[0]) => {
    const b = boxOf(v);
    setSelectedUnitId(v.storageUnitId);
    setSelectedRack(b?.rack ?? (v.rack || undefined));
    setSelectedBoxId(b?.id || '');
    setSelectedVial(v.id);
  };

  const boxVials = box ? vialsInBox(box) : [];
  const selectedVialData = selectedVial ? cryoVials.find(v => v.id === selectedVial) : null;

  const getVialAt = (row: number, col: number) => boxVials.find(v => v.row === row && v.col === col);

  /** Empty positions of a box, in reading order (A1, A2, …) */
  const freeSlotsOf = (b: StorageBox) => {
    const taken = new Set(vialsInBox(b).map(v => slotKey(v.row, v.col)));
    const out: { row: number; col: number }[] = [];
    for (let r = 0; r < b.gridRows; r++) for (let c = 0; c < b.gridCols; c++) {
      if (!taken.has(slotKey(r, c))) out.push({ row: r, col: c });
    }
    return out;
  };

  const toggleSlot = (row: number, col: number) => {
    const k = slotKey(row, col);
    setMultiSel(prev => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  };
  const selectNextFree = (n: number) => {
    if (!box) return;
    const free = freeSlotsOf(box).slice(0, Math.max(0, n));
    setMultiSel(new Set(free.map(p => slotKey(p.row, p.col))));
  };
  const leaveMulti = () => { setMultiMode(false); setMultiSel(new Set()); };

  // Positions the Store modal will fill: the clicked one, or the selection
  const targetPositions: { row: number; col: number }[] =
    multiMode && multiSel.size > 0
      ? Array.from(multiSel).map(k => { const [r, c] = k.split('-').map(Number); return { row: r, col: c }; })
          .sort((a, b) => a.row - b.row || a.col - b.col)
      : addPosition ? [addPosition] : [];

  const handleAddVial = () => {
    if (targetPositions.length === 0 || !newCellLine || !box || !newCells || !Number.isFinite(newPassage) || newPassage < 0) return;
    addCryoVials(targetPositions.map(pos => ({
      cellLine: newCellLine,
      passage: newPassage,
      date: newDate || todayStr(),
      userId: user.id,
      userName: user.name,
      storageUnitId: box.storageUnitId,
      boxId: box.id,
      // legacy coordinates, kept in sync so older views keep working
      rack: box.rack || 0,
      box: box.number,
      row: pos.row,
      col: pos.col,
      notes: newNotes,
      cells: newCells ?? undefined,
    })));
    setShowAddModal(false);
    setAddPosition(null);
    leaveMulti();
    setNewCellLine('');
    setNewPassageStr('0');
    setNewCellsStr('');
    setNewDate(todayStr());
    setNewNotes('');
  };

  // "Find space": every box with enough free slots, best fit first
  const spaceWanted = Math.max(0, Number(spaceN) || 0);
  const spaceOptions = useMemo(() => {
    if (spaceWanted <= 0) return [];
    return storageBoxes
      .map(b => ({ b, free: boxCapacity(b) - vialsInBox(b).length }))
      .filter(x => x.free >= spaceWanted)
      .sort((x, y) => x.free - y.free || x.b.storageUnitId.localeCompare(y.b.storageUnitId) || (x.b.rack || 0) - (y.b.rack || 0) || x.b.number - y.b.number);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageBoxes, cryoVials, spaceWanted]);
  const jumpToBoxForSpace = (b: StorageBox) => {
    setSelectedUnitId(b.storageUnitId);
    setSelectedRack(b.rack || undefined);
    setSelectedBoxId(b.id);
    setSelectedVial(null);
    if (permissions.canManageCryo) {
      setMultiMode(true);
      const free = freeSlotsOf(b).slice(0, spaceWanted);
      setMultiSel(new Set(free.map(p => slotKey(p.row, p.col))));
    }
  };

  const vialsInRack = (r: number) =>
    unitBoxes.filter(b => b.rack === r).reduce((n, b) => n + vialsInBox(b).length, 0);
  const rackCapacity = (r: number) =>
    unitBoxes.filter(b => b.rack === r).reduce((n, b) => n + boxCapacity(b), 0);

  // Cell line legend
  const usedCellLines = Array.from(new Set(cryoVials.map(v => v.cellLine)));

  if (boxUnits.length === 0) {
    return (
      <div className="p-4 lg:p-8 max-w-6xl mx-auto">
        <h1 className="text-lg font-bold text-gray-900 font-manrope mb-4">Cryo Storage</h1>
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center text-gray-400 font-manrope">
          <div className="text-4xl mb-3">🧊</div>
          <p className="text-sm">No storage unit has boxes yet.</p>
          <p className="text-xs mt-1">Ask an admin to add boxes to a unit (Admin → Storage → Boxes).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-4">
      <h1 className="text-lg font-bold text-gray-900 font-manrope">Cryo Storage</h1>

      {/* Storage Unit Selection */}
      <div className="flex gap-3 overflow-x-auto pb-1">
        {boxUnits.map(su => {
          const info = storageUnitTypes[su.type] || { icon: '📦', label: su.type };
          const unitVials = cryoVials.filter(v => v.storageUnitId === su.id).length;
          const nBoxes = storageBoxes.filter(b => b.storageUnitId === su.id).length;
          return (
            <button
              key={su.id}
              onClick={() => { setSelectedUnitId(su.id); setSelectedRack(undefined); setSelectedBoxId(''); setSelectedVial(null); setMultiSel(new Set()); }}
              className={`flex-1 min-w-[140px] p-4 rounded-xl border-2 transition-all ${
                selectedUnitId === su.id ? 'border-[#102C53] bg-[#102C53]/5' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-3xl mb-1">{info.icon}</div>
                <p className="text-sm font-semibold text-gray-900 font-manrope">{su.name}</p>
                <p className="text-[10px] text-gray-400 font-manrope">{info.label} &middot; {su.temperature}</p>
                <p className="text-xs text-gray-500 font-manrope">{unitVials} vials &middot; {nBoxes} box{nBoxes !== 1 ? 'es' : ''}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Find a cell line */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 font-manrope flex items-center gap-2"><Search size={14} /> Find vials</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={findLine}
            onChange={e => setFindLine(e.target.value)}
            placeholder="Cell line (e.g., HUVECs, A549)"
            list="findlines"
            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
          />
          <datalist id="findlines">{usedCellLines.map(cl => <option key={cl} value={cl} />)}</datalist>
          <input
            type="number"
            min={0}
            value={findPassage}
            onChange={e => setFindPassage(e.target.value)}
            placeholder="Passage"
            className="w-full sm:w-24 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
          />
          <input
            value={findCells}
            onChange={e => setFindCells(e.target.value)}
            placeholder="Min cells (1M, 500K)"
            title="Only vials with at least this many cells"
            className="w-full sm:w-36 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
          />
          <input
            value={findUser}
            onChange={e => setFindUser(e.target.value)}
            placeholder="Frozen by"
            list="findusers"
            className="w-full sm:w-36 px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
          />
          <datalist id="findusers">{Array.from(new Set(cryoVials.map(v => v.userName).filter(Boolean))).sort().map(n => <option key={n} value={n} />)}</datalist>
          {findActive && (
            <button onClick={clearFind}
              className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-medium font-manrope hover:bg-gray-200 whitespace-nowrap">
              Clear
            </button>
          )}
        </div>
        {findActive && (
          matches.length === 0 ? (
            <p className="text-xs text-gray-400 font-manrope">No vial matches.</p>
          ) : (
            <div>
              <p className="text-xs text-gray-500 font-manrope mb-2">{matches.length} vial{matches.length !== 1 ? 's' : ''} found &mdash; click a position to open it:</p>
              <div className="flex flex-wrap gap-1.5">
                {matches.slice(0, 60).map(v => {
                  const su = storageUnits.find(s => s.id === v.storageUnitId);
                  const b = boxOf(v);
                  const rl = su?.rackLabels?.[(b?.rack || v.rack) - 1];
                  return (
                    <button
                      key={v.id}
                      onClick={() => jumpToVial(v)}
                      className="px-2 py-1 rounded-lg border border-gray-200 bg-white hover:border-cyan-400 hover:bg-cyan-50 text-[11px] font-manrope flex items-center gap-1.5"
                      title={`${v.cellLine} P${v.passage} — ${su?.name || ''}`}
                    >
                      <span className="w-2 h-2 rounded-full border border-gray-300" style={rl?.color ? { backgroundColor: rl.color } : undefined} />
                      <span className="font-mono">{boxPositionLabel(b, v.row, v.col)}</span>
                      <span className="text-gray-400">P{v.passage}{v.cells ? ` · ${formatCells(v.cells)}` : ''}</span>
                    </button>
                  );
                })}
                {matches.length > 60 && <span className="text-[11px] text-gray-400 font-manrope self-center">+{matches.length - 60} more</span>}
              </div>
            </div>
          )
        )}
      </div>

      {/* Find space for a batch */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900 font-manrope flex items-center gap-2 flex-1"><Boxes size={14} /> Find space for a batch</h2>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-manrope">Vials to freeze</label>
            <input
              type="number" min={1} value={spaceN} onChange={e => setSpaceN(e.target.value)} placeholder="e.g. 10"
              className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
            />
            {spaceN && <button onClick={() => setSpaceN('')} className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-medium font-manrope hover:bg-gray-200">Clear</button>}
          </div>
        </div>
        {spaceWanted > 0 && (
          spaceOptions.length === 0 ? (
            <p className="text-xs text-red-600 font-manrope">No single box has {spaceWanted} free slots. Total free: {storageBoxes.reduce((n, b) => n + boxCapacity(b) - vialsInBox(b).length, 0)} across {storageBoxes.length} boxes.</p>
          ) : (
            <div>
              <p className="text-xs text-gray-500 font-manrope mb-2">
                {spaceOptions.length} box{spaceOptions.length !== 1 ? 'es' : ''} can take {spaceWanted} vial{spaceWanted !== 1 ? 's' : ''} &mdash; tightest fit first. Click one to open it{permissions.canManageCryo ? ` with the first ${spaceWanted} free slots already selected` : ''}:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {spaceOptions.slice(0, 40).map(({ b, free }) => {
                  const su = storageUnits.find(s => s.id === b.storageUnitId);
                  const rl = b.rack ? su?.rackLabels?.[b.rack - 1] : undefined;
                  return (
                    <button
                      key={b.id}
                      onClick={() => jumpToBoxForSpace(b)}
                      className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white hover:border-cyan-400 hover:bg-cyan-50 text-[11px] font-manrope flex items-center gap-1.5 text-left"
                      title={`${su?.name || ''}${b.rack ? ` · Rack ${b.rack}` : ''} · ${b.label} — ${free} free of ${boxCapacity(b)}`}
                    >
                      {rl?.color && <span className="w-2 h-2 rounded-full border border-gray-300" style={{ backgroundColor: rl.color }} />}
                      <span className="text-gray-500">{su ? storageUnitTypes[su.type]?.icon || '' : ''} {su?.name || '?'}{b.rack ? ` · R${b.rack}` : ''}</span>
                      <span className="font-semibold text-gray-900">{b.label}</span>
                      <span className={`font-mono ${free === spaceWanted ? 'text-emerald-600' : 'text-gray-500'}`}>{free} free</span>
                    </button>
                  );
                })}
                {spaceOptions.length > 40 && <span className="text-[11px] text-gray-400 font-manrope self-center">+{spaceOptions.length - 40} more</span>}
              </div>
            </div>
          )
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Racks & boxes */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 font-manrope mb-3">
            {unit?.name || 'Unit'} &mdash; {racks.length ? 'Racks' : 'Boxes'}
          </h2>

          {racks.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {racks.map(r => {
                const count = vialsInRack(r);
                const cap = rackCapacity(r) || 1;
                const isSelected = rack === r;
                const rl = rackLabel(r);
                const hits = matches.filter(v => v.storageUnitId === unit?.id && (boxOf(v)?.rack ?? v.rack) === r).length;
                return (
                  <button
                    key={r}
                    onClick={() => { setSelectedRack(r); setSelectedBoxId(''); setSelectedVial(null); setMultiSel(new Set()); }}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      isSelected ? 'bg-[#102C53]/5' : 'hover:border-gray-300'
                    } ${rl?.color ? '' : isSelected ? 'border-[#102C53]' : 'border-gray-100'}`}
                    style={rl?.color ? { borderColor: rl.color, borderWidth: isSelected ? 3 : 2 } : undefined}
                  >
                    <p className="text-xs font-bold text-gray-900 font-manrope flex items-center justify-center gap-1">
                      {rl?.color && <span className="w-2.5 h-2.5 rounded-full border border-gray-300 shrink-0" style={{ backgroundColor: rl.color }} />}
                      Rack {r}
                    </p>
                    {rl?.label && <p className="text-[9px] text-gray-500 font-manrope">{rl.label}</p>}
                    <p className="text-[10px] text-gray-400 font-manrope">{count} vials{hits > 0 ? ` · ${hits} found` : ''}</p>
                    <div className="w-full h-1 bg-gray-100 rounded-full mt-1.5">
                      <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${Math.min(100, (count / cap) * 100)}%` }} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Box selection */}
          {racks.length > 0 && (
            <h3 className="text-xs font-semibold text-gray-700 font-manrope mt-4 mb-2">Rack {rack} &mdash; Boxes</h3>
          )}
          <div className="flex gap-2 flex-wrap">
            {visibleBoxes.map(b => {
              const boxCount = vialsInBox(b).length;
              const isSelected = box?.id === b.id;
              const hits = matches.filter(v => v.boxId === b.id).length;
              return (
                <button
                  key={b.id}
                  onClick={() => { setSelectedBoxId(b.id); setSelectedVial(null); setMultiSel(new Set()); }}
                  title={[b.label, b.notes, `${b.gridRows}×${b.gridCols}`].filter(Boolean).join(' — ')}
                  className={`flex-1 min-w-[56px] p-2 rounded-lg border-2 text-center transition-all ${
                    isSelected ? 'border-cyan-500 bg-cyan-50' : hits > 0 ? 'border-amber-400 bg-amber-50' : 'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <p className="text-xs font-bold font-manrope truncate">{b.label}</p>
                  <p className="text-[9px] text-gray-400">{boxCount}/{boxCapacity(b)}{hits > 0 ? ` · ${hits}` : ''}</p>
                </button>
              );
            })}
            {visibleBoxes.length === 0 && <p className="text-xs text-gray-400 font-manrope py-2">No box here yet.</p>}
          </div>
        </div>

        {/* Box Grid (dynamic size) */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 font-manrope">
                {box?.label || 'Box'} <span className="text-gray-400 font-normal">({boxVials.length}/{slotsPerBox})</span>
              </h2>
              {box?.notes && <p className="text-[10px] text-gray-400 font-manrope">{box.notes}</p>}
            </div>
            {permissions.canManageCryo && box && (
              <button
                onClick={() => multiMode ? leaveMulti() : setMultiMode(true)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium font-manrope flex items-center gap-1 border transition-colors ${
                  multiMode ? 'bg-[#102C53] text-white border-[#102C53]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                title="Pick several empty slots, then store the whole batch at once"
              >
                <CheckSquare size={12} /> {multiMode ? 'Done' : 'Select many'}
              </button>
            )}
          </div>
          {multiMode && box && (
            <div className="mb-3 p-2.5 rounded-xl bg-cyan-50 border border-cyan-100 flex flex-wrap items-center gap-2 text-xs font-manrope">
              <span className="font-semibold text-gray-900">{multiSel.size} slot{multiSel.size !== 1 ? 's' : ''} selected</span>
              <span className="text-gray-400">· {freeSlotsOf(box).length} free in this box</span>
              <span className="flex items-center gap-1 ml-auto">
                <span className="text-gray-500">next</span>
                <input type="number" min={1} max={freeSlotsOf(box).length} placeholder="n"
                  className="w-14 px-2 py-1 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#4DC9FF]"
                  onKeyDown={e => { if (e.key === 'Enter') selectNextFree(Number((e.target as HTMLInputElement).value)); }}
                  onBlur={e => { if (e.target.value) selectNextFree(Number(e.target.value)); }}
                />
                <span className="text-gray-500">free</span>
              </span>
              {multiSel.size > 0 && (
                <>
                  <button onClick={() => setMultiSel(new Set())} className="px-2 py-1 rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50">Clear</button>
                  <button onClick={() => { setAddPosition(null); setShowAddModal(true); }} className="px-3 py-1 rounded-lg bg-cyan-500 text-white font-semibold hover:bg-cyan-600">
                    Store {multiSel.size} vial{multiSel.size !== 1 ? 's' : ''}
                  </button>
                </>
              )}
            </div>
          )}

          {/* Grid */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Column headers */}
            <div className="grid bg-gray-50" style={{ gridTemplateColumns: `auto repeat(${COLS.length}, 1fr)` }}>
              <div className="p-1" />
              {COLS.map(col => (
                <div key={col} className="p-1 text-center text-[9px] font-bold text-gray-500 font-manrope">{col}</div>
              ))}
            </div>

            {/* Rows */}
            {ROWS.map((rowLabel, rowIdx) => (
              <div key={rowLabel} className="grid border-t border-gray-100" style={{ gridTemplateColumns: `auto repeat(${COLS.length}, 1fr)` }}>
                <div className="p-1 flex items-center justify-center text-[9px] font-bold text-gray-500 font-manrope bg-gray-50 min-w-[20px]">{rowLabel}</div>
                {COLS.map((_, colIdx) => {
                  const vial = getVialAt(rowIdx, colIdx);
                  const isSelected = selectedVial === vial?.id;
                  const isLarge = COLS.length > 6;
                  return (
                    <div key={colIdx} className={`p-0.5 aspect-square flex items-center justify-center ${isLarge ? 'min-w-[20px]' : ''}`}>
                      {vial ? (
                        <button
                          onClick={() => setSelectedVial(isSelected ? null : vial.id)}
                          className={`w-full h-full rounded-full flex items-center justify-center text-white font-bold transition-all
                            ${isSelected ? 'ring-2 ring-offset-1 ring-[#102C53] scale-110' : 'hover:scale-105'}
                            ${findActive ? (isMatch(vial) ? 'ring-2 ring-offset-1 ring-amber-500' : 'opacity-25') : ''}
                          `}
                          style={{ fontSize: isLarge ? '6px' : '8px', backgroundColor: getCellLineColor(vial.cellLine) }}
                          title={`${vial.cellLine} P${vial.passage}`}
                        >
                          P{vial.passage}
                        </button>
                      ) : (
                        permissions.canManageCryo ? (
                          multiMode ? (
                            <button
                              onClick={() => toggleSlot(rowIdx, colIdx)}
                              className={`w-full h-full rounded-full border-2 flex items-center justify-center transition-all ${
                                multiSel.has(slotKey(rowIdx, colIdx))
                                  ? 'border-cyan-500 bg-cyan-400 text-white'
                                  : 'border-dashed border-gray-200 hover:border-cyan-400 hover:bg-cyan-50 text-gray-300'}`}
                              title={multiSel.has(slotKey(rowIdx, colIdx)) ? 'Selected — click to deselect' : 'Click to select'}
                            >
                              {multiSel.has(slotKey(rowIdx, colIdx)) ? <span style={{ fontSize: isLarge ? '6px' : '8px' }} className="font-bold">✓</span> : null}
                            </button>
                          ) : (
                          <button
                            onClick={() => { setAddPosition({ row: rowIdx, col: colIdx }); setShowAddModal(true); }}
                            className="w-full h-full rounded-full border-2 border-dashed border-gray-200 hover:border-cyan-400 hover:bg-cyan-50 flex items-center justify-center text-gray-300 hover:text-cyan-500 transition-all"
                          >
                            <Plus size={isLarge ? 6 : 10} />
                          </button>
                          )
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

          {/* Cell line legend — only what is in this box, grouped by cell type colour */}
          <div className="mt-3 flex flex-wrap gap-x-2.5 gap-y-1">
            {Array.from(new Set(boxVials.map(v => v.cellLine))).sort((a, b) => a.localeCompare(b)).map(cl => {
              const t = matchCellType(cl, cellTypes);
              return (
                <span key={cl} className="inline-flex items-center gap-1 text-[10px] font-manrope text-gray-600" title={t ? `Cell type: ${t.name}` : 'No cell type matches this name (grey) — add one in Admin → Cryo'}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getCellLineColor(cl) }} />
                  {cl} <span className="text-gray-400">{boxVials.filter(v => v.cellLine === cl).length}</span>
                </span>
              );
            })}
            {boxVials.length === 0 && <span className="text-[10px] text-gray-400 font-manrope">Empty box</span>}
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
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-white text-sm font-bold mb-2" style={{ backgroundColor: getCellLineColor(selectedVialData.cellLine) }}>
                  P{selectedVialData.passage}
                </div>
                <p className="text-sm font-bold text-gray-900 font-manrope">{selectedVialData.cellLine}</p>
                <p className="text-xs text-gray-500 font-manrope">Passage {selectedVialData.passage}{selectedVialData.cells ? ` · ${formatCells(selectedVialData.cells)} cells` : ''}</p>
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
                  <span className="text-gray-900 font-medium flex items-center gap-1.5">
                    {(() => { const rl = rackLabel(boxOf(selectedVialData)?.rack ?? selectedVialData.rack); return rl?.color
                      ? <span className="w-2.5 h-2.5 rounded-full border border-gray-300" style={{ backgroundColor: rl.color }} title={rl.label} /> : null; })()}
                    {boxPositionLabel(boxOf(selectedVialData), selectedVialData.row, selectedVialData.col)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cells / vial</span>
                  <span className="text-gray-900 font-medium">{selectedVialData.cells ? formatCells(selectedVialData.cells) : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Frozen on</span>
                  <span className="text-gray-900">{formatDate(selectedVialData.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Frozen by</span>
                  <span className="text-gray-900">{selectedVialData.userName}</span>
                </div>
                {selectedVialData.notes && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Notes</span>
                    <span className="text-gray-900 text-right">{selectedVialData.notes}</span>
                  </div>
                )}
              </div>

              {/* Thawing is allowed to anyone with manage_cryo (the log
                  records who did it); mirrors the cryo_vials_delete policy */}
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
      {showAddModal && targetPositions.length > 0 && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 font-manrope">
                {targetPositions.length === 1 ? 'Store New Vial' : `Store ${targetPositions.length} Vials`}
              </h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            <div className="space-y-4">
              <div className="bg-cyan-50 rounded-xl p-3 text-sm font-manrope">
                <span className="font-semibold">{targetPositions.length === 1 ? 'Position: ' : 'Positions: '}</span>
                {unit?.name || 'Unit'} &middot; {box?.label}
                <span className="font-mono text-xs text-gray-700"> &middot; {targetPositions.map(p => boxPositionLabel(box, p.row, p.col).split(' · ').pop()).join(', ')}</span>
                {targetPositions.length > 1 && <p className="text-[11px] text-gray-500 mt-1">Same cell line, passage, cells and date for every vial of the batch.</p>}
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Cells per vial <span className="text-red-500">*</span></label>
                  <input
                    value={newCellsStr}
                    onChange={e => setNewCellsStr(e.target.value)}
                    placeholder="1M, 500K, 1.2e6"
                    className={`w-full px-3 py-2.5 border rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none ${newCells === null ? 'border-red-300' : 'border-gray-200'}`}
                  />
                  <p className={`text-[10px] mt-1 font-manrope ${newCells === null ? 'text-red-600' : 'text-gray-400'}`}>
                    {newCells === null ? 'Not a number I can read' : newCells ? `= ${newCells.toLocaleString('en-US')} cells` : 'required — e.g. 1.25M · 950K · 0.6'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Passage <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min={0}
                    value={newPassageStr}
                    placeholder="e.g. 5"
                    onChange={e => setNewPassageStr(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Frozen on</label>
                  <input
                    type="date"
                    value={newDate}
                    max={todayStr()}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Frozen by</label>
                  <div className="w-full px-3 py-2.5 border border-gray-100 bg-gray-50 rounded-xl text-sm font-manrope text-gray-600 truncate" title="The owner is whoever stores the vial">{user.name}</div>
                </div>
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
                disabled={!newCellLine || !newCells || !Number.isFinite(newPassage) || newPassage < 0}
                className="w-full py-3 bg-cyan-500 text-white rounded-xl font-semibold text-sm font-manrope hover:bg-cyan-600 transition-colors disabled:opacity-40"
              >
                {targetPositions.length === 1 ? 'Store Vial' : `Store ${targetPositions.length} Vials`}
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
type VialSortKey = 'cellLine' | 'passage' | 'cells' | 'storage' | 'position' | 'userName' | 'date';

function VialInventory() {
  const { user, cryoVials, removeCryoVial, storageUnits, storageBoxes, permissions, cellTypes } = useLabContext();
  const [ConfirmDialog, confirmDelete] = useConfirm();
  const getCellLineColor = (cellLine: string) => cellLineColor(cellLine, cellTypes);
  // Mirror of the cryo_vials_delete RLS policy: anyone with manage_cryo
  // may thaw a vial (the log says who did it).
  const canWithdraw = (_v: { userId: string }) => permissions.canManageCryo;
  const isAdminUser = user.isAdmin || user.role === 'admin' || user.role === 'pi';
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<VialSortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);

  const toggleSort = (key: VialSortKey) => {
    if (sortKey === key) { setSortAsc(!sortAsc); } else { setSortKey(key); setSortAsc(true); }
  };

  const getUnitName = (id: string) => { const u = storageUnits.find(s => s.id === id); return u ? `${storageUnitTypes[u.type]?.icon || ''} ${u.name}` : id; };
  const getPositionStr = (v: typeof cryoVials[0]) =>
    boxPositionLabel(storageBoxes.find(b => b.id === v.boxId), v.row, v.col);

  const filtered = useMemo(() => {
    let list = [...cryoVials];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(v =>
        v.cellLine.toLowerCase().includes(q) ||
        v.userName.toLowerCase().includes(q) ||
        formatCells(v.cells).toLowerCase() === q ||
        v.notes.toLowerCase().includes(q) ||
        getUnitName(v.storageUnitId).toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'cellLine': cmp = a.cellLine.localeCompare(b.cellLine); break;
        case 'passage': cmp = a.passage - b.passage; break;
        case 'cells': cmp = (a.cells ?? -1) - (b.cells ?? -1); break;
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
            placeholder="Search cell line, person, notes, cells (1M)..."
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
        </div>
        {search && <p className="text-[11px] text-gray-400 font-manrope">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</p>}
      </div>
      {/* Cleanup deletes other users' vials too: admin only (RLS). */}
      {orphanVials.length > 0 && isAdminUser && (
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
            <SortHeader label="Cells" k="cells" />
            <SortHeader label="Storage" k="storage" />
            <SortHeader label="Position" k="position" />
            <SortHeader label="Frozen by" k="userName" />
            <SortHeader label="Frozen on" k="date" />
            <th className="px-3 py-2.5 text-left font-semibold text-gray-700">Notes</th>
            {permissions.canManageCryo && <th className="px-3 py-2.5 text-right font-semibold text-gray-700"></th>}
          </tr></thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-medium text-gray-900">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getCellLineColor(v.cellLine) }} />
                    {v.cellLine}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-600">P{v.passage}</td>
                <td className="px-3 py-2 text-gray-700 font-mono">{v.cells ? formatCells(v.cells) : <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-2 text-gray-500">{getUnitName(v.storageUnitId)}</td>
                <td className="px-3 py-2 text-gray-600 font-mono">{getPositionStr(v)}</td>
                <td className="px-3 py-2 text-gray-500">{v.userName}</td>
                <td className="px-3 py-2 text-gray-500">{v.date}</td>
                <td className="px-3 py-2 text-gray-500 max-w-[150px] truncate">{v.notes || '—'}</td>
                {permissions.canManageCryo && (
                  <td className="px-3 py-2 text-right">
                    {canWithdraw(v) && (
                      <button onClick={() => confirmDelete('Withdraw Vial?', `${v.cellLine} P${v.passage} will be removed from storage.`, () => removeCryoVial(v.id))} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="px-3 py-8 text-center text-gray-400">No vials found</td></tr>}
          </tbody>
        </table>
      </div>
      <ConfirmDialog />
    </div>
  );
}
