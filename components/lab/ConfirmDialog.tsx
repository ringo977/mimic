'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  destructive?: boolean;
}

/**
 * Hook that provides a confirm dialog for destructive actions.
 * Returns [ConfirmDialogComponent, confirmFn].
 * Usage:
 *   const [ConfirmDialog, confirmDelete] = useConfirm();
 *   confirmDelete('Delete User?', 'This action cannot be undone.', () => removeUser(id));
 */
export function useConfirm(): [React.FC, (title: string, message: string, onConfirm: () => void) => void] {
  const [state, setState] = useState<ConfirmState>({ open: false, title: '', message: '', onConfirm: () => {} });

  const confirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setState({ open: true, title, message, onConfirm, destructive: true });
  }, []);

  const close = useCallback(() => setState(s => ({ ...s, open: false })), []);

  const Dialog: React.FC = () => {
    if (!state.open) return null;
    return (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4" onClick={close}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95" onClick={e => e.stopPropagation()}>
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-gray-900 font-manrope">{state.title}</h3>
              <p className="text-xs text-gray-500 font-manrope mt-1">{state.message}</p>
            </div>
            <button onClick={close} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"><X size={16} /></button>
          </div>
          <div className="flex gap-2">
            <button onClick={close}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold font-manrope bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button onClick={() => { state.onConfirm(); close(); }}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold font-manrope bg-red-500 text-white hover:bg-red-600 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

  return [Dialog, confirm];
}
