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

// Tables where rows missing from the backup are deleted on restore.
// lab_users is excluded on purpose: restore never deletes accounts (a stale
// backup must not lock people out); clean up extra users manually if needed.
// app_settings is excluded too (settings added after the backup survive).
const DELETE_STALE = new Set<string>(TABLES.filter(t => t !== 'lab_users' && t !== 'app_settings'));

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
 * replaces could stop half-way with some tables restored and others not.
 * `importDatabaseJSONClientSide` is kept only as a fallback for a database
 * where that RPC has not been installed yet.
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
    // RPC not installed yet (older database): fall back to the old loop.
    if (/restore_backup/.test(error.message) && /(not find|does not exist|schema cache)/i.test(error.message)) {
      return importDatabaseJSONClientSide(json);
    }
    return { ok: false, errors: [`Restore refused — nothing was changed: ${error.message}`], imported: {} };
  }
  const d = (data ?? {}) as { upserted?: Record<string, number>; removed?: Record<string, number> };
  return { ok: true, errors: [], imported: d.upserted ?? {}, removed: d.removed ?? {} };
}

/**
 * Legacy browser-side restore (table by table, NOT atomic). Used only when
 * the `restore_backup` RPC is missing.
 */
export async function importDatabaseJSONClientSide(json: string): Promise<{
  ok: boolean;
  errors: string[];
  imported: Record<string, number>;
}> {
  const errors: string[] = [];
  const imported: Record<string, number> = {};
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(json); } catch { return { ok: false, errors: ['Invalid JSON file'], imported: {} }; }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, errors: ['Backup must be a JSON object'], imported: {} };
  }

  // Phase 1: Validate before touching anything
  const validation = validateBackupJSON(json);
  if (!validation.valid) {
    return { ok: false, errors: ['Validation failed: ' + validation.errors.join('; ')], imported: {} };
  }

  // Identify the caller: needed to protect their own lab_users row below.
  const { data: authData } = await supabase.auth.getUser();
  const myAuthId = authData?.user?.id ?? null;
  const myEmail = authData?.user?.email?.toLowerCase() ?? null;

  // Phase 2: Upsert table by table
  for (const table of TABLES) {
    const raw = parsed[table];
    if (!Array.isArray(raw)) continue;   // cannot happen after validation
    // An EMPTY array is meaningful: the table had no rows at backup time, so
    // the stale-row phase below must still run and empty it (except for the
    // tables never deleted from). Skipping it would keep whatever is there.
    let rows: unknown[] = raw;
    const pk = pkOf(table);

    if (table === 'lab_users') {
      rows = rows
        // Never restore the caller's own row: an old backup could demote
        // or deactivate the very admin performing the restore.
        .filter(r => {
          const row = r as Record<string, unknown>;
          const rowEmail = typeof row.email === 'string' ? row.email.toLowerCase() : null;
          return !((myAuthId && row.auth_user_id === myAuthId) || (myEmail && rowEmail === myEmail));
        })
        // Strip auth_user_id: on a fresh Supabase project (disaster recovery)
        // the backed-up UUIDs don't exist in auth.users, and a non-null
        // auth_user_id disables the email fallback in the RLS helpers —
        // locking everyone out. The trg_link_lab_user_auth trigger re-links
        // rows to the right auth account on insert.
        .map(r => {
          const { auth_user_id: _dropped, ...rest } = r as Record<string, unknown>;
          return rest;
        });
    }

    let tableUpserted = 0;
    let tableFailed = false;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error: upErr } = await supabase.from(table).upsert(batch, { onConflict: pk });
      if (upErr) {
        errors.push(`Failed to restore ${table} (batch ${Math.floor(i / 500) + 1}): ${upErr.message}`);
        tableFailed = true;
      } else {
        tableUpserted += batch.length;
      }
    }
    imported[table] = tableUpserted;

    // Phase 3: remove rows not present in the backup — but only if every
    // upsert for this table succeeded (never wipe more than we restored).
    if (!tableFailed && DELETE_STALE.has(table)) {
      const keep = new Set(rows.map(r => (r as Record<string, unknown>)[pk]).filter(v => typeof v === 'string') as string[]);
      const existing = await fetchAllRows<Record<string, unknown>>(table, pk, pk);
      if (!existing) {
        errors.push(`Restored ${table}, but could not check for stale rows (read failed)`);
      } else {
        const stale = existing.map(r => (r as unknown as Record<string, string>)[pk]).filter(id => typeof id === 'string' && !keep.has(id));
        for (let i = 0; i < stale.length; i += 200) {
          const chunk = stale.slice(i, i + 200);
          const { error: delErr } = await supabase.from(table).delete().in(pk, chunk);
          if (delErr) {
            errors.push(`Restored ${table}, but could not remove ${chunk.length} stale row(s): ${delErr.message}`);
            break;
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, imported };
}

// ============================================================
// PDF Backup — download all files from Storage as ZIP
// ============================================================
const BUCKET = 'manuals';

export async function exportPDFsZip(): Promise<Blob | null> {
  const { data: files, error } = await supabase.storage.from(BUCKET).list('', { limit: 1000 });
  if (error || !files || files.length === 0) return null;

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

  for (const file of files) {
    if (file.name.startsWith('.') || file.name.endsWith('/')) continue;
    const { data: blob } = await supabase.storage.from(BUCKET).download(file.name);
    if (!blob) continue;

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
    const blob = await file.async('blob');

    const manualId = fromManifest ? fromManifest.manualId : fileNameToManualId.get(fileName);
    if (manualId && !knownIds.has(manualId)) {
      // The manual row is gone: keep the file under its original object name
      // so a later restore of the row (history / JSON) finds it again.
      const { error } = await supabase.storage.from(BUCKET).upload(fromManifest?.storagePath || `${manualId}.pdf`, blob, { cacheControl: '3600', upsert: true });
      if (error) errors.push(`Failed to upload ${fileName}: ${error.message}`); else uploaded++;
      continue;
    }
    const storagePath = manualId ? `${manualId}.pdf` : fileName;

    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, blob, {
      cacheControl: '3600',
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
