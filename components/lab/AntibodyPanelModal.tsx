'use client';

import { useMemo, useState } from 'react';
import { X, Copy, Check, Plus, Minus } from 'lucide-react';
import { useDialogA11y } from '@/components/ui/useDialogA11y';
import { Reagent, reagentPlaceLabel, StorageUnit, StorageBox } from '@/data/lab-data';
import { EMISSION_BANDS, EmissionBand, emissionBandMeta, fluorophoreBand, antibodyOptions, antibodyMatches, panelWarnings, PanelSlot, antibodyShortLabel } from '@/lib/antibodies';

const sel = 'w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none bg-white';

/**
 * Multicolour panel builder. One slot per emission band (3 to 5); for each
 * slot the user picks the primary's species and (optionally) Ig subclass,
 * and sees which secondaries in stock fit. Warns about clashes (same band,
 * same target, mixed hosts).
 */
export default function AntibodyPanelModal({ reagents, storageUnits, storageBoxes, onClose }: {
  reagents: Reagent[]; storageUnits: StorageUnit[]; storageBoxes: StorageBox[]; onClose: () => void;
}) {
  const ref = useDialogA11y(true, onClose);
  const secondaries = useMemo(() => reagents.filter(r => r.antibody && fluorophoreBand(r.antibody.fluorophore)), [reagents]);
  const options = useMemo(() => antibodyOptions(secondaries.map(r => r.antibody)), [secondaries]);
  const [slots, setSlots] = useState<PanelSlot[]>([
    { band: 'blue', target: '', isotype: '' }, { band: 'green', target: '', isotype: '' }, { band: 'red', target: '', isotype: '' }, { band: 'farred', target: '', isotype: '' },
  ]);
  const [host, setHost] = useState('');
  const [chosen, setChosen] = useState<Record<number, string>>({});   // slot index → reagent id
  const [copied, setCopied] = useState(false);

  const setSlot = (i: number, patch: Partial<PanelSlot>) => { setSlots(s => s.map((x, k) => k === i ? { ...x, ...patch } : x)); setChosen(c => { const n = { ...c }; delete n[i]; return n; }); };
  const addSlot = () => { if (slots.length >= 5) return; const used = new Set(slots.map(s => s.band)); const free = EMISSION_BANDS.find(b => !used.has(b)) ?? 'red'; setSlots([...slots, { band: free, target: '', isotype: '' }]); };
  const removeSlot = () => { if (slots.length <= 3) return; setSlots(slots.slice(0, -1)); setChosen(c => { const n = { ...c }; delete n[slots.length - 1]; return n; }); };

  const candidates = (s: PanelSlot) => secondaries.filter(r => antibodyMatches(r.antibody, { band: s.band, target: s.target, isotype: s.isotype, host })).sort((a, b) => (b.currentStock > 0 ? 1 : 0) - (a.currentStock > 0 ? 1 : 0) || a.name.localeCompare(b.name));
  const pickedOf = (i: number) => { const s = slots[i]; const c = candidates(s); const id = chosen[i]; return (id && c.find(r => r.id === id)) || c[0]; };
  const picked = slots.map((_, i) => pickedOf(i));
  const warnings = panelWarnings(slots, picked.map(p => p?.antibody));

  const summary = slots.map((s, i) => { const p = picked[i]; return `${emissionBandMeta[s.band].label}: ${p ? `${antibodyShortLabel(p.antibody!)} — ${p.supplier} ${p.catalogNumber} (${p.currentStock} ${p.unit}, ${reagentPlaceLabel(p, storageUnits, storageBoxes)})` : s.target ? `no secondary in stock for anti-${s.target}${s.isotype ? ' ' + s.isotype : ''}` : '—'}`; }).join('\n');
  const copy = async () => { try { await navigator.clipboard.writeText(`MiMic Lab — secondary panel\n${summary}`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ } };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Secondary antibody panel" tabIndex={-1} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 max-h-[92vh] overflow-y-auto outline-none" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-gray-900 font-manrope">Build a secondary panel</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <p className="text-xs text-gray-500 font-manrope mb-4">One colour per primary. Pick the species (and subclass) of each primary; the list shows the secondaries in stock for that band.</p>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-1 text-xs font-manrope text-gray-600">
            Colours
            <button onClick={removeSlot} disabled={slots.length <= 3} className="p-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30" aria-label="Fewer colours"><Minus size={12} /></button>
            <span className="w-5 text-center font-semibold text-gray-900">{slots.length}</span>
            <button onClick={addSlot} disabled={slots.length >= 5} className="p-1 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30" aria-label="More colours"><Plus size={12} /></button>
          </div>
          <label className="flex items-center gap-2 text-xs font-manrope text-gray-600">
            Host
            <select value={host} onChange={e => { setHost(e.target.value); setChosen({}); }} className={`${sel} w-auto`}>
              <option value="">any</option>
              {options.hosts.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </label>
          <span className="text-[10px] text-gray-400 font-manrope">{secondaries.length} secondaries with a known fluorophore in the stock list</span>
        </div>

        <div className="space-y-2">
          {slots.map((s, i) => {
            const meta = emissionBandMeta[s.band];
            const c = candidates(s);
            const p = picked[i];
            return (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[150px_1fr_1fr_2fr] gap-2 items-start p-3 rounded-xl border" style={{ borderColor: meta.color + '66', background: meta.bg + '55' }}>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1 font-manrope">Band</label>
                  <select value={s.band} onChange={e => setSlot(i, { band: e.target.value as EmissionBand })} className={sel} style={{ borderColor: meta.color }}>
                    {EMISSION_BANDS.map(b => <option key={b} value={b}>{emissionBandMeta[b].label}</option>)}
                  </select>
                  <p className="text-[9px] text-gray-400 mt-0.5 font-manrope">{meta.hint}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1 font-manrope">Primary raised in</label>
                  <select value={s.target} onChange={e => setSlot(i, { target: e.target.value })} className={sel}>
                    <option value="">— species —</option>
                    {options.targets.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1 font-manrope">Ig type</label>
                  <select value={s.isotype} onChange={e => setSlot(i, { isotype: e.target.value })} className={sel}>
                    <option value="">any</option>
                    {options.isotypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1 font-manrope">Secondary in stock {s.target && <span className="text-gray-400">({c.length})</span>}</label>
                  {!s.target ? <p className="text-xs text-gray-400 font-manrope py-2">Choose the species first.</p>
                   : c.length === 0 ? <p className="text-xs text-red-600 font-manrope py-2">None in the stock list for this band.</p>
                   : (
                    <select value={p?.id ?? ''} onChange={e => setChosen({ ...chosen, [i]: e.target.value })} className={sel}>
                      {c.map(r => <option key={r.id} value={r.id}>{antibodyShortLabel(r.antibody!)} · {r.currentStock} {r.unit}{r.currentStock <= 0 ? ' (empty!)' : ''}</option>)}
                    </select>
                  )}
                  {p && <p className="text-[10px] text-gray-500 font-manrope mt-1 truncate" title={p.name}>{p.supplier} {p.catalogNumber} · {reagentPlaceLabel(p, storageUnits, storageBoxes)}</p>}
                </div>
              </div>
            );
          })}
        </div>

        {warnings.length > 0 && (
          <ul className="mt-4 space-y-1">
            {warnings.map((w, i) => <li key={i} className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 font-manrope">{w}</li>)}
          </ul>
        )}
        {warnings.length === 0 && slots.every(s => s.target) && picked.every(Boolean) && (
          <p className="mt-4 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 font-manrope">No clash detected: distinct bands, distinct primaries, single host.</p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-[10px] text-gray-400 font-manrope">Bands are derived from the fluorophore name; always check the filter sets of the microscope you will use.</p>
          <button onClick={copy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#102C53] text-white text-xs font-medium font-manrope hover:bg-[#1a3d6e]">
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy panel as text'}
          </button>
        </div>
      </div>
    </div>
  );
}
