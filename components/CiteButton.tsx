'use client';

import { useState, useRef, useEffect } from 'react';
import { Quote, Copy, Download, Check } from 'lucide-react';
import {
  Publication,
  formatAPA,
  formatIEEE,
  copyToClipboard,
  downloadBibTeX,
  downloadRIS,
} from '@/lib/citations';

interface CiteButtonProps {
  publication: Publication;
}

export default function CiteButton({ publication }: CiteButtonProps) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleCopy(format: 'APA' | 'IEEE') {
    const text = format === 'APA' ? formatAPA(publication) : formatIEEE(publication);
    const ok = await copyToClipboard(text);
    if (ok) setToast(`${format} copied!`);
    setOpen(false);
  }

  function handleDownload(format: 'bib' | 'ris') {
    if (format === 'bib') downloadBibTeX(publication);
    else downloadRIS(publication);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-polimi-bright-blue hover:text-polimi-alpha-blue transition-colors px-2.5 py-1.5 rounded-md hover:bg-polimi-bright-blue/5"
        title="Cite this publication"
      >
        <Quote size={15} />
        Cite
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-1 w-52 animate-in fade-in slide-in-from-top-1">
          <button
            onClick={() => handleCopy('APA')}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-polimi-blue-heritage transition-colors"
          >
            <Copy size={14} className="text-gray-400" />
            Copy (APA)
          </button>
          <button
            onClick={() => handleCopy('IEEE')}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-polimi-blue-heritage transition-colors"
          >
            <Copy size={14} className="text-gray-400" />
            Copy (IEEE)
          </button>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={() => handleDownload('bib')}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-polimi-blue-heritage transition-colors"
          >
            <Download size={14} className="text-gray-400" />
            Download BibTeX (.bib)
          </button>
          <button
            onClick={() => handleDownload('ris')}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-polimi-blue-heritage transition-colors"
          >
            <Download size={14} className="text-gray-400" />
            Download RIS (.ris)
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-polimi-blue-heritage text-white px-5 py-3 rounded-lg shadow-xl text-sm font-medium animate-in fade-in slide-in-from-bottom-2">
          <Check size={16} />
          {toast}
        </div>
      )}
    </div>
  );
}
