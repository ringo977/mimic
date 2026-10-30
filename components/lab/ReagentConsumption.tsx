'use client';

import { useMemo, useState } from 'react';
import { Download, TrendingDown } from 'lucide-react';
import type { HistoryLine } from '@/lib/history';
import { stockMovesFromHistory, weeklyBuckets, perPerson, movesToCSV } from '@/lib/reagent-consumption';
import type { Reagent } from '@/data/lab-data';

const RANGES = [
  { weeks: 12, label: '12 weeks' },
  { weeks: 26, label: '6 months' },
  { weeks: 52, label: '1 year' },
  { weeks: 0, label: 'All' },
];

const fmtDay = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const fmtQty = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 2 : 1);

/**
 * Withdrawals per week (bars) and per person (table), rebuilt from the
 * reagent's row history. Shown inside the History dialog of a reagent.
 */
export default function ReagentConsumption({ reagent, lines, canExport }: { reagent: Reagent; lines: HistoryLine[]; canExport: boolean }) {
  const [weeks, setWeeks] = useState(12);
  const moves = useMemo(() => stockMovesFromHistory(lines, reagent.currentStock), [lines, reagent.currentStock]);
  const buckets = useMemo(() => weeklyBuckets(moves, weeks), [moves, weeks]);
  const since = buckets[0]?.start;
  const people = useMemo(() => perPerson(moves, since), [moves, since]);
  const totalWithdrawn = buckets.reduce((s, b) => s + b.withdrawn, 0);
  const totalRestocked = buckets.reduce((s, b) => s + b.restocked, 0);
  const nWithdrawals = buckets.reduce((s, b) => s + b.nWithdrawals, 0);
  const unit = reagent.unit;

  const exportCSV = () => {
    const csv = movesToCSV(moves, reagent.name, unit);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `${reagent.name.replace(/[^\w-]+/g, '_')}-movements.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if (moves.length === 0) {
    return <p className="text-xs text-gray-400 font-manrope py-6 text-center">No stock movement recorded yet (history started on 28 Sep 2026).</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-[11px] font-manrope">
          {RANGES.map(r => (
            <button key={r.weeks} onClick={() => setWeeks(r.weeks)} className={`px-2.5 py-1 ${weeks === r.weeks ? 'bg-[#102C53] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}>{r.label}</button>
          ))}
        </div>
        <span className="text-[11px] text-gray-500 font-manrope">
          <TrendingDown size={11} className="inline -mt-0.5 text-amber-600" /> <span className="font-semibold text-gray-800">{fmtQty(totalWithdrawn)} {unit}</span> withdrawn in {nWithdrawals} movement{nWithdrawals === 1 ? '' : 's'}
          {totalRestocked > 0 && <> · <span className="text-emerald-700">+{fmtQty(totalRestocked)} {unit}</span> restocked</>}
        </span>
        {canExport && (
          <button onClick={exportCSV} className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 text-gray-600 text-[11px] font-manrope hover:border-[#102C53] hover:text-[#102C53]" title="All recorded movements of this reagent, as CSV">
            <Download size={11} /> CSV
          </button>
        )}
      </div>

      <WeeklyBars buckets={buckets} unit={unit} />

      <div>
        <h3 className="text-[11px] font-semibold text-gray-700 font-manrope mb-1">By person {since ? <span className="font-normal text-gray-400">· since {fmtDay(since)}</span> : null}</h3>
        {people.length === 0 ? (
          <p className="text-[11px] text-gray-400 font-manrope py-2">No withdrawal in this period.</p>
        ) : (
          <table className="w-full text-[11px] font-manrope">
            <thead>
              <tr className="text-gray-400 text-left">
                <th className="font-medium pb-1">Person</th>
                <th className="font-medium pb-1 text-right">Withdrawn</th>
                <th className="font-medium pb-1 text-right hidden sm:table-cell">Times</th>
                <th className="font-medium pb-1 text-right">Last</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {people.map(p => {
                const share = totalWithdrawn > 0 ? Math.round((p.withdrawn / totalWithdrawn) * 100) : 0;
                return (
                  <tr key={p.byId ?? p.by}>
                    <td className="py-1.5 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 truncate">{p.by}</span>
                        <span className="hidden sm:block flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[6rem]"><span className="block h-full bg-amber-400 rounded-full" style={{ width: `${share}%` }} /></span>
                      </div>
                    </td>
                    <td className="py-1.5 text-right tabular-nums text-gray-900 font-medium whitespace-nowrap">{fmtQty(p.withdrawn)} {unit} <span className="text-gray-400 font-normal">{share}%</span></td>
                    <td className="py-1.5 text-right tabular-nums text-gray-500 hidden sm:table-cell">{p.nWithdrawals}</td>
                    <td className="py-1.5 text-right text-gray-500 whitespace-nowrap">{fmtDay(new Date(p.lastAt))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-[10px] text-gray-400 font-manrope">Rebuilt from the recorded changes of the stock: each decrease is a withdrawal by whoever recorded it, each increase a restock. Quantities are in the current unit of the item ({unit}).</p>
    </div>
  );
}

function WeeklyBars({ buckets, unit }: { buckets: { start: Date; withdrawn: number; restocked: number; nWithdrawals: number; nRestocks: number }[]; unit: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560, H = 150, padL = 34, padB = 22, padT = 10;
  const n = buckets.length;
  const max = Math.max(1, ...buckets.map(b => b.withdrawn));
  const niceMax = niceCeil(max);
  const plotW = W - padL - 6, plotH = H - padT - padB;
  const slot = plotW / Math.max(1, n);
  const barW = Math.max(3, Math.min(28, slot * 0.68));
  const y = (v: number) => padT + plotH - (v / niceMax) * plotH;
  const labelEvery = n <= 13 ? 1 : n <= 27 ? 2 : n <= 53 ? 4 : Math.ceil(n / 13);
  const ticks = [0, niceMax / 2, niceMax];
  const h = hover !== null ? buckets[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none" role="img" aria-label={`Withdrawn ${unit} per week`}>
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={W - 6} y1={y(t)} y2={y(t)} stroke="#f1f5f9" strokeWidth={1} />
            <text x={padL - 5} y={y(t) + 3} fontSize={9} textAnchor="end" fill="#9ca3af" fontFamily="inherit">{fmtQty(t)}</text>
          </g>
        ))}
        {buckets.map((b, i) => {
          const x = padL + i * slot + (slot - barW) / 2;
          const bh = (b.withdrawn / niceMax) * plotH;
          return (
            <g key={b.start.getTime()} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill={hover === i ? '#f8fafc' : 'transparent'} />
              {b.withdrawn > 0 && <rect x={x} y={y(b.withdrawn)} width={barW} height={Math.max(1.5, bh)} rx={2} fill={hover === i ? '#d97706' : '#f59e0b'} />}
              {b.restocked > 0 && <polygon points={`${x + barW / 2 - 4},${padT + plotH + 3} ${x + barW / 2 + 4},${padT + plotH + 3} ${x + barW / 2},${padT + plotH - 4}`} fill="#10b981"><title>restocked +{fmtQty(b.restocked)} {unit}</title></polygon>}
              {i % labelEvery === 0 && <text x={padL + i * slot + slot / 2} y={H - 6} fontSize={9} textAnchor="middle" fill="#9ca3af" fontFamily="inherit">{fmtDay(b.start)}</text>}
            </g>
          );
        })}
      </svg>
      {h && (
        <div className="absolute top-0 right-0 bg-white/95 border border-gray-200 rounded-lg px-2 py-1 text-[10px] font-manrope text-gray-700 shadow-sm pointer-events-none">
          <span className="text-gray-400">week of {fmtDay(h.start)}</span> · <span className="font-semibold">{fmtQty(h.withdrawn)} {unit}</span> in {h.nWithdrawals} withdrawal{h.nWithdrawals === 1 ? '' : 's'}
          {h.restocked > 0 && <span className="text-emerald-700"> · +{fmtQty(h.restocked)} restocked</span>}
        </div>
      )}
      <div className="flex gap-3 text-[10px] text-gray-400 font-manrope mt-1">
        <span><span className="inline-block w-2 h-2 rounded-sm bg-amber-400 mr-1 align-middle" />withdrawn per week ({unit})</span>
        <span><span className="inline-block w-0 h-0 border-l-[4px] border-r-[4px] border-b-[7px] border-l-transparent border-r-transparent border-b-emerald-500 mr-1 align-middle" />restock</span>
      </div>
    </div>
  );
}

/** 1, 2, 5 × 10^k ceiling, for a clean axis. */
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / p;
  const m = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return m * p;
}
