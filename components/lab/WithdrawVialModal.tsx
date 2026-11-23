'use client';

import { useState } from 'react';
import { Trash2, X } from 'lucide-react';
import { useDialogA11y } from '@/components/ui/useDialogA11y';
import { CryoVial, formatCells, formatDate } from '@/data/lab-data';

/** Common reasons, one click away (the field stays free text). */
const QUICK_REASONS = ['Thawed for an experiment', 'Thawed for expansion', 'Contaminated', 'Discarded', 'Given to another lab'];

/**
 * Confirmation shown before a vial leaves cryo storage, with an optional
 * note saying why. The note goes into the activity log line of the
 * withdrawal ("Withdrawn vials" on the Cryo page, Activity Log), so the
 * story of a vial can still be read once it is gone.
 */
export default function WithdrawVialModal({ vial, where, onCancel, onConfirm }: {
  vial: CryoVial;
  /** Storage unit and position, as shown on the page. */
  where: string;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  const panelRef = useDialogA11y(true, onCancel);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="withdraw-vial-title" tabIndex={-1}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 id="withdraw-vial-title" className="text-sm font-bold text-gray-900 font-manrope">Withdraw vial?</h3>
            <p className="text-xs text-gray-500 font-manrope mt-1">
              <span className="font-semibold text-gray-700">{vial.cellLine} P{vial.passage}</span>{vial.cells ? ` · ${formatCells(vial.cells)} cells` : ''} will be removed from storage.
            </p>
            <p className="text-[11px] text-gray-400 font-manrope mt-0.5">{where} · frozen by {vial.userName} on {formatDate(vial.date)}</p>
          </div>
          <button onClick={onCancel} aria-label="Close" className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"><X size={16} /></button>
        </div>

        <label htmlFor="withdraw-vial-reason" className="block text-xs font-medium text-gray-700 mb-1 font-manrope">
          Note — why is it removed? <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="withdraw-vial-reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="e.g. thawed for the barrier experiment, contaminated, discarded…"
          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none resize-none"
        />
        <div className="flex flex-wrap gap-1 mt-1.5">
          {QUICK_REASONS.map(r => (
            <button key={r} type="button" onClick={() => setReason(r)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-manrope transition-colors ${reason === r ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {r}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-gray-400 font-manrope mt-2">Kept with the withdrawal in the history of withdrawn vials.</p>

        <div className="flex gap-2 mt-4">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold font-manrope bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
            Cancel
          </button>
          <button onClick={() => onConfirm(reason.trim().replace(/\s+/g, ' '))}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold font-manrope bg-red-500 text-white hover:bg-red-600 transition-colors">
            Withdraw
          </button>
        </div>
      </div>
    </div>
  );
}
