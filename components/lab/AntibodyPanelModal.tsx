'use client';

import { useMemo, useState } from 'react';
import { X, Copy, Check, Plus, Minus, Search, Trash2 } from 'lucide-react';
import { useDialogA11y } from '@/components/ui/useDialogA11y';
import { Reagent, reagentPlaceLabel, StorageUnit, StorageBox } from '@/data/lab-data';
import { EMISSION_BANDS, EmissionBand, emissionBandMeta, fluorophoreBand, antibodyOptions, antibodyMatches, panelWarnings, PanelSlot, antibodyShortLabel, abKind, assignPanel, panelEntryWarnings, groupPanelStock, PanelGroup } from '@/lib/antibodies';

const sel = 'w-full px-2.5 py-2 border border-gray-200 rounded-lg text-xs font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none bg-white';

/**
 * Multicolour panel builder. One slot per emission band (3 to 5); for each
 * slot the user picks the primary's species and (optionally) Ig subclass,
 * and sees which secondaries in stock fit. Warns about clashes (same band,
 * same target, mixed hosts).
 */
type Props = { reagents: Reagent[]; storageUnits: StorageUnit[]; storageBoxes: StorageBox[]; onClose: () => void };

/**
 * The panel lists antibodies, not vials: entries with the same antibody data
 * are one line (the vial in use and the spare one, or the same product typed
 * under two names), and the stock vials stay behind their aliquots as backup
 * — see groupPanelStock. Quantity and place cover every entry of the line.
 */
type PanelReagent = PanelGroup<Reagent>;
const panelReagents = (reagents: Reagent[]): PanelReagent[] => groupPanelStock(reagents);
const num = (x: number) => String(Math.round(x * 100) / 100);
/** "7 aliquots of 10 µL", or "2 aliquots of 10 µL + 1 vials" when the entries use different units. */
const amount = (rows: Reagent[]) => {
  const full = rows.filter(r => r.currentStock > 0);
  return new Set(full.map(r => r.unit)).size === 1 ? `${num(full.reduce((n, r) => n + r.currentStock, 0))} ${full[0].unit}` : full.map(r => `${num(r.currentStock)} ${r.unit}`).join(' + ');
};
const qty = (r: PanelReagent) => r.ownStock > 0 ? amount(r.members) : r.backupStock > 0 ? `aliquot empty · stock ${amount(r.backups)}` : `0 ${r.unit} (empty!)`;
/** Where to find it: the entries that still have something (all of them when empty), without repeats. */
const placeOf = (r: PanelReagent, units: StorageUnit[], boxes: StorageBox[]) => {
  const rows = r.ownStock > 0 ? r.members.filter(m => m.currentStock > 0) : r.backupStock > 0 ? r.backups.filter(m => m.currentStock > 0) : r.members;
  return Array.from(new Set(rows.map(m => reagentPlaceLabel(m, units, boxes)).filter(Boolean))).join(' / ');
};
/** Two products with the same antibody data: tell them apart by catalogue number. */
const tag = (r: PanelReagent) => r.ambiguous ? ` · ${[r.supplier, r.catalogNumber].filter(Boolean).join(' ') || 'no cat. #'}` : '';

export default function AntibodyPanelModal(props: Props) {
  const ref = useDialogA11y(true, props.onClose);
  const [mode, setMode] = useState<'targets' | 'colours'>('targets');
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={props.onClose}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Immunofluorescence panel" tabIndex={-1} className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 max-h-[92vh] overflow-y-auto outline-none" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900 font-manrope">Build a panel</h2>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-[11px] font-manrope">
              <button onClick={() => setMode('targets')} className={`px-3 py-1.5 ${mode === 'targets' ? 'bg-[#102C53] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>From targets</button>
              <button onClick={() => setMode('colours')} className={`px-3 py-1.5 ${mode === 'colours' ? 'bg-[#102C53] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>From colours</button>
            </div>
            <button onClick={props.onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>
        </div>
        {mode === 'targets' ? <TargetsMode {...props} /> : <ColoursMode {...props} />}
      </div>
    </div>
  );
}

/**
 * From targets: pick primaries and dyes from the stock list; each unconjugated
 * primary gets a compatible secondary (anti-host, right Ig class) on a free band.
 */
function TargetsMode({ reagents: allReagents, storageUnits, storageBoxes }: Props) {
  const reagents = useMemo(() => panelReagents(allReagents), [allReagents]);
  const pool = useMemo(() => reagents.filter(r => abKind(r.antibody) === 'primary' || abKind(r.antibody) === 'dye').sort((a, b) => (a.antibody!.antigen || a.name).localeCompare(b.antibody!.antigen || b.name)), [reagents]);
  const secondaries = useMemo(() => reagents.filter(r => abKind(r.antibody) === 'secondary'), [reagents]);
  const [ids, setIds] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const items = ids.map(id => pool.find(r => r.id === id)).filter((r): r is PanelReagent => !!r);
  const entries = useMemo(() => assignPanel(items, secondaries, overrides), [items, secondaries, overrides]);
  const label = (r: PanelReagent) => r.antibody ? (abKind(r.antibody) === 'secondary' ? antibodyShortLabel(r.antibody) : (r.antibody.antigen || r.name)) : r.name;
  const warnings = panelEntryWarnings(entries, label);
  const hits = q.trim() ? pool.filter(r => !ids.includes(r.id) && `${r.antibody!.antigen} ${r.name} ${r.antibody!.host} ${r.antibody!.isotype} ${r.antibody!.clone}`.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 12) : [];
  const add = (id: string) => { if (ids.length < 5 && !ids.includes(id)) setIds([...ids, id]); setQ(''); };
  const remove = (id: string) => { setIds(ids.filter(x => x !== id)); setOverrides(o => { const n = { ...o }; delete n[id]; return n; }); };
  const quick = (re: RegExp) => pool.find(r => re.test(r.antibody!.antigen || '') && !ids.includes(r.id));
  const nuclei = quick(/nuclei/i), actin = quick(/f-actin/i);
  const place = (r: PanelReagent) => placeOf(r, storageUnits, storageBoxes);
  const summary = entries.map(e => { const m = e.band ? emissionBandMeta[e.band].label : 'no band'; const sec = e.secondary ? ` → ${antibodyShortLabel(e.secondary.antibody!)} — ${e.secondary.supplier} ${e.secondary.catalogNumber} (${qty(e.secondary)}, ${place(e.secondary)})` : e.fixed ? '' : ' → no compatible secondary'; return `${m}: ${label(e.item)} [${[e.item.antibody!.host, e.item.antibody!.isotype, e.item.antibody!.clone ? 'clone ' + e.item.antibody!.clone : ''].filter(Boolean).join(' · ') || e.item.antibody!.fluorophore}] (${qty(e.item)}, ${place(e.item)})${sec}`; }).join('\n');
  const copy = async () => { try { await navigator.clipboard.writeText(`MiMic Lab — IF panel\n${summary}`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ } };

  return (
    <>
      <p className="text-xs text-gray-500 font-manrope mb-3">Choose what you want to stain (up to 5 items). Each primary is matched with a secondary in stock that recognises its species and Ig class, on a free colour; conjugated primaries and dyes keep their own.</p>
      <div className="relative mb-2">
        <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder={ids.length >= 5 ? 'Panel full (5)' : 'Search a primary or dye: aSMA, vimentin, troponin, phalloidin…'} disabled={ids.length >= 5} className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none disabled:bg-gray-50" />
        {hits.length > 0 && (
          <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
            {hits.map(r => <li key={r.id}><button onClick={() => add(r.id)} className="w-full text-left px-3 py-1.5 text-xs font-manrope hover:bg-gray-50 flex items-center justify-between gap-2">
              <span className="truncate"><span className="font-medium text-gray-900">{r.antibody!.antigen || r.name}</span> <span className="text-gray-500">{[r.antibody!.host, r.antibody!.isotype, r.antibody!.clone ? 'clone ' + r.antibody!.clone : '', r.antibody!.fluorophore].filter(Boolean).join(' · ')}{tag(r)}</span></span>
              <span className={`shrink-0 text-[10px] ${r.currentStock <= 0 ? 'text-red-600' : 'text-gray-400'}`}>{qty(r)}</span>
            </button></li>)}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[10px] font-manrope text-gray-500">
        Quick add:
        {nuclei && <button onClick={() => add(nuclei.id)} disabled={ids.length >= 5} className="px-2 py-0.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40">{nuclei.antibody!.antigen} ({nuclei.antibody!.fluorophore || nuclei.name})</button>}
        {actin && <button onClick={() => add(actin.id)} disabled={ids.length >= 5} className="px-2 py-0.5 rounded-full border border-gray-200 hover:bg-gray-50 disabled:opacity-40">{actin.antibody!.antigen} ({actin.antibody!.fluorophore})</button>}
        <span className="ml-auto text-gray-400">{pool.length} primaries & dyes · {secondaries.length} secondaries in the stock list</span>
      </div>

      {entries.length === 0 && <p className="text-xs text-gray-400 font-manrope text-center py-8 border border-dashed border-gray-200 rounded-xl">Nothing picked yet.</p>}
      <div className="space-y-2">
        {entries.map(e => {
          const m = e.band ? emissionBandMeta[e.band] : null; const ab = e.item.antibody!;
          return (
            <div key={e.item.id} className="grid grid-cols-1 sm:grid-cols-[110px_1fr_1.4fr_auto] gap-2 items-center p-3 rounded-xl border" style={{ borderColor: (m?.color ?? '#d1d5db') + '66', background: (m?.bg ?? '#f9fafb') + '55' }}>
              <div className="flex items-center gap-1.5 text-xs font-semibold font-manrope" style={{ color: m?.text ?? '#6b7280' }}>
                <span className="w-3 h-3 rounded-full border border-white shadow" style={{ background: m?.color ?? '#d1d5db' }} />{m?.label ?? 'no band'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 font-manrope truncate" title={e.item.name}>{ab.antigen || e.item.name}</p>
                <p className="text-[10px] text-gray-500 font-manrope truncate">{[ab.host, ab.isotype, ab.clone ? 'clone ' + ab.clone : '', ab.fluorophore].filter(Boolean).join(' · ')}{tag(e.item)} · {qty(e.item)} · {place(e.item)}</p>
              </div>
              <div className="min-w-0">
                {e.fixed ? <p className="text-[10px] text-gray-500 font-manrope">{abKind(ab) === 'dye' ? 'Dye — no secondary needed.' : 'Directly conjugated — no secondary needed.'}</p>
                 : e.candidates.length === 0 ? <p className="text-[10px] text-red-600 font-manrope">No secondary in stock recognises {ab.host || '?'} {ab.isotype}.</p>
                 : <>
                    <select value={e.secondary?.id ?? ''} onChange={ev => setOverrides({ ...overrides, [e.item.id]: ev.target.value })} className={sel}>
                      {e.candidates.map(c => <option key={c.item.id} value={c.item.id}>{antibodyShortLabel(c.item.antibody!)}{c.fit === 'generic' ? ' (generic)' : ''}{tag(c.item)} · {qty(c.item)}</option>)}
                    </select>
                    {e.secondary && <p className="text-[10px] text-gray-500 font-manrope mt-0.5 truncate" title={e.secondary.name}>{e.secondary.supplier} {e.secondary.catalogNumber} · {place(e.secondary)}</p>}
                   </>}
              </div>
              <button onClick={() => remove(e.item.id)} aria-label="Remove" className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-white"><Trash2 size={13} /></button>
            </div>
          );
        })}
      </div>

      {warnings.length > 0 && <ul className="mt-4 space-y-1">{warnings.map((w, i) => <li key={i} className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 font-manrope">{w}</li>)}</ul>}
      {entries.length >= 2 && warnings.length === 0 && <p className="mt-4 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 font-manrope">No clash detected: distinct colours, every primary has a specific secondary, single host, everything in stock.</p>}

      <div className="mt-4 flex items-center justify-between gap-2">
        <p className="text-[10px] text-gray-400 font-manrope">Bands come from the fluorophore name; always check the filter sets of the microscope you will use.</p>
        <button onClick={copy} disabled={entries.length === 0} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#102C53] text-white text-xs font-medium font-manrope hover:bg-[#1a3d6e] disabled:opacity-40">
          {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy panel as text'}
        </button>
      </div>
    </>
  );
}

/** From colours: one slot per band, then the species / Ig class of each primary. */
function ColoursMode({ reagents: allReagents, storageUnits, storageBoxes }: Props) {
  const reagents = useMemo(() => panelReagents(allReagents), [allReagents]);
  const secondaries = useMemo(() => reagents.filter(r => abKind(r.antibody) === 'secondary' && fluorophoreBand(r.antibody!.fluorophore)), [reagents]);
  const options = useMemo(() => antibodyOptions(secondaries.map(r => r.antibody)), [secondaries]);
  // Primaries and dyes in stock: picking one fills species / Ig (and the band, when directly conjugated)
  const pool = useMemo(() => reagents.filter(r => abKind(r.antibody) === 'primary' || abKind(r.antibody) === 'dye').sort((a, b) => (a.antibody!.antigen || a.name).localeCompare(b.antibody!.antigen || b.name)), [reagents]);
  type Slot = PanelSlot & { primaryId?: string };
  const [slots, setSlots] = useState<Slot[]>([
    { band: 'blue', target: '', isotype: '' }, { band: 'green', target: '', isotype: '' }, { band: 'red', target: '', isotype: '' }, { band: 'farred', target: '', isotype: '' },
  ]);
  const [host, setHost] = useState('');
  const [chosen, setChosen] = useState<Record<number, string>>({});   // slot index → reagent id
  const [copied, setCopied] = useState(false);

  const setSlot = (i: number, patch: Partial<Slot>) => { setSlots(s => s.map((x, k) => k === i ? { ...x, ...patch } : x)); setChosen(c => { const n = { ...c }; delete n[i]; return n; }); };
  const addSlot = () => { if (slots.length >= 5) return; const used = new Set(slots.map(s => s.band)); const free = EMISSION_BANDS.find(b => !used.has(b)) ?? 'red'; setSlots([...slots, { band: free, target: '', isotype: '' }]); };
  const removeSlot = () => { if (slots.length <= 3) return; setSlots(slots.slice(0, -1)); setChosen(c => { const n = { ...c }; delete n[slots.length - 1]; return n; }); };

  const primaryOf = (s: Slot) => s.primaryId ? pool.find(r => r.id === s.primaryId) : undefined;
  // Dye or conjugated primary: the slot needs no secondary
  const isFixed = (s: Slot) => { const pr = primaryOf(s); return !!pr && (abKind(pr.antibody) === 'dye' || !!pr.antibody!.fluorophore); };
  const primaryChoices = (s: Slot) => pool.filter(r => {
    const ab = r.antibody!;
    if (abKind(ab) === 'dye') return fluorophoreBand(ab.fluorophore) === s.band;
    if (ab.fluorophore && fluorophoreBand(ab.fluorophore) !== s.band) return false;
    return (!s.target || ab.host === s.target) && (!s.isotype || !ab.isotype || ab.isotype === s.isotype || (s.isotype.startsWith('IgG') && /\(H\+L\)/.test(s.isotype) && ab.isotype.startsWith('IgG')));
  });
  const pickPrimary = (i: number, id: string) => {
    const pr = pool.find(r => r.id === id);
    if (!pr) { setSlot(i, { primaryId: undefined }); return; }
    const ab = pr.antibody!; const own = fluorophoreBand(ab.fluorophore);
    setSlot(i, abKind(ab) === 'dye' ? { primaryId: id, target: '', isotype: '' } : { primaryId: id, target: ab.host, isotype: ab.isotype, ...(own ? { band: own } : {}) });
  };
  const candidates = (s: Slot) => isFixed(s) ? [] : secondaries.filter(r => antibodyMatches(r.antibody, { band: s.band, target: s.target, isotype: s.isotype, host })).sort((a, b) => (b.currentStock > 0 ? 1 : 0) - (a.currentStock > 0 ? 1 : 0) || a.name.localeCompare(b.name));
  const pickedOf = (i: number) => { const s = slots[i]; const c = candidates(s); const id = chosen[i]; return (id && c.find(r => r.id === id)) || c[0]; };
  const picked = slots.map((_, i) => pickedOf(i));
  const warnings = [
    ...panelWarnings(slots, picked.map(p => p?.antibody)),
    ...slots.flatMap((s, i) => { const pr = primaryOf(s); return pr && pr.currentStock <= 0 ? [`Slot ${i + 1}: ${pr.antibody!.antigen || pr.name} is out of stock.`] : []; }),
  ];

  const summary = slots.map((s, i) => { const p = picked[i]; const pr = primaryOf(s); const prTxt = pr ? `${pr.antibody!.antigen || pr.name} [${[pr.antibody!.host, pr.antibody!.isotype, pr.antibody!.clone ? 'clone ' + pr.antibody!.clone : '', pr.antibody!.fluorophore].filter(Boolean).join(' · ')}] (${qty(pr)}, ${placeOf(pr, storageUnits, storageBoxes)})${isFixed(s) ? '' : ' → '}` : ''; return `${emissionBandMeta[s.band].label}: ${prTxt}${isFixed(s) ? '' : p ? `${antibodyShortLabel(p.antibody!)} — ${p.supplier} ${p.catalogNumber} (${qty(p)}, ${placeOf(p, storageUnits, storageBoxes)})` : s.target ? `no secondary in stock for anti-${s.target}${s.isotype ? ' ' + s.isotype : ''}` : '—'}`; }).join('\n');
  const copy = async () => { try { await navigator.clipboard.writeText(`MiMic Lab — secondary panel\n${summary}`); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ } };

  return (
    <>
        <p className="text-xs text-gray-500 font-manrope mb-4">One colour per primary. Pick a primary from the stock list (species and Ig fill in by themselves), or just the species and subclass; the last column shows the secondaries in stock for that band.</p>

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
              <div key={i} className="grid grid-cols-1 sm:grid-cols-[120px_0.9fr_0.8fr_1.7fr_1.4fr] gap-2 items-start p-3 rounded-xl border" style={{ borderColor: meta.color + '66', background: meta.bg + '55' }}>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1 font-manrope">Band</label>
                  <select value={s.band} onChange={e => setSlot(i, { band: e.target.value as EmissionBand, ...(isFixed(s) ? { primaryId: undefined, target: '', isotype: '' } : {}) })} className={sel} style={{ borderColor: meta.color }}>
                    {EMISSION_BANDS.map(b => <option key={b} value={b}>{emissionBandMeta[b].label}</option>)}
                  </select>
                  <p className="text-[9px] text-gray-400 mt-0.5 font-manrope">{meta.hint}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1 font-manrope">Raised in</label>
                  <select value={s.target} onChange={e => setSlot(i, { target: e.target.value, primaryId: undefined })} className={sel} disabled={isFixed(s)}>
                    <option value="">— species —</option>
                    {options.targets.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1 font-manrope">Ig type</label>
                  <select value={s.isotype} onChange={e => setSlot(i, { isotype: e.target.value, primaryId: undefined })} className={sel} disabled={isFixed(s)}>
                    <option value="">any</option>
                    {options.isotypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1 font-manrope">Secondary in stock {s.target && !isFixed(s) && <span className="text-gray-400">({c.length})</span>}</label>
                  {isFixed(s) ? <p className="text-xs text-gray-500 font-manrope py-2">{abKind(primaryOf(s)!.antibody) === 'dye' ? 'Dye — no secondary needed.' : 'Directly conjugated — no secondary needed.'}</p>
                   : !s.target ? <p className="text-xs text-gray-400 font-manrope py-2">Choose a primary or a species first.</p>
                   : c.length === 0 ? <p className="text-xs text-red-600 font-manrope py-2">None in the stock list for this band.</p>
                   : (
                    <select value={p?.id ?? ''} onChange={e => setChosen({ ...chosen, [i]: e.target.value })} className={sel}>
                      {c.map(r => <option key={r.id} value={r.id}>{antibodyShortLabel(r.antibody!)}{tag(r)} · {qty(r)}</option>)}
                    </select>
                  )}
                  {p && <p className="text-[10px] text-gray-500 font-manrope mt-1 truncate" title={p.name}>{p.supplier} {p.catalogNumber} · {placeOf(p, storageUnits, storageBoxes)}</p>}
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 mb-1 font-manrope">Primary / dye in stock <span className="text-gray-400">({primaryChoices(s).length})</span></label>
                  <select value={s.primaryId ?? ''} onChange={e => pickPrimary(i, e.target.value)} className={sel}>
                    <option value="">— none / any —</option>
                    {primaryChoices(s).map(r => { const ab = r.antibody!; return <option key={r.id} value={r.id}>{ab.antigen || r.name}{abKind(ab) === 'dye' ? ` (${ab.fluorophore})` : ` · ${[ab.host, ab.isotype].filter(Boolean).join(' ')}${ab.fluorophore ? ' · ' + ab.fluorophore : ''}`}{tag(r)} · {qty(r)}</option>; })}
                  </select>
                  {primaryOf(s) && <p className="text-[10px] text-gray-500 font-manrope mt-1 truncate" title={primaryOf(s)!.name}>{primaryOf(s)!.antibody!.clone ? `clone ${primaryOf(s)!.antibody!.clone} · ` : ''}{placeOf(primaryOf(s)!, storageUnits, storageBoxes)}</p>}
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
        {warnings.length === 0 && slots.every(s => s.target || isFixed(s)) && slots.every((s, i) => isFixed(s) || picked[i]) && (
          <p className="mt-4 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 font-manrope">No clash detected: distinct bands, distinct primaries, single host.</p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-[10px] text-gray-400 font-manrope">Bands are derived from the fluorophore name; always check the filter sets of the microscope you will use.</p>
          <button onClick={copy} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#102C53] text-white text-xs font-medium font-manrope hover:bg-[#1a3d6e]">
            {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy panel as text'}
          </button>
        </div>
    </>
  );
}
