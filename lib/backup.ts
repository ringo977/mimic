import { supabase } from './supabase';
import { fetchAllRows } from './supabase-data';
import JSZip from 'jszip';

// Import order: lab_users LAST — if anything goes wrong midway, the row
// that makes the caller an admin (and every RLS check with it) is still
// intact for all preceding tables.
export const TABLES = [
  'instruments', 'maintenance_logs', 'locations', 'projects', 'certifications',
  'storage_units', 'storage_boxes', 'reagents', 'bookings', 'cryo_vials',
  'wishlist_items', 'log_entries', 'manuals', 'absences', 'app_settings',
  'lab_users',
] as const;

// Primary key per table (used for upsert and validation)
const TABLE_PK: Record<string, string> = { app_settings: 'key' };
export const BACKUP_VERSION = 2;
const pkOf = (table: string) => TABLE_PK[table] ?? 'id';

// ============================================================
// JSON Backup — full database dump
// ============================================================
export async function exportDatabaseJSON(): Promise<string> {
  const dump: Record<string, unknown[]> = {};
  const failed: string[] = [];
  for (const table of TABLES) {
    // Paged: a single select() stops silently at 1000 rows, and a truncated
    // backup restored later would delete every row beyond that as "stale".
    const data = await fetchAllRows<Record<string, unknown>>(table, pkOf(table), pkOf(table));
    if (data === null) { failed.push(table); continue; }
    dump[table] = data;
  }
  // An incomplete backup silently written to disk is worse than no backup.
  if (failed.length > 0) {
    throw new Error(`Backup aborted — could not export: ${failed.join(', ')}`);
  }
  return JSON.stringify({
    _meta: { version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables: TABLES.length },
    ...dump,
  }, null, 2);
}

/**
 * Validate a backup JSON before importing.
 * Returns a summary of what will be imported so the user can confirm.
 */
export function validateBackupJSON(json: string): {
  valid: boolean;
  errors: string[];
  summary: Record<string, number>;
  meta?: { version: number; exportedAt: string; tables: number };
} {
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(json); } catch { return { valid: false, errors: ['Invalid JSON file — could not parse.'], summary: {} }; }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, errors: ['Backup must be a JSON object with a _meta block and one array per table.'], summary: {} };
  }

  const errors: string[] = [];
  const summary: Record<string, number> = {};
  const meta = parsed._meta as { version: number; exportedAt: string; tables: number } | undefined;

  if (!meta || typeof meta.version !== 'number') {
    errors.push('Missing or invalid _meta block. This may not be a MiMic backup file.');
  } else if (meta.version !== BACKUP_VERSION) {
    errors.push(`Backup format version ${meta.version} is not supported by this app (expected ${BACKUP_VERSION}). Restore it with the app version that produced it.`);
  }

  // A restore deletes rows that are not in the file: a file missing a table
  // is not "a partial backup", it is a file we must not restore from.
  const missing = TABLES.filter(t => parsed[t] === undefined);
  if (missing.length > 0) {
    errors.push(`Not a full backup — missing table(s): ${missing.join(', ')}.`);
  }

  let hasData = false;
  for (const table of TABLES) {
    const rows = parsed[table];
    if (rows === undefined) continue;
    if (!Array.isArray(rows)) {
      errors.push(`"${table}" is not an array — expected an array of rows.`);
      continue;
    }
    summary[table] = rows.length;
    if (rows.length > 0) hasData = true;
    // Basic row validation: each row should have its primary key
    const pk = pkOf(table);
    const badRows = rows.filter((r: unknown) => typeof r !== 'object' || r === null || !(pk in (r as Record<string, unknown>)));
    if (badRows.length > 0) {
      errors.push(`"${table}" has ${badRows.length} row(s) without a "${pk}" field.`);
    }
  }

  if (!hasData && errors.length === 0) {
    errors.push('Backup file contains no data rows.');
  }

  return { valid: errors.length === 0, errors, summary, meta };
}

/**
 * Import a validated backup JSON — in ONE server transaction.
 *
 * The whole restore runs inside the RPC `restore_backup` (scripts/
 * supabase-2026-09-consolidation.sql): every row upserted parents-first,
 * stale rows removed children-first, the caller's own account untouched.
 * If a single row is refused, nothing changes — the browser-side loop this
 * replaced could stop half-way with some tables restored and others not,
 * which is why there is no client-side fallback: a database without the RPC
 * must be migrated first.
 */
export async function importDatabaseJSON(json: string): Promise<{
  ok: boolean;
  errors: string[];
  imported: Record<string, number>;
  removed?: Record<string, number>;
}> {
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(json); } catch { return { ok: false, errors: ['Invalid JSON file'], imported: {} }; }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, errors: ['Backup must be a JSON object'], imported: {} };
  }
  const validation = validateBackupJSON(json);
  if (!validation.valid) {
    return { ok: false, errors: ['Validation failed: ' + validation.errors.join('; ')], imported: {} };
  }

  const { data, error } = await supabase.rpc('restore_backup', { p_backup: parsed });
  if (error) {
    // RPC not installed (database behind the app): stop here. Never fall back
    // to the browser-side loop — it is not atomic and can leave the database
    // half restored.
    if (/restore_backup/.test(error.message) && /(not find|does not exist|schema cache)/i.test(error.message)) {
      return {
        ok: false,
        errors: ['This database has no restore_backup() function — nothing was changed. Run scripts/supabase-2026-09-consolidation.sql in the Supabase SQL Editor, then retry.'],
        imported: {},
      };
    }
    return { ok: false, errors: [`Restore refused — nothing was changed: ${error.message}`], imported: {} };
  }
  const d = (data ?? {}) as { upserted?: Record<string, number>; removed?: Record<string, number> };
  return { ok: true, errors: [], imported: d.upserted ?? {}, removed: d.removed ?? {} };
}

// ============================================================
// PDF Backup — download all files from Storage as ZIP
// ============================================================
const BUCKET = 'manuals';

export async function exportPDFsZip(): Promise<Blob | null> {
  const { data: files, error } = await supabase.storage.from(BUCKET).list('', { limit: 1000 });
  if (error) throw new Error(`Could not list the PDF files: ${error.message}`);
  if (!files || files.length === 0) return null;

  const zip = new JSZip();

  // Fetch manual metadata to organize by category
  const { data: manuals } = await supabase.from('manuals').select('id, title, category, file_name, file_url');
  const manualMap = new Map<string, { id: string; title: string; category: string; fileName: string }>();
  if (manuals) {
    for (const m of manuals) {
      if (m.file_url) {
        const storageFileName = m.file_url.split('/').pop() || '';
        manualMap.set(storageFileName, {
          id: m.id,
          title: m.title,
          category: m.category || 'other',
          fileName: m.file_name || `${m.title}.pdf`,
        });
      }
    }
  }

  const categoryLabels: Record<string, string> = {
    protocol: 'Protocols',
    manual: 'Manuals',
    sds: 'Safety Data Sheets',
    other: 'Other',
  };

  // Two manuals may share a display name ("Protocol.pdf" twice): the ZIP
  // path is made unique and a manifest maps every entry back to its manual
  // id and storage object, so the import never has to guess by name.
  const manifest: Record<string, { manualId: string | null; storagePath: string; fileName: string; title: string | null }> = {};
  const usedPaths = new Set<string>();

  // A file that fails to download is an incomplete backup, not a file to
  // skip: collect the failures and abort (same rule as exportDatabaseJSON).
  const failed: string[] = [];
  for (const file of files) {
    if (file.name.startsWith('.') || file.name.endsWith('/')) continue;
    const { data: blob, error: dlError } = await supabase.storage.from(BUCKET).download(file.name);
    if (!blob) { failed.push(`${file.name}${dlError ? ` (${dlError.message})` : ''}`); continue; }

    const meta = manualMap.get(file.name);
    const folder = categoryLabels[meta?.category || 'other'] || 'Other';
    const baseName = meta?.fileName || file.name;
    let entryName = baseName;
    for (let k = 2; usedPaths.has(`${folder}/${entryName}`); k++) {
      entryName = baseName.replace(/(\.pdf)?$/i, ` (${k})$1`);
    }
    usedPaths.add(`${folder}/${entryName}`);
    zip.folder(folder)!.file(entryName, blob);
    manifest[`${folder}/${entryName}`] = {
      manualId: meta?.id ?? null,
      storagePath: file.name,
      fileName: baseName,
      title: meta?.title ?? null,
    };
  }
  if (failed.length > 0) {
    throw new Error(`PDF backup aborted — ${failed.length} file(s) could not be downloaded: ${failed.join(', ')}`);
  }
  zip.file('manifest.json', JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), files: manifest }, null, 2));

  return zip.generateAsync({ type: 'blob' });
}

export async function importPDFsZip(zipBlob: Blob): Promise<{ ok: boolean; uploaded: number; errors: string[] }> {
  const errors: string[] = [];
  let uploaded = 0;

  const zip = await JSZip.loadAsync(zipBlob);
  const entries = Object.entries(zip.files).filter(([, f]) => !f.dir && f.name.toLowerCase().endsWith('.pdf'));

  // Manifest (ZIPs made after 29/09/2026): exact mapping entry → manual.
  let manifest: Record<string, { manualId: string | null; storagePath: string; fileName: string }> = {};
  const mf = zip.file('manifest.json');
  if (mf) {
    try { manifest = (JSON.parse(await mf.async('string')) as { files: typeof manifest }).files ?? {}; }
    catch { errors.push('manifest.json is unreadable — falling back to matching by file name'); }
  }

  // Older ZIPs: match by file name (ambiguous when two manuals share it).
  const { data: manuals } = await supabase.from('manuals').select('id, file_name, file_url');
  const fileNameToManualId = new Map<string, string>();
  const knownIds = new Set<string>();
  if (manuals) {
    for (const m of manuals) {
      knownIds.add(m.id);
      if (m.file_name) fileNameToManualId.set(m.file_name, m.id);
    }
  }

  for (const [path, file] of entries) {
    const fromManifest = manifest[path];
    const fileName = fromManifest?.fileName || path.split('/').pop() || path;
    // JSZip returns an untyped Blob. storage-js sends a Blob as multipart and
    // takes the MIME type from blob.type — the `contentType` upload option is
    // ignored for Blob bodies — so an untyped Blob goes out as
    // application/octet-stream and the bucket (application/pdf only) refuses it.
    const blob = new Blob([await file.async('arraybuffer')], { type: 'application/pdf' });

    const manualId = fromManifest ? fromManifest.manualId : fileNameToManualId.get(fileName);
    if (manualId && !knownIds.has(manualId)) {
      // The manual row is gone: keep the file under its original object name
      // so a later restore of the row (history / JSON) finds it again.
      const { error } = await supabase.storage.from(BUCKET).upload(fromManifest?.storagePath || `${manualId}.pdf`, blob, { cacheControl: '3600', contentType: 'application/pdf', upsert: true });
      if (error) errors.push(`Failed to upload ${fileName}: ${error.message}`); else uploaded++;
      continue;
    }
    const storagePath = manualId ? `${manualId}.pdf` : fileName;

    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, blob, {
      cacheControl: '3600',
      contentType: 'application/pdf',
      upsert: true,
    });

    if (error) {
      errors.push(`Failed to upload ${fileName}: ${error.message}`);
    } else {
      uploaded++;
      // Update file_url in manuals table if we have a matching manual.
      // file_url stores the STORAGE PATH (bucket is private; links are
      // resolved to short-lived signed URLs by getManualFileUrl).
      if (manualId) {
        await supabase.from('manuals').update({ file_url: storagePath, file_name: fileName }).eq('id', manualId);
      }
    }
  }

  return { ok: errors.length === 0, uploaded, errors };
}

// ============================================================
// Helpers
// ============================================================
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadText(text: string, filename: string) {
  downloadBlob(new Blob([text], { type: 'application/json' }), filename);
}

export function formatBackupDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
