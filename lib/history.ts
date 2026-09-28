// Row history (audit trail + undo) and daily snapshots — client side of
// scripts/supabase-2026-09-history.sql. Reads go through RLS (members see
// the history of what they work with, admins everything); every restore is
// an RPC that checks is_lab_admin() on the server.
import { supabase } from './supabase';
import { TABLES, BACKUP_VERSION } from './backup';

export type HistoryOp = 'INSERT' | 'UPDATE' | 'DELETE';
export type Row = Record<string, unknown>;

export interface HistoryLine {
  id: number;
  tableName: string;
  rowId: string;
  op: HistoryOp;
  oldRow: Row | null;
  changedCols: string[] | null;
  changedAt: string;
  changedBy: string | null;
  changedByName: string;
  restoredAt: string | null;
}

export interface AsOfRow {
  rowId: string;
  atTs: Row | null;
  nowRow: Row | null;
  status: 'unchanged' | 'changed' | 'deleted' | 'added';
}

export interface SnapshotRun {
  takenAt: string;
  tables: { tableName: string; nRows: number }[];
  totalRows: number;
}

/** Tables covered by the history trigger (same order as the SQL). */
export const HISTORY_TABLES = [
  'instruments', 'maintenance_logs', 'locations', 'projects', 'certifications',
  'storage_units', 'storage_boxes', 'reagents', 'bookings', 'cryo_vials',
  'wishlist_items', 'manuals', 'absences', 'app_settings', 'lab_users',
] as const;
export type HistoryTable = typeof HISTORY_TABLES[number];

export const HISTORY_TABLE_LABELS: Record<string, string> = {
  instruments: 'Instruments', maintenance_logs: 'Maintenance logs', locations: 'Locations', projects: 'Projects',
  certifications: 'Certifications', storage_units: 'Storage units', storage_boxes: 'Storage boxes', reagents: 'Reagents',
  bookings: 'Bookings', cryo_vials: 'Cryo vials', wishlist_items: 'Wishlist', manuals: 'Manuals', absences: 'Absences',
  app_settings: 'Settings', lab_users: 'People', log_entries: 'Activity log',
};

/** Human label for a stored row (what was deleted / changed). */
export function historyRowLabel(table: string, row: Row | null | undefined, rowId?: string): string {
  if (!row) return rowId || '—';
  const s = (k: string) => (row[k] === undefined || row[k] === null ? '' : String(row[k]));
  switch (table) {
    case 'cryo_vials': return [s('cell_line'), s('passage') && `P${s('passage')}`, s('user_name')].filter(Boolean).join(' · ');
    case 'bookings': return [s('user_name'), s('date'), s('start_hour') && `${s('start_hour')}–${s('end_hour')}h`].filter(Boolean).join(' · ');
    case 'absences': return [s('user_name'), s('type'), s('start_date') === s('end_date') ? s('start_date') : `${s('start_date')} → ${s('end_date')}`].filter(Boolean).join(' · ');
    case 'maintenance_logs': return [s('type'), s('date'), s('performed_by')].filter(Boolean).join(' · ');
    case 'manuals': return s('title') || s('file_name');
    case 'storage_boxes': return [s('label'), s('rack') && s('rack') !== '0' && `rack ${s('rack')}`].filter(Boolean).join(' · ');
    case 'app_settings': return s('key');
    default: return s('name') || s('title') || s('label') || s('key') || rowId || s('id') || '—';
  }
}

const mapLine = (r: Row): HistoryLine => ({
  id: Number(r.id),
  tableName: String(r.table_name),
  rowId: String(r.row_id),
  op: r.op as HistoryOp,
  oldRow: (r.old_row as Row | null) ?? null,
  changedCols: (r.changed_cols as string[] | null) ?? null,
  changedAt: String(r.changed_at),
  changedBy: (r.changed_by as string | null) ?? null,
  changedByName: String(r.changed_by_name || 'SQL / system'),
  restoredAt: (r.restored_at as string | null) ?? null,
});

export async function fetchHistory(opts: {
  table?: string; rowId?: string; op?: HistoryOp; days?: number; limit?: number; search?: string;
} = {}): Promise<{ lines: HistoryLine[]; error?: string }> {
  let q = supabase.from('row_history').select('*').order('changed_at', { ascending: false }).limit(opts.limit ?? 200);
  if (opts.table) q = q.eq('table_name', opts.table);
  if (opts.rowId) q = q.eq('row_id', opts.rowId);
  if (opts.op) q = q.eq('op', opts.op);
  if (opts.days) q = q.gte('changed_at', new Date(Date.now() - opts.days * 86400000).toISOString());
  const { data, error } = await q;
  if (error) return { lines: [], error: error.message };
  let lines = (data as Row[]).map(mapLine);
  if (opts.search) {
    const s = opts.search.toLowerCase();
    lines = lines.filter(l => historyRowLabel(l.tableName, l.oldRow, l.rowId).toLowerCase().includes(s)
      || l.changedByName.toLowerCase().includes(s) || l.rowId.toLowerCase().includes(s));
  }
  return { lines };
}

/** Deleted rows not yet restored (the "recently deleted" bin). */
export async function fetchRecentlyDeleted(days = 30, table?: string): Promise<{ lines: HistoryLine[]; error?: string }> {
  let q = supabase.from('row_history').select('*').eq('op', 'DELETE').is('restored_at', null)
    .gte('changed_at', new Date(Date.now() - days * 86400000).toISOString())
    .order('changed_at', { ascending: false }).limit(500);
  if (table) q = q.eq('table_name', table);
  const { data, error } = await q;
  if (error) return { lines: [], error: error.message };
  return { lines: (data as Row[]).map(mapLine) };
}

export async function restoreHistoryVersion(historyId: number): Promise<{ ok: boolean; result?: string; error?: string }> {
  const { data, error } = await supabase.rpc('history_restore_version', { p_history_id: historyId });
  if (error) return { ok: false, error: error.message };
  return { ok: true, result: (data as { result?: string })?.result };
}

export async function fetchTableAsOf(table: string, ts: string): Promise<{ rows: AsOfRow[]; error?: string }> {
  const { data, error } = await supabase.rpc('history_table_as_of', { p_table: table, p_ts: ts });
  if (error) return { rows: [], error: error.message };
  return {
    rows: (data as Row[]).map(r => ({
      rowId: String(r.row_id), atTs: (r.at_ts as Row | null) ?? null, nowRow: (r.now_row as Row | null) ?? null,
      status: r.status as AsOfRow['status'],
    })),
  };
}

export async function restoreTableAsOf(table: string, ts: string): Promise<{ ok: boolean; counts?: { restored: number; reverted: number; removed: number }; error?: string }> {
  const { data, error } = await supabase.rpc('history_restore_table_as_of', { p_table: table, p_ts: ts });
  if (error) return { ok: false, error: error.message };
  const d = data as { restored: number; reverted: number; removed: number };
  return { ok: true, counts: { restored: d.restored, reverted: d.reverted, removed: d.removed } };
}

export async function fetchSnapshotRuns(): Promise<{ runs: SnapshotRun[]; error?: string }> {
  const { data, error } = await supabase.from('db_snapshots').select('taken_at, table_name, n_rows').order('taken_at', { ascending: false }).limit(2000);
  if (error) return { runs: [], error: error.message };
  const byTs = new Map<string, SnapshotRun>();
  for (const r of data as Row[]) {
    const ts = String(r.taken_at);
    const run = byTs.get(ts) || { takenAt: ts, tables: [], totalRows: 0 };
    run.tables.push({ tableName: String(r.table_name), nRows: Number(r.n_rows) });
    run.totalRows += Number(r.n_rows);
    byTs.set(ts, run);
  }
  return { runs: Array.from(byTs.values()) };
}

export async function takeSnapshotNow(): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.rpc('take_db_snapshot_as_admin');
  return error ? { ok: false, error: error.message } : { ok: true };
}

/**
 * Build a backup JSON (same format as Admin → Export Database) out of one
 * daily snapshot, so it can be kept outside Supabase or fed to Restore.
 */
export async function snapshotAsBackupJSON(takenAt: string): Promise<{ json?: string; error?: string }> {
  const { data, error } = await supabase.from('db_snapshots').select('table_name, rows').eq('taken_at', takenAt);
  if (error) return { error: error.message };
  const dump: Record<string, unknown[]> = {};
  for (const r of data as Row[]) dump[String(r.table_name)] = (r.rows as unknown[]) ?? [];
  const missing = TABLES.filter(t => dump[t] === undefined);
  if (missing.length > 0) return { error: `Snapshot is missing table(s): ${missing.join(', ')}` };
  const ordered: Record<string, unknown> = { _meta: { version: BACKUP_VERSION, exportedAt: takenAt, tables: TABLES.length, source: 'daily snapshot' } };
  for (const t of TABLES) ordered[t] = dump[t];
  return { json: JSON.stringify(ordered, null, 2) };
}

/** Columns not worth showing in a diff. */
const HIDDEN_COLS = new Set(['id', 'created_at', 'updated_at', 'timestamp']);

/** Compact "field: old → new" list for an UPDATE line, given the next known state. */
export function describeChange(line: HistoryLine, next: Row | null): { col: string; from: string; to: string }[] {
  if (line.op !== 'UPDATE' || !line.oldRow) return [];
  const cols = (line.changedCols || Object.keys(line.oldRow)).filter(c => !HIDDEN_COLS.has(c));
  const fmt = (v: unknown) => v === null || v === undefined || v === '' ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return cols.map(c => ({ col: c, from: fmt(line.oldRow![c]), to: next ? fmt(next[c]) : '?' }));
}
