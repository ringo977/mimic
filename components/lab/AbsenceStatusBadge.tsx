'use client';

import type { Absence } from '@/data/lab-data';

// Status pill for an absence request (Absences page and Home notices).
export default function AbsenceStatusBadge({ status }: { status: Absence['status'] }) {
  const map: Record<Absence['status'], { label: string; cls: string }> = {
    pending:       { label: 'Awaiting approval', cls: 'bg-amber-50 text-amber-700' },
    auto_approved: { label: 'Auto-approved',     cls: 'bg-green-50 text-green-700' },
    approved:      { label: 'Approved',          cls: 'bg-green-50 text-green-700' },
    rejected:      { label: 'Rejected',          cls: 'bg-red-50 text-red-600' },
    cancelled:     { label: 'Cancelled',         cls: 'bg-gray-100 text-gray-500' },
  };
  const m = map[status];
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-manrope whitespace-nowrap ${m.cls}`}>{m.label}</span>;
}
