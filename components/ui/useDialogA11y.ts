'use client';

import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Open dialogs, innermost last. Only the topmost one reacts to Escape/Tab:
// dialogs do stack (e.g. ConfirmDialog over the admin maintenance Modal),
// and every instance listens on `document`, so without this an Escape in
// the confirm would also close the form underneath and the outer focus
// trap would pull Shift+Tab out of the inner dialog.
const openDialogs: HTMLElement[] = [];

/**
 * Accessibility for a modal dialog rendered while `open` is true.
 * Attach the returned ref to the dialog panel (give it tabIndex={-1},
 * role="dialog" and aria-modal="true"). The hook then:
 *   - moves focus into the dialog (first focusable element, else the panel)
 *     and restores it to the previously focused element on close;
 *   - closes on Escape;
 *   - traps Tab / Shift+Tab inside the panel;
 *   - locks body scroll while open.
 * `onClose` is read through a ref so an inline arrow does not re-run the
 * effect (and steal focus) on every render.
 */
export function useDialogA11y<T extends HTMLElement = HTMLDivElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const panel = ref.current;
    if (!panel) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null);
    openDialogs.push(panel);
    const isTopmost = () => openDialogs[openDialogs.length - 1] === panel;

    // Defer so the panel exists after the render that opened it.
    const t = window.setTimeout(() => { (focusables()[0] ?? panel)?.focus(); }, 0);

    const onKey = (e: KeyboardEvent) => {
      if (!isTopmost()) return;
      if (e.key === 'Escape') { e.stopPropagation(); onCloseRef.current(); return; }
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (els.length === 0) { e.preventDefault(); panel.focus(); return; }
      const idx = els.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && idx <= 0) { e.preventDefault(); els[els.length - 1].focus(); }
      else if (!e.shiftKey && idx === els.length - 1) { e.preventDefault(); els[0].focus(); }
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(t);
      const i = openDialogs.lastIndexOf(panel);
      if (i !== -1) openDialogs.splice(i, 1);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [open]);

  return ref;
}
