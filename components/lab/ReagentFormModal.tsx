'use client';

import { useMemo, useState } from 'react';
import { X, Save } from 'lucide-react';
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

  const save = () => {
    if (!form.name) return;
    // Sanitise numbers: no negatives; max 0 = no limit, otherwise ≥ stock
    // (the server rejects restocks above the maximum).
    const currentStock = Math.max(0, Number(form.currentStock) || 0);
    const rawMax = Math.max(0, Number(form.maxStock) || 0);
    const maxStock = rawMax > 0 ? Math.max(rawMax, currentStock) : 0;
    const kind: ReagentKind = form.kind ?? 'item';
    const clean: Reagent = {
      ...form, currentStock, maxStock, alertThreshold: Math.max(0, Number(form.alertThreshold) || 0),
      kind, derivedFromId: kind === 'working' ? form.derivedFromId : undefined, responsibleUserIds: kind === 'stock' ? (form.responsibleUserIds ?? []) : [],
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
              {form.kind === 'stock' && (
                <Field label="Responsible (1–2 people)">
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {(form.responsibleUserIds ?? []).map(id => {
                      const u = users.find(x => x.id === id);
                      return <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#102C53] text-white text-[11px] font-manrope">{u?.name || id}<button type="button" onClick={() => setForm({ ...form, responsibleUserIds: (form.responsibleUserIds ?? []).filter(x => x !== id) })} className="hover:text-red-200" aria-label="Remove"><X size={11} /></button></span>;
                    })}
                    {!(form.responsibleUserIds ?? []).length && <span className="text-[11px] text-amber-600 font-manrope">Nobody yet — only admin/PI/lab manager will be able to take from this stock.</span>}
                  </div>
                  <select value="" onChange={e => { const id = e.target.value; if (id && !(form.responsibleUserIds ?? []).includes(id)) setForm({ ...form, responsibleUserIds: [...(form.responsibleUserIds ?? []), id] }); }} className={inputCls}>
                    <option value="">+ add a responsible…</option>
                    {activeUsers.filter(u => !(form.responsibleUserIds ?? []).includes(u.id)).map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                  </select>
                </Field>
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
            (form.kind ?? 'item') !== 'item' && (
              <p className="text-[11px] text-gray-400 font-manrope">
                {reagentKindLabel[form.kind ?? 'item']}{form.kind === 'stock' && (form.responsibleUserIds ?? []).length ? ` — responsible: ${(form.responsibleUserIds ?? []).map(id => users.find(u => u.id === id)?.name || id).join(', ')}` : ''}. Classification and responsibles are set by the lab manager.
              </p>
            )
          )}
          <button onClick={save} disabled={!form.name} className={btnPrimary}><Save size={16} /> {editing ? 'Save' : 'Add Reagent'}</button>
        </div>
      </div>
    </div>
  );
}
