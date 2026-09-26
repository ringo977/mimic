'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void | Promise<void>;
  confirmLabel: string;
}

/**
 * Hook that provides a confirm dialog for destructive actions.
 * Returns [ConfirmDialogComponent, confirmFn].
 * Usage:
 *   const [ConfirmDialog, confirmDelete] = useConfirm();
 *   confirmDelete('Delete User?', 'This action cannot be undone.', () => removeUser(id));
 *   confirmDelete('Archive?', '...', () => archive(id), 'Archive');   // custom button label
 */
export function useConfirm(): [React.FC, (title: string, message: string, onConfirm: () => void | Promise<void>, confirmLabel?: string) => void] {
  const [state, setState] = useState<ConfirmState>({ open: false, title: '', message: '', onConfirm: () => {}, confirmLabel: 'Delete' });

  const confirm = useCallback((title: string, message: string, onConfirm: () => void | Promise<void>, confirmLabel = 'Delete') => {
    setState({ open: true, title, message, onConfirm, confirmLabel });
  }, []);

  const close = useCallback(() => setState(s => ({ ...s, open: false })), []);

  // Memoised on the dialog state so the component identity only changes when
  // the dialog itself changes (a new function on every render remounted it).
  const Dialog: React.FC = useCallback(() => {
    if (!state.open) return null;
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onClick={close} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 id="confirm-title" className="text-sm font-bold text-gray-900 font-manrope">{state.title}</h3>
              <p className="text-xs text-gray-500 font-manrope mt-1">{state.message}</p>
            </div>
            <button onClick={close} aria-label="Close" className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"><X size={16} /></button>
          </div>
          <div className="flex gap-2">
            <button onClick={close}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold font-manrope bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button onClick={() => { void state.onConfirm(); close(); }}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold font-manrope bg-red-500 text-white hover:bg-red-600 transition-colors">
              {state.confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  }, [state, close]);

  return [Dialog, confirm];
}
