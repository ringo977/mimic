'use client';

import { useMemo, useState } from 'react';
import { X, Save, Wand2 } from 'lucide-react';
import { parseSecondaryAntibody, fluorophoreBand, emissionBandMeta, SecondaryAntibody } from '@/lib/antibodies';
import { useLabContext } from './LabContext';
import { useDialogA11y } from '@/components/ui/useDialogA11y';
import {
  Reagent, ReagentKind, reagentKinds, reagentKindLabel, storageUnitTypes, isShelfBased, boxesOfUnit,
  doorSideLabel, DoorSide, generateId, isAlumni, reagentMacroCategories, allMacroKeys,
} from '@/data/lab-data';

const inputCls = 'w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none';
const btnPrimary = 'w-full py-3 bg-[#102C53] text-white rounded-xl font-semibold text-sm font-manrope hover:bg-[#1a3d6e] disabled:opacity-40 flex items-center justify-center gap-2';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">{label}</label>{children}</div>;
}

export function emptyReagent(category: string): Reagent {
  return { id: generateId(), name: '', category, currentStock: 0, maxStock: 0, unit: 'units', expiryDate: '', location: '', storageUnitId: undefined, supplier: '', catalogNumber: '', alertThreshold: 2, kind: 'item' };
}

/**
 * Add / edit a reagent. Shared by the Admin "Reagents" tab and the Reagents
 * page (anyone with add_reagents can add a newly arrived product or fix lot,
 * expiry, location…). The stock / working-solution classification and the
 * responsibles are reserved to admin, PI and lab manager — the database
 * trigger protect_reagent_fields enforces the same rule.
 */
export default function ReagentFormModal({ initial, defaultCategory, categories, onClose, title }: {
  initial: Reagent | null;
  defaultCategory?: string;
  /** Sub-categories offered in the dropdown; defaults to every known sub-category. */
  categories?: string[];
  title?: string;
  onClose: () => void;
}) {
  const { reagents, users, storageUnits, storageBoxes, addNewReagent, updateReagent, canManageAllBookings } = useLabContext();
  const canEditKind = canManageAllBookings;
  // Stock quantity: free on creation (initial quantity); on edit only a
  // manager may correct it directly (inventory correction, logged server-side).
  const canEditStock = !initial || canManageAllBookings;
  const ref = useDialogA11y(true, onClose);
  const editing = !!initial;
  const [form, setForm] = useState<Reagent>(initial ? { ...initial } : emptyReagent(defaultCategory || 'Cell Culture'));

  const allCategories = useMemo(() => {
    const set = new Set<string>(categories && categories.length ? categories : allMacroKeys.flatMap(k => reagentMacroCategories[k].subCategories));
    reagents.forEach(r => set.add(r.category));
    if (form.category) set.add(form.category);
    return Array.from(set);
  }, [categories, reagents, form.category]);
  const activeUsers = useMemo(() => users.filter(u => u.status === 'active' && !isAlumni(u)).sort((a, b) => a.name.localeCompare(b.name)), [users]);
  const stockOptions = useMemo(() => reagents.filter(r => r.kind === 'stock').sort((a, b) => a.name.localeCompare(b.name)), [reagents]);

  const formUnit = form.storageUnitId ? storageUnits.find(s => s.id === form.storageUnitId) : undefined;
  const formShelves = formUnit && isShelfBased(formUnit.type) ? (formUnit.numShelves || 0) : 0;
  const formBoxes = formUnit ? boxesOfUnit(storageBoxes, formUnit.id) : [];
  const formDoors = formUnit && isShelfBased(formUnit.type) ? (formUnit.numDoors || 1) : 1;

  // Secondary antibody block: for the antibody categories, or when already set
  const isAbCategory = /antibod/i.test(form.category);
  const showAb = isAbCategory || !!form.antibody;
  const ab: SecondaryAntibody = form.antibody ?? { host: '', target: '', isotype: '', fluorophore: '' };
  const setAb = (patch: Partial<SecondaryAntibody>) => setForm({ ...form, antibody: { ...ab, ...patch } });
  const abBand = fluorophoreBand(ab.fluorophore);
  const abOptions = useMemo(() => {
    const hosts = new Set<string>(), targets = new Set<string>(), isotypes = new Set<string>(), fluors = new Set<string>();
    reagents.forEach(r => { if (!r.antibody) return; if (r.antibody.host) hosts.add(r.antibody.host); if (r.antibody.target) targets.add(r.antibody.target); if (r.antibody.isotype) isotypes.add(r.antibody.isotype); if (r.antibody.fluorophore) fluors.add(r.antibody.fluorophore); });
    ['Goat', 'Donkey'].forEach(x => hosts.add(x)); ['Mouse', 'Rabbit', 'Rat', 'Chicken', 'Goat', 'Human'].forEach(x => targets.add(x));
    ['IgG (H+L)', 'IgG1', 'IgG2a', 'IgG2b', 'IgG3', 'IgM', 'IgY'].forEach(x => isotypes.add(x)); ['AF-405', 'AF-488', 'AF-546', 'AF-555', 'AF-594', 'AF-647', 'AF-680', 'AF-750', 'FITC', 'TRITC', 'Cy3', 'Cy5', 'HRP'].forEach(x => fluors.add(x));
    const s = (x: Set<string>) => Array.from(x).sort();
    return { hosts: s(hosts), targets: s(targets), isotypes: s(isotypes), fluors: s(fluors) };
  }, [reagents]);
  const detectAb = () => { const p = parseSecondaryAntibody(form.name); if (p) setForm({ ...form, antibody: p }); };

  const save = () => {
    if (!form.name) return;
    // Sanitise numbers: no negatives; max 0 = no limit, otherwise ≥ stock
    // (the server rejects restocks above the maximum).
    const currentStock = Math.max(0, Number(form.currentStock) || 0);
    const rawMax = Math.max(0, Number(form.maxStock) || 0);
    const maxStock = rawMax > 0 ? Math.max(rawMax, currentStock) : 0;
    const kind: ReagentKind = form.kind ?? 'item';
    // Antibody block: dropped when every field is empty
    const abClean = form.antibody && Object.values(form.antibody).some(v => (v || '').trim()) 
      ? { host: form.antibody.host.trim(), target: form.antibody.target.trim(), isotype: form.antibody.isotype.trim(), fluorophore: form.antibody.fluorophore.trim() }
      : undefined;
    const clean: Reagent = {
      ...form, antibody: abClean, currentStock, maxStock, alertThreshold: Math.max(0, Number(form.alertThreshold) || 0),
      // Responsibles on any kind (beta round 4): on a stock they are the only
      // ones who may take from it; on every kind they may restock it even
      // without canAddReagents (PDMS kits looked after by a PhD).
      kind, derivedFromId: kind === 'working' ? form.derivedFromId : undefined, responsibleUserIds: form.responsibleUserIds ?? [],
      openToStudents: kind !== 'stock' && !!form.openToStudents,
    };
    if (initial) {
      // Quantities move only through Withdraw / Restock (logged, atomic RPC).
      // Editing the record never touches the stock, except for a manager's
      // explicit inventory correction — which the DB trigger logs as such.
      const stockChanged = canEditStock && clean.currentStock !== initial.currentStock;
      updateReagent(canEditStock ? clean : { ...clean, currentStock: initial.currentStock }, { keepServerStock: !stockChanged });
    } else {
      addNewReagent(clean);
    }
    onClose();
  };

  const heading = title || (editing ? 'Edit Reagent' : 'Add Reagent');

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
      <div ref={ref} role="dialog" aria-modal="true" aria-label={heading} tabIndex={-1} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto outline-none">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900 font-manrope">{heading}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputCls} /></Field>
            <Field label="Category">
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className={inputCls}>
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label={canEditStock && initial ? 'Stock (correction)' : 'Stock'}>
              <input type="number" min={0} value={form.currentStock || ''} readOnly={!canEditStock} title={canEditStock ? undefined : 'Quantities change only through Withdraw / Restock'}
                onChange={e => canEditStock && setForm({ ...form, currentStock: e.target.value === '' ? 0 : Number(e.target.value) })}
                className={`${inputCls} ${canEditStock ? '' : 'bg-gray-50 text-gray-500 cursor-not-allowed'}`} />
            </Field>
            <Field label="Max (blank = no limit)"><input type="number" min={0} placeholder="no limit" value={form.maxStock || ''} onChange={e => setForm({ ...form, maxStock: e.target.value === '' ? 0 : Number(e.target.value) })} className={inputCls} /></Field>
            <Field label="Alert At"><input type="number" min={0} value={form.alertThreshold || ''} onChange={e => setForm({ ...form, alertThreshold: e.target.value === '' ? 0 : Number(e.target.value) })} className={inputCls} /></Field>
          </div>
          {!canEditStock && (
            <p className="text-[11px] text-gray-500 -mt-1">Quantities change only through Withdraw / Restock (logged movements). Editing here updates the record, not the stock.</p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Unit"><input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="e.g., µL, vials, bottles" className={inputCls} /></Field>
            <Field label="Storage Unit">
              <select value={form.storageUnitId || ''} onChange={e => setForm({ ...form, storageUnitId: e.target.value || undefined, boxId: undefined, shelf: undefined, door: undefined, location: storageUnits.find(s => s.id === e.target.value)?.name || form.location })} className={inputCls}>
                <option value="">— Not assigned</option>
                {storageUnits.map(s => <option key={s.id} value={s.id}>{storageUnitTypes[s.type]?.icon} {s.name} ({s.temperature})</option>)}
              </select>
            </Field>
          </div>
          {formUnit && (formShelves > 0 || formBoxes.length > 0 || formDoors > 1) && (
            <div className={`grid gap-3 ${[formDoors > 1, formShelves > 0, formBoxes.length > 0].filter(Boolean).length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {formDoors > 1 && (
                <Field label="Door">
                  <select value={form.door || ''} onChange={e => setForm({ ...form, door: (e.target.value || undefined) as DoorSide | undefined })} className={inputCls}>
                    <option value="">— Not specified</option>
                    <option value="left">Left</option>
                    <option value="right">Right</option>
                  </select>
                </Field>
              )}
              {formShelves > 0 && (
                <Field label="Shelf (1 = top)">
                  <select value={form.shelf ?? ''} onChange={e => setForm({ ...form, shelf: e.target.value === '' ? undefined : Number(e.target.value) })} className={inputCls}>
                    <option value="">— Not specified</option>
                    {Array.from({ length: formShelves }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>Shelf {n}{n === 1 ? ' (top)' : n === formShelves ? ' (bottom)' : ''}</option>
                    ))}
                  </select>
                </Field>
              )}
              {formBoxes.length > 0 && (
                <Field label="Box (optional)">
                  <select value={form.boxId || ''} onChange={e => {
                    const b = formBoxes.find(x => x.id === e.target.value);
                    setForm({ ...form, boxId: b?.id, shelf: b?.shelf ?? form.shelf, door: b?.door ?? form.door });
                  }} className={inputCls}>
                    <option value="">— No box (loose on the shelf)</option>
                    {formBoxes.map(b => {
                      const where = [b.door ? doorSideLabel[b.door].toLowerCase() : '', b.shelf != null ? `shelf ${b.shelf}` : ''].filter(Boolean).join(', ');
                      return <option key={b.id} value={b.id}>{b.label}{where ? ` (${where})` : ''}</option>;
                    })}
                  </select>
                </Field>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Supplier"><input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} className={inputCls} /></Field>
            <Field label="Catalog #"><input value={form.catalogNumber} onChange={e => setForm({ ...form, catalogNumber: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Expiry Date"><input type="date" value={form.expiryDate} onChange={e => setForm({ ...form, expiryDate: e.target.value })} className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lot / batch"><input value={form.lot || ''} onChange={e => setForm({ ...form, lot: e.target.value || undefined })} placeholder="e.g., H015928" className={inputCls} /></Field>
            <Field label="Owner"><input value={form.owner || ''} onChange={e => setForm({ ...form, owner: e.target.value || undefined })} placeholder="who bought it" list="reagent-owners" className={inputCls} />
              <datalist id="reagent-owners">{Array.from(new Set(reagents.map(r => r.owner).filter(Boolean))).map(o => <option key={o} value={o} />)}</datalist>
            </Field>
          </div>
          <Field label="Notes"><input value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value || undefined })} placeholder="e.g., 2 aliquots in use" className={inputCls} /></Field>

          {showAb && (
            <div className="p-3 rounded-xl border border-gray-200 bg-gray-50/60 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-700 font-manrope">Secondary antibody</p>
                <button type="button" onClick={detectAb} disabled={!form.name} className="flex items-center gap-1 text-[11px] font-medium text-[#102C53] hover:underline disabled:opacity-40 font-manrope" title="Read host, target, Ig type and fluorophore from the name">
                  <Wand2 size={11} /> Detect from name
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Host (raised in)"><input value={ab.host} onChange={e => setAb({ host: e.target.value })} list="ab-hosts" placeholder="Goat" className={inputCls} /></Field>
                <Field label="Target (anti-)"><input value={ab.target} onChange={e => setAb({ target: e.target.value })} list="ab-targets" placeholder="Mouse" className={inputCls} /></Field>
                <Field label="Ig type"><input value={ab.isotype} onChange={e => setAb({ isotype: e.target.value })} list="ab-isotypes" placeholder="IgG (H+L), IgG1…" className={inputCls} /></Field>
                <Field label="Fluorophore">
                  <div className="flex items-center gap-2">
                    <input value={ab.fluorophore} onChange={e => setAb({ fluorophore: e.target.value })} list="ab-fluors" placeholder="AF-488" className={inputCls} />
                    {abBand && <span className="shrink-0 w-3 h-3 rounded-full border border-white shadow" style={{ background: emissionBandMeta[abBand].color }} title={`${emissionBandMeta[abBand].label} · ${emissionBandMeta[abBand].hint}`} />}
                  </div>
                </Field>
              </div>
              <datalist id="ab-hosts">{abOptions.hosts.map(x => <option key={x} value={x} />)}</datalist>
              <datalist id="ab-targets">{abOptions.targets.map(x => <option key={x} value={x} />)}</datalist>
              <datalist id="ab-isotypes">{abOptions.isotypes.map(x => <option key={x} value={x} />)}</datalist>
              <datalist id="ab-fluors">{abOptions.fluors.map(x => <option key={x} value={x} />)}</datalist>
              <p className="text-[10px] text-gray-400 font-manrope">{abBand ? `Emission band: ${emissionBandMeta[abBand].label} (${emissionBandMeta[abBand].hint}).` : 'The band (blue, green, red, far-red, ultra-far-red) is worked out from the fluorophore.'} Leave everything empty for a primary antibody.</p>
            </div>
          )}

          {canEditKind ? (
            <div className="rounded-xl border border-gray-200 p-3 space-y-3">
              <Field label="Kind">
                <select value={form.kind ?? 'item'} onChange={e => setForm({ ...form, kind: e.target.value as ReagentKind })} className={inputCls}>
                  {reagentKinds.map(k => <option key={k} value={k}>{reagentKindLabel[k]}</option>)}
                </select>
                <p className="text-[10px] text-gray-400 font-manrope mt-1">
                  {form.kind === 'stock' ? 'Concentrated / powder form. Only the responsibles below (plus admin, PI, lab manager) can take from it.'
                   : form.kind === 'working' ? 'Prepared from a stock and used by everybody. Linking the stock enables “Prepare working solution”.'
                   : 'Plain consumable (kits, plasticware, antibodies…). No access restriction.'}
                </p>
              </Field>
              <Field label={form.kind === 'stock' ? 'Responsible (1–2 people)' : 'Responsible (optional)'}>
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {(form.responsibleUserIds ?? []).map(id => {
                    const u = users.find(x => x.id === id);
                    return <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#102C53] text-white text-[11px] font-manrope">{u?.name || id}<button type="button" onClick={() => setForm({ ...form, responsibleUserIds: (form.responsibleUserIds ?? []).filter(x => x !== id) })} className="hover:text-red-200" aria-label="Remove"><X size={11} /></button></span>;
                  })}
                  {!(form.responsibleUserIds ?? []).length && (
                    <span className={`text-[11px] font-manrope ${form.kind === 'stock' ? 'text-amber-600' : 'text-gray-400'}`}>
                      {form.kind === 'stock' ? 'Nobody yet — only admin/PI/lab manager will be able to take from this stock.' : 'Nobody — only roles with “add reagents” can restock it.'}
                    </span>
                  )}
                </div>
                <select value="" onChange={e => { const id = e.target.value; if (id && !(form.responsibleUserIds ?? []).includes(id)) setForm({ ...form, responsibleUserIds: [...(form.responsibleUserIds ?? []), id] }); }} className={inputCls}>
                  <option value="">+ add a responsible…</option>
                  {activeUsers.filter(u => !(form.responsibleUserIds ?? []).includes(u.id)).map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                </select>
                <p className="text-[10px] text-gray-400 font-manrope mt-1">Responsibles may restock this item whatever their role (e.g. the PhD who keeps the PDMS kits){form.kind === 'stock' ? ', and are the only ones who may take from a stock' : ''}.</p>
              </Field>
              {form.kind !== 'stock' && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!form.openToStudents} onChange={e => setForm({ ...form, openToStudents: e.target.checked })} className="mt-0.5 rounded border-gray-300 text-[#102C53] focus:ring-[#4DC9FF]" />
                  <span className="text-xs font-manrope">
                    <span className="font-medium text-gray-700">Students may withdraw</span>
                    <span className="block text-[10px] text-gray-400">MSc students and members of other groups record their own withdrawals (PDMS, resins, consumables they use alone). Guests never can.</span>
                  </span>
                </label>
              )}
              {form.kind === 'working' && (
                <Field label="Prepared from stock">
                  <select value={form.derivedFromId || ''} onChange={e => setForm({ ...form, derivedFromId: e.target.value || undefined })} className={inputCls}>
                    <option value="">— not linked —</option>
                    {stockOptions.filter(x => x.id !== form.id).map(x => <option key={x.id} value={x.id}>{x.name}{x.catalogNumber ? ` · ${x.catalogNumber}` : ''}</option>)}
                  </select>
                </Field>
              )}
            </div>
          ) : (
            ((form.kind ?? 'item') !== 'item' || (form.responsibleUserIds ?? []).length > 0 || form.openToStudents) && (
              <p className="text-[11px] text-gray-400 font-manrope">
                {reagentKindLabel[form.kind ?? 'item']}{(form.responsibleUserIds ?? []).length ? ` — responsible: ${(form.responsibleUserIds ?? []).map(id => users.find(u => u.id === id)?.name || id).join(', ')}` : ''}{form.openToStudents ? ' — students may withdraw' : ''}. Classification and responsibles are set by the lab manager.
              </p>
            )
          )}
          <button onClick={save} disabled={!form.name} className={btnPrimary}><Save size={16} /> {editing ? 'Save' : 'Add Reagent'}</button>
        </div>
      </div>
    </div>
  );
}
