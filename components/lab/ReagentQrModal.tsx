'use client';

import { useEffect, useState } from 'react';
import { QrCode, Printer, Download, X } from 'lucide-react';
import { useDialogA11y } from '@/components/ui/useDialogA11y';
import { reagentDeepLinkUrl } from '@/lib/lab-deeplink';
import type { Reagent } from '@/data/lab-data';

/**
 * Printable label with the QR code of a reagent: scanning it opens the Lab
 * Manager on that item with the Withdraw dialog ready. Generated in the
 * browser (qrcode package), nothing leaves the site.
 */
export default function ReagentQrModal({ reagent, place, onClose }: { reagent: Reagent; place: string; onClose: () => void }) {
  const ref = useDialogA11y(true, onClose);
  const url = reagentDeepLinkUrl(reagent.id);
  const [png, setPng] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    import('qrcode')
      .then(QR => QR.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 640, color: { dark: '#102C53', light: '#ffffff' } }))
      .then(d => { if (alive) setPng(d); })
      .catch(e => { if (alive) setError(e instanceof Error ? e.message : String(e)); });
    return () => { alive = false; };
  }, [url]);

  // Print only the label (app/globals.css, @media print)
  useEffect(() => {
    document.body.classList.add('qr-printing');
    return () => document.body.classList.remove('qr-printing');
  }, []);

  const fileBase = reagent.name.replace(/[^\w-]+/g, '_');

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
      <div ref={ref} role="dialog" aria-modal="true" aria-label={`QR code of ${reagent.name}`} tabIndex={-1} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 outline-none">
        <div className="flex items-center justify-between mb-3 print:hidden">
          <h2 className="text-sm font-bold text-gray-900 font-manrope flex items-center gap-2"><QrCode size={15} /> QR label</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>

        {/* The label itself: what gets printed */}
        <div className="qr-label border border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center text-center bg-white">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-manrope">MiMic Lab · Reagent stock</p>
          <p className="text-base font-bold text-gray-900 font-manrope mt-1 leading-tight">{reagent.name}</p>
          {place && <p className="text-[11px] text-gray-500 font-manrope mt-0.5">{place}</p>}
          <div className="w-44 h-44 my-3 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL generated client side */}
            {png ? <img src={png} alt="" className="w-44 h-44" /> : error ? <span className="text-xs text-red-600 font-manrope">{error}</span> : <span className="text-xs text-gray-400 font-manrope">Generating…</span>}
          </div>
          <p className="text-xs font-semibold text-[#102C53] font-manrope">Scan to record your withdrawal</p>
          <p className="text-[10px] text-gray-400 font-manrope mt-1 break-all">{url}</p>
        </div>

        <div className="flex gap-2 mt-4 print:hidden">
          <button onClick={() => window.print()} disabled={!png} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#102C53] text-white text-xs font-medium font-manrope hover:bg-[#1a3d6e] disabled:opacity-50">
            <Printer size={13} /> Print label
          </button>
          <a href={png ?? undefined} download={`qr-${fileBase}.png`} aria-disabled={!png}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-200 text-gray-700 text-xs font-medium font-manrope hover:border-[#102C53] hover:text-[#102C53] ${png ? '' : 'opacity-50 pointer-events-none'}`}>
            <Download size={13} /> PNG
          </a>
        </div>
        <p className="text-[10px] text-gray-400 font-manrope mt-3 print:hidden">Whoever scans it logs in (or is already logged in) and lands on this item with the Withdraw dialog open. Only people allowed to take from it can confirm.</p>
      </div>
    </div>
  );
}
