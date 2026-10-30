// Consumption of a reagent, rebuilt from its row history: every change of
// current_stock between two recorded versions is a movement (negative =
// withdrawal, positive = restock) attributed to whoever made the change.
// No text parsing of the activity log, and nothing new server side.
import type { HistoryLine } from './history';

export interface StockMove {
  at: string;          // ISO timestamp
  byId: string | null; // lab_users.id (null for SQL / system)
  by: string;          // display name
  delta: number;       // in the reagent's unit; < 0 withdrawal, > 0 restock
}

export interface WeekBucket {
  start: Date;         // Monday 00:00 local
  withdrawn: number;
  restocked: number;
  nWithdrawals: number;
  nRestocks: number;
}

export interface PersonTotal {
  byId: string | null;
  by: string;
  withdrawn: number;
  nWithdrawals: number;
  lastAt: string;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Movements, oldest first. `currentStock` is the live value, used as the
 * "next state" of the most recent recorded change. A change that also
 * touched the unit (e.g. cans → grams) is skipped: its delta means nothing.
 */
export function stockMovesFromHistory(lines: HistoryLine[], currentStock: number): StockMove[] {
  const asc = [...lines].sort((a, b) => a.id - b.id);
  const moves: StockMove[] = [];
  for (let i = 0; i < asc.length; i++) {
    const l = asc[i];
    if (l.op !== 'UPDATE' || !l.oldRow) continue;
    if (l.changedCols && !l.changedCols.includes('current_stock')) continue;
    if (l.changedCols?.includes('unit')) continue;
    const before = num(l.oldRow.current_stock);
    if (before === null) continue;
    // Next known state of the row: the following line's old_row (a DELETE
    // line also carries the last state), else the live row
    const next = asc.slice(i + 1).find(n => n.op !== 'INSERT');
    const after = next ? (next.oldRow ? num(next.oldRow.current_stock) : null) : currentStock;
    if (after === null) continue;
    const delta = after - before;
    if (delta === 0) continue;
    moves.push({ at: l.changedAt, byId: l.changedBy, by: l.changedByName, delta: round(delta) });
  }
  return moves;
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Monday 00:00 (local) of the week containing d. */
export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (x.getDay() + 6) % 7;   // Monday = 0
  x.setDate(x.getDate() - day);
  return x;
}

/** The last `nWeeks` weeks up to today (oldest first); 0 = every week since the first move. */
export function weeklyBuckets(moves: StockMove[], nWeeks: number, now = new Date()): WeekBucket[] {
  const thisWeek = weekStart(now);
  let first = thisWeek;
  if (nWeeks > 0) {
    first = new Date(thisWeek); first.setDate(first.getDate() - 7 * (nWeeks - 1));
  } else if (moves.length) {
    first = weekStart(new Date(moves.reduce((m, x) => x.at < m ? x.at : m, moves[0].at)));
  }
  const buckets: WeekBucket[] = [];
  for (let d = new Date(first); d <= thisWeek; d.setDate(d.getDate() + 7)) {
    buckets.push({ start: new Date(d), withdrawn: 0, restocked: 0, nWithdrawals: 0, nRestocks: 0 });
  }
  for (const m of moves) {
    const ws = weekStart(new Date(m.at)).getTime();
    const b = buckets.find(x => x.start.getTime() === ws);
    if (!b) continue;
    if (m.delta < 0) { b.withdrawn = round(b.withdrawn - m.delta); b.nWithdrawals++; }
    else { b.restocked = round(b.restocked + m.delta); b.nRestocks++; }
  }
  return buckets;
}

/** Withdrawals per person since `since` (inclusive), biggest first. */
export function perPerson(moves: StockMove[], since?: Date): PersonTotal[] {
  const map = new Map<string, PersonTotal>();
  for (const m of moves) {
    if (m.delta >= 0) continue;
    if (since && new Date(m.at) < since) continue;
    const key = m.byId ?? `name:${m.by}`;
    const p = map.get(key) || { byId: m.byId, by: m.by, withdrawn: 0, nWithdrawals: 0, lastAt: m.at };
    p.withdrawn = round(p.withdrawn - m.delta);
    p.nWithdrawals++;
    if (m.at > p.lastAt) p.lastAt = m.at;
    map.set(key, p);
  }
  return Array.from(map.values()).sort((a, b) => b.withdrawn - a.withdrawn || a.by.localeCompare(b.by));
}

/** CSV of the movements (newest first), for the export-enabled roles. */
export function movesToCSV(moves: StockMove[], reagentName: string, unit: string): string {
  const esc = (s: string) => /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  const rows = [['reagent', 'date', 'time', 'person', 'movement', `amount (${unit})`]];
  for (const m of [...moves].reverse()) {
    const d = new Date(m.at);
    rows.push([reagentName, d.toLocaleDateString('en-GB'), d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }), m.by, m.delta < 0 ? 'withdrawal' : 'restock', String(Math.abs(m.delta))]);
  }
  return rows.map(r => r.map(esc).join(',')).join('\n');
}
