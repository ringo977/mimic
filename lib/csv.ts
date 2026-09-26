import { todayStr } from '@/data/lab-data';

/**
 * CSV export helpers shared by the lab pages.
 *
 * Security: cells are always quoted, inner quotes doubled (RFC 4180), and a
 * text cell starting with = + - @ TAB or CR is prefixed with a single quote
 * so that Excel/LibreOffice/Sheets do not execute it as a formula
 * ("CSV injection": a note like `=HYPERLINK(...)` typed by a member would
 * otherwise run when an admin opens the export). Numbers are left as-is.
 */
export function csvCell(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCSV(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map(r => r.map(csvCell).join(',')).join('\r\n');
}

export function downloadCSV(headers: string[], rows: unknown[][], filename: string) {
  const blob = new Blob(['\ufeff' + buildCSV(headers, rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${todayStr()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
