'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { History, Trash2, RotateCcw, Clock, Camera, Download, Loader2, AlertCircle, CheckCircle2, Search, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useDialogA11y } from '@/components/ui/useDialogA11y';
import { useConfirm } from './ConfirmDialog';
import { restoreManualFile } from '@/lib/supabase-storage';
import {
  HistoryLine, AsOfRow, SnapshotRun, HISTORY_TABLES, HISTORY_TABLE_LABELS, historyRowLabel, describeChange,
  fetchHistory, fetchRecentlyDeleted, restoreHistoryVersion, fetchTableAsOf, restoreTableAsOf, fetchHistorySince,
  fetchSnapshotRuns, takeSnapshotNow, snapshotAsBackupJSON,
} from '@/lib/history';

const fmtWhen = (iso: string) => new Date(iso).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
const tableLabel = (t: string) => HISTORY_TABLE_LABELS[t] || t;
const opBadge: Record<string, string> = {
  INSERT: 'bg-green-50 text-green-700', UPDATE: 'bg-blue-50 text-blue-700', DELETE: 'bg-red-50 text-red-700',
};

type Status = { type: 'idle' | 'loading' | 'success' | 'error'; message: string };

// ============================================================
// Admin → Backup: history, recently deleted, point in time, snapshots
// ============================================================
export default function HistoryPanel() {
  const [tab, setTab] = useState<'deleted' | 'history' | 'pit' | 'snapshots'>('deleted');
  const [status, setStatus] = useState<Status>({ type: 'idle', message: '' });
  // Stable identity: `show` is a dependency of the tabs' load callbacks. A
  // fresh function on every render made an error re-trigger the load, which
  // failed again, forever (reviewer finding, 28/09).
  const show = useCallback((type: Status['type'], message: string) => {
    setStatus({ type, message });
    if (type === 'success') setTimeout(() => setStatus({ type: 'idle', message: '' }), 6000);
  }, []);

  const cardCls = 'bg-white rounded-xl p-5 shadow-sm border border-gray-100';
  const tabs = [
    { id: 'deleted' as const, label: 'Recently deleted', icon: Trash2 },
    { id: 'history' as const, label: 'Change history', icon: History },
    { id: 'pit' as const, label: 'Point in time', icon: Clock },
    { id: 'snapshots' as const, label: 'Daily snapshots', icon: Camera },
  ];

  return (
    <div className={cardCls}>
      <div className="flex items-center gap-2 mb-1">
        <History size={18} className="text-[#102C53]" />
        <h2 className="text-sm font-bold text-gray-900 font-manrope">History &amp; Recovery</h2>
      </div>
      <p className="text-xs text-gray-500 font-manrope mb-4">
        Every change to the lab data is recorded with who and when (kept 400 days). Deleted rows can be brought back, any row can go back to a previous version, and a whole table can be restored as it was at a given instant. A snapshot of the entire database is taken every night (kept 30 days). Restores are themselves recorded, so they can be undone.
      </p>

      <div className="flex flex-wrap gap-1 mb-4 border-b border-gray-100">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium font-manrope border-b-2 -mb-px transition-colors ${tab === t.id ? 'border-[#102C53] text-[#102C53]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {status.type !== 'idle' && (
        <div className={`flex items-start gap-2 p-3 rounded-lg text-xs font-manrope mb-4 ${status.type === 'loading' ? 'bg-blue-50 text-blue-800' : status.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {status.type === 'loading' && <Loader2 size={14} className="animate-spin shrink-0 mt-0.5" />}
          {status.type === 'success' && <CheckCircle2 size={14} className="shrink-0 mt-0.5" />}
          {status.type === 'error' && <AlertCircle size={14} className="shrink-0 mt-0.5" />}
          <span className="whitespace-pre-wrap">{status.message}</span>
          <button onClick={() => setStatus({ type: 'idle', message: '' })} className="ml-auto text-current/60 hover:text-current"><X size={12} /></button>
        </div>
      )}

      {tab === 'deleted' && <RecentlyDeleted show={show} />}
      {tab === 'history' && <ChangeHistory show={show} />}
      {tab === 'pit' && <PointInTime show={show} />}
      {tab === 'snapshots' && <Snapshots show={show} />}
    </div>
  );
}

// ------------------------------------------------------------
function TableSelect({ value, onChange, allowAll }: { value: string; onChange: (v: string) => void; allowAll?: boolean }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg font-manrope bg-white">
      {allowAll && <option value="">All tables</option>}
      {HISTORY_TABLES.map(t => <option key={t} value={t}>{tableLabel(t)}</option>)}
    </select>
  );
}

function RecentlyDeleted({ show }: { show: (t: Status['type'], m: string) => void }) {
  const [table, setTable] = useState('');
  const [lines, setLines] = useState<HistoryLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [ConfirmDialog, confirm] = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetchRecentlyDeleted(30, table || undefined);
    setLoading(false);
    if (r.error) show('error', `Could not load: ${r.error}`); else setLines(r.lines);
  }, [table, show]);
  useEffect(() => { load(); }, [load]);

  const restore = (l: HistoryLine) => {
    const label = historyRowLabel(l.tableName, l.oldRow, l.rowId);
    confirm('Restore this row?', `${tableLabel(l.tableName)}: "${label}" will be re-created exactly as it was when ${l.changedByName} deleted it on ${fmtWhen(l.changedAt)}.`, async () => {
      const r = await restoreHistoryVersion(l.id);
      if (r.ok) {
        const pdf = l.tableName === 'manuals' ? await restoreManualFile(l.rowId) : null;
        show('success', `Restored "${label}".${pdf === false ? ' Its PDF was not found in the trash: upload it again.' : ''} Reload the page to see it in the app.`); load();
      }
      else show('error', `Restore refused: ${r.error}`);
    }, 'Restore');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <TableSelect value={table} onChange={setTable} allowAll />
        <span className="text-[11px] text-gray-400 font-manrope">Last 30 days · {lines.length} row{lines.length === 1 ? '' : 's'}</span>
        {loading && <Loader2 size={13} className="animate-spin text-gray-400" />}
      </div>
      {lines.length === 0 && !loading && <p className="text-xs text-gray-400 font-manrope py-4 text-center">Nothing deleted in the last 30 days{table ? ` in ${tableLabel(table)}` : ''}.</p>}
      <ul className="divide-y divide-gray-50">
        {lines.map(l => (
          <li key={l.id} className="flex items-center gap-3 py-2 text-xs font-manrope">
            <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] shrink-0 w-24 text-center truncate">{tableLabel(l.tableName)}</span>
            <span className="flex-1 min-w-0">
              <span className="text-gray-900 font-medium truncate block">{historyRowLabel(l.tableName, l.oldRow, l.rowId)}</span>
              <span className="text-gray-400">deleted by {l.changedByName} · {fmtWhen(l.changedAt)}</span>
            </span>
            <button onClick={() => restore(l)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#102C53] text-white text-[11px] hover:bg-[#102C53]/90 shrink-0"><RotateCcw size={12} /> Restore</button>
          </li>
        ))}
      </ul>
      <ConfirmDialog />
    </div>
  );
}

// ------------------------------------------------------------
function ChangeHistory({ show }: { show: (t: Status['type'], m: string) => void }) {
  const [table, setTable] = useState('');
  const [search, setSearch] = useState('');
  const [days, setDays] = useState(7);
  const [lines, setLines] = useState<HistoryLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [ConfirmDialog, confirm] = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetchHistory({ table: table || undefined, days, limit: 300, search: search || undefined });
    setLoading(false);
    if (r.error) show('error', `Could not load: ${r.error}`); else setLines(r.lines);
  }, [table, days, search, show]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  // Next known state of the same row, to show "old → new" for an update
  const nextOf = (l: HistoryLine): Record<string, unknown> | null => {
    const later = lines.filter(x => x.tableName === l.tableName && x.rowId === l.rowId && x.id > l.id && x.op !== 'INSERT').sort((a, b) => a.id - b.id)[0];
    return later?.oldRow ?? null;
  };

  const revert = (l: HistoryLine) => {
    const label = historyRowLabel(l.tableName, l.oldRow, l.rowId);
    confirm('Go back to this version?', `${tableLabel(l.tableName)}: "${label}" will be put back as it was BEFORE the change made by ${l.changedByName} on ${fmtWhen(l.changedAt)}. Any later change to this row is undone as well.`, async () => {
      const r = await restoreHistoryVersion(l.id);
      if (r.ok) {
        if (l.tableName === 'manuals' && r.result === 'inserted') await restoreManualFile(l.rowId);
        show('success', `"${label}" reverted (${r.result}). Reload the page to see it in the app.`); load();
      }
      else show('error', `Revert refused: ${r.error}`);
    }, 'Revert');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <TableSelect value={table} onChange={setTable} allowAll />
        <select value={days} onChange={e => setDays(Number(e.target.value))} className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg font-manrope bg-white">
          <option value={1}>Last 24 h</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={400}>Everything</option>
        </select>
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="name, person…" className="pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg font-manrope w-44" />
        </div>
        <span className="text-[11px] text-gray-400 font-manrope">{lines.length} change{lines.length === 1 ? '' : 's'}{lines.length >= 300 ? ' (showing the latest 300)' : ''}</span>
        {loading && <Loader2 size={13} className="animate-spin text-gray-400" />}
      </div>
      {lines.length === 0 && !loading && <p className="text-xs text-gray-400 font-manrope py-4 text-center">No changes in this period.</p>}
      <ul className="divide-y divide-gray-50">
        {lines.map(l => {
          const isOpen = open === l.id;
          const changes = l.op === 'UPDATE' ? describeChange(l, nextOf(l)) : [];
          return (
            <li key={l.id} className="py-2 text-xs font-manrope">
              <div className="flex items-center gap-2">
                <button onClick={() => setOpen(isOpen ? null : l.id)} className="text-gray-400 hover:text-gray-700" aria-label={isOpen ? 'Collapse' : 'Expand'}>
                  {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${opBadge[l.op]}`}>{l.op === 'INSERT' ? 'created' : l.op === 'UPDATE' ? 'changed' : 'deleted'}</span>
                <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] shrink-0">{tableLabel(l.tableName)}</span>
                <span className="flex-1 min-w-0 truncate text-gray-900 font-medium">{historyRowLabel(l.tableName, l.oldRow, l.rowId)}</span>
                {l.op === 'UPDATE' && changes.length > 0 && <span className="text-gray-400 truncate hidden md:inline max-w-[14rem]">{changes.map(c => c.col).join(', ')}</span>}
                <span className="text-gray-400 shrink-0">{l.changedByName} · {fmtWhen(l.changedAt)}</span>
                {l.op !== 'INSERT' && (
                  <button onClick={() => revert(l)} title={l.op === 'DELETE' ? 'Restore the deleted row' : 'Put the row back as it was before this change'}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg border border-gray-200 text-gray-600 text-[11px] hover:border-[#102C53] hover:text-[#102C53] shrink-0">
                    <RotateCcw size={11} /> {l.op === 'DELETE' ? 'Restore' : 'Revert'}
                  </button>
                )}
              </div>
              {isOpen && (
                <div className="ml-7 mt-1.5 bg-gray-50 rounded-lg p-2.5 text-[11px]">
                  {l.op === 'UPDATE' && changes.length > 0 && (
                    <table className="w-full"><tbody>
                      {changes.map(c => (
                        <tr key={c.col}><td className="pr-3 text-gray-500 align-top whitespace-nowrap">{c.col}</td><td className="text-red-700 line-through break-all align-top pr-2">{c.from}</td><td className="text-green-700 break-all align-top">{c.to}</td></tr>
                      ))}
                    </tbody></table>
                  )}
                  {l.op === 'DELETE' && l.oldRow && (
                    <pre className="whitespace-pre-wrap break-all text-gray-600">{JSON.stringify(l.oldRow, null, 1)}</pre>
                  )}
                  {l.op === 'INSERT' && <span className="text-gray-500">Row created (id {l.rowId}).</span>}
                  {l.restoredAt && <div className="mt-1 text-green-700">This version was restored on {fmtWhen(l.restoredAt)}.</div>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <ConfirmDialog />
    </div>
  );
}

// ------------------------------------------------------------
function PointInTime({ show }: { show: (t: Status['type'], m: string) => void }) {
  const [table, setTable] = useState<string>('cryo_vials');
  // Default: one hour ago, in local time (datetime-local has no zone)
  const [when, setWhen] = useState(() => {
    const d = new Date(Date.now() - 3600000); const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [rows, setRows] = useState<AsOfRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [since, setSince] = useState<Date | null>(null);   // history activation: the earliest instant allowed
  const [ConfirmDialog, confirm] = useConfirm();

  useEffect(() => {
    let alive = true;
    fetchHistorySince().then(r => { if (alive && r.since) setSince(new Date(r.since)); });
    return () => { alive = false; };
  }, []);
  const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const tooEarly = !!(since && when && new Date(when) < since);

  const preview = async () => {
    if (!when || tooEarly) return;
    setLoading(true); setRows(null);
    const r = await fetchTableAsOf(table, new Date(when).toISOString());
    setLoading(false);
    if (r.error) show('error', `Could not compute: ${r.error}`); else setRows(r.rows);
  };

  const counts = useMemo(() => {
    const c = { unchanged: 0, changed: 0, deleted: 0, added: 0 };
    rows?.forEach(r => { c[r.status]++; });
    return c;
  }, [rows]);
  const diffRows = useMemo(() => (rows || []).filter(r => r.status !== 'unchanged'), [rows]);

  const restore = () => {
    const ts = new Date(when);
    confirm(`Restore ${tableLabel(table)} as of ${fmtWhen(ts.toISOString())}?`,
      `${counts.deleted} deleted row${counts.deleted === 1 ? '' : 's'} will be re-created, ${counts.changed} changed row${counts.changed === 1 ? '' : 's'} reverted and ${counts.added} row${counts.added === 1 ? '' : 's'} added since then REMOVED. All in one step: if a single row cannot be restored, nothing changes. This restore is recorded and can itself be undone.`,
      async () => {
        const r = await restoreTableAsOf(table, ts.toISOString());
        if (r.ok && r.counts) { show('success', `${tableLabel(table)} restored: ${r.counts.restored} re-created, ${r.counts.reverted} reverted, ${r.counts.removed} removed. Reload the page.`); setRows(null); }
        else show('error', `Restore refused: ${r.error}`);
      }, 'Restore table');
  };

  const statusCls: Record<AsOfRow['status'], string> = { unchanged: '', changed: 'bg-blue-50 text-blue-700', deleted: 'bg-red-50 text-red-700', added: 'bg-amber-50 text-amber-700' };
  const statusText: Record<AsOfRow['status'], string> = { unchanged: '', changed: 'will be reverted', deleted: 'will be re-created', added: 'will be removed' };

  return (
    <div>
      <p className="text-xs text-gray-500 font-manrope mb-3">See a table as it was at a given moment and, if needed, put it back that way. People (<em>lab_users</em>) can only be restored one row at a time from the history.</p>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <TableSelect value={table} onChange={t => { setTable(t); setRows(null); }} />
        <input type="datetime-local" value={when} min={since ? toLocalInput(since) : undefined} max={toLocalInput(new Date())}
          onChange={e => { setWhen(e.target.value); setRows(null); }}
          className={`px-2.5 py-1.5 text-xs border rounded-lg font-manrope ${tooEarly ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
        <button onClick={preview} disabled={loading || !when || tooEarly} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#102C53] text-white text-xs font-manrope hover:bg-[#102C53]/90 disabled:opacity-50">
          {loading ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />} Preview
        </button>
        {since && (
          <span className={`text-[11px] font-manrope ${tooEarly ? 'text-red-600' : 'text-gray-400'}`}>
            {tooEarly ? 'Before the history started: ' : 'History starts '}{fmtWhen(since.toISOString())}
          </span>
        )}
      </div>
      {rows && (
        <>
          <div className="flex flex-wrap gap-2 text-[11px] font-manrope mb-3">
            <span className="px-2 py-1 rounded bg-gray-100 text-gray-700">{counts.unchanged} unchanged</span>
            <span className="px-2 py-1 rounded bg-blue-50 text-blue-700">{counts.changed} changed</span>
            <span className="px-2 py-1 rounded bg-red-50 text-red-700">{counts.deleted} deleted since</span>
            <span className="px-2 py-1 rounded bg-amber-50 text-amber-700">{counts.added} added since</span>
            {table !== 'lab_users' && diffRows.length > 0 && (
              <button onClick={restore} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs hover:bg-red-700"><RotateCcw size={12} /> Restore table to this moment</button>
            )}
          </div>
          {diffRows.length === 0 && <p className="text-xs text-gray-400 font-manrope py-3 text-center">The table is identical to how it was at that moment.</p>}
          <ul className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {diffRows.map(r => (
              <li key={r.rowId} className="flex items-center gap-2 py-1.5 text-xs font-manrope">
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold shrink-0 ${statusCls[r.status]}`}>{r.status}</span>
                <span className="flex-1 min-w-0 truncate text-gray-900">{historyRowLabel(table, r.atTs || r.nowRow, r.rowId)}</span>
                <span className="text-gray-400 shrink-0">{statusText[r.status]}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <ConfirmDialog />
    </div>
  );
}

// ------------------------------------------------------------
function Snapshots({ show }: { show: (t: Status['type'], m: string) => void }) {
  const [runs, setRuns] = useState<SnapshotRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetchSnapshotRuns();
    setLoading(false);
    if (r.error) show('error', `Could not load snapshots: ${r.error}`); else setRuns(r.runs);
  }, [show]);
  useEffect(() => { load(); }, [load]);

  const snapNow = async () => {
    setBusy('now');
    const r = await takeSnapshotNow();
    setBusy(null);
    if (r.ok) { show('success', 'Snapshot taken.'); load(); } else show('error', `Snapshot failed: ${r.error}`);
  };

  const download = async (run: SnapshotRun) => {
    setBusy(run.takenAt);
    const r = await snapshotAsBackupJSON(run.takenAt);
    setBusy(null);
    if (r.error || !r.json) { show('error', `Could not build the backup: ${r.error}`); return; }
    const { downloadText } = await import('@/lib/backup');
    const d = new Date(run.takenAt); const pad = (n: number) => String(n).padStart(2, '0');
    downloadText(r.json, `mimic-snapshot-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.json`);
    show('success', 'Snapshot downloaded as a backup JSON. Keep it outside Supabase; it can be loaded with "Restore Database".');
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <p className="text-xs text-gray-500 font-manrope flex-1">Taken every night at 02:30 UTC, kept 30 days. To restore one, download it and use <em>Restore Database (JSON)</em> above. Download one a week and keep it outside Supabase: the snapshots live in the same database they protect.</p>
        <button onClick={snapNow} disabled={busy === 'now'} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#102C53] text-white text-xs font-manrope hover:bg-[#102C53]/90 disabled:opacity-50">
          {busy === 'now' ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />} Snapshot now
        </button>
      </div>
      {runs.length === 0 && !loading && <p className="text-xs text-gray-400 font-manrope py-4 text-center">No snapshot yet. If it stays empty tomorrow, pg_cron is not enabled (Supabase → Database → Extensions).</p>}
      <ul className="divide-y divide-gray-50">
        {runs.map(run => (
          <li key={run.takenAt} className="flex items-center gap-3 py-2 text-xs font-manrope">
            <Camera size={13} className="text-gray-400 shrink-0" />
            <span className="flex-1 min-w-0">
              <span className="text-gray-900 font-medium">{fmtWhen(run.takenAt)}</span>
              <span className="text-gray-400"> · {run.totalRows.toLocaleString()} rows in {run.tables.length} tables</span>
              <span className="text-gray-400 hidden md:inline"> · {run.tables.filter(t => ['reagents', 'cryo_vials', 'bookings', 'log_entries'].includes(t.tableName)).map(t => `${tableLabel(t.tableName).toLowerCase()} ${t.nRows}`).join(', ')}</span>
            </span>
            <button onClick={() => download(run)} disabled={busy === run.takenAt} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-[11px] hover:border-[#102C53] hover:text-[#102C53] disabled:opacity-50 shrink-0">
              {busy === run.takenAt ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} Download as backup
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================
// History of ONE row (vial, reagent…) — for members, from the item pages
// ============================================================
export function RowHistoryModal({ table, rowId, label, onClose }: { table: string; rowId: string; label: string; onClose: () => void }) {
  const ref = useDialogA11y(true, onClose);
  const [lines, setLines] = useState<HistoryLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory({ table, rowId, limit: 100 }).then(r => { if (r.error) setError(r.error); else setLines(r.lines); });
  }, [table, rowId]);

  const nextOf = (l: HistoryLine) => lines?.filter(x => x.id > l.id && x.op !== 'INSERT').sort((a, b) => a.id - b.id)[0]?.oldRow ?? null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
      <div ref={ref} role="dialog" aria-modal="true" aria-label={`History of ${label}`} tabIndex={-1} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto outline-none">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900 font-manrope flex items-center gap-2"><History size={15} /> History · <span className="font-normal text-gray-600 truncate">{label}</span></h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={16} /></button>
        </div>
        {error && <p className="text-xs text-red-600 font-manrope">{error}</p>}
        {!lines && !error && <Loader2 size={16} className="animate-spin text-gray-400 mx-auto my-6" />}
        {lines && lines.length === 0 && <p className="text-xs text-gray-400 font-manrope py-4 text-center">No recorded change yet (history started on 28 Sep 2026).</p>}
        {lines && lines.length > 0 && (
          <ol className="relative border-l border-gray-200 ml-2 space-y-3">
            {lines.map(l => {
              const changes = describeChange(l, nextOf(l));
              return (
                <li key={l.id} className="ml-4 text-xs font-manrope">
                  <span className={`absolute -left-[5px] mt-1 w-2.5 h-2.5 rounded-full ${l.op === 'DELETE' ? 'bg-red-400' : l.op === 'INSERT' ? 'bg-green-400' : 'bg-blue-400'}`} />
                  <div className="text-gray-900"><span className="font-medium">{l.changedByName}</span> {l.op === 'INSERT' ? 'created it' : l.op === 'DELETE' ? 'deleted it' : 'changed it'} <span className="text-gray-400">· {fmtWhen(l.changedAt)}</span></div>
                  {changes.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-[11px]">
                      {changes.map(c => <li key={c.col}><span className="text-gray-500">{c.col}:</span> <span className="text-red-700 line-through">{c.from}</span> → <span className="text-green-700">{c.to}</span></li>)}
                    </ul>
                  )}
                  {l.restoredAt && <div className="text-[11px] text-green-700 mt-0.5">restored on {fmtWhen(l.restoredAt)}</div>}
                </li>
              );
            })}
          </ol>
        )}
        <p className="text-[10px] text-gray-400 font-manrope mt-4">Restores are done by an admin from Admin → Backup → History &amp; Recovery.</p>
      </div>
    </div>
  );
}
