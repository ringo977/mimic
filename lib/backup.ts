import { supabase } from './supabase';
import JSZip from 'jszip';

const TABLES = [
  'lab_users', 'instruments', 'locations', 'projects', 'certifications',
  'storage_units', 'reagents', 'bookings', 'cryo_vials',
  'wishlist_items', 'log_entries', 'manuals',
] as const;

// ============================================================
// JSON Backup — full database dump
// ============================================================
export async function exportDatabaseJSON(): Promise<string> {
  const dump: Record<string, unknown[]> = {};
  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select('*');
    dump[table] = error ? [] : (data || []);
  }
  return JSON.stringify({
    _meta: { version: 1, exportedAt: new Date().toISOString(), tables: TABLES.length },
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

  const errors: string[] = [];
  const summary: Record<string, number> = {};
  const meta = parsed._meta as { version: number; exportedAt: string; tables: number } | undefined;

  if (!meta || typeof meta.version !== 'number') {
    errors.push('Missing or invalid _meta block. This may not be a MiMic backup file.');
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
    // Basic row validation: each row should have an id
    const badRows = rows.filter((r: unknown) => typeof r !== 'object' || r === null || !('id' in (r as Record<string, unknown>)));
    if (badRows.length > 0) {
      errors.push(`"${table}" has ${badRows.length} row(s) without an "id" field.`);
    }
  }

  if (!hasData && errors.length === 0) {
    errors.push('Backup file contains no data rows.');
  }

  return { valid: errors.length === 0, errors, summary, meta };
}

/**
 * Import a validated backup JSON. Clears tables one-by-one and re-inserts.
 * If a table fails to clear or insert, it is skipped but others continue.
 * Returns detailed results per table.
 */
export async function importDatabaseJSON(json: string): Promise<{
  ok: boolean;
  errors: string[];
  imported: Record<string, number>;
}> {
  const errors: string[] = [];
  const imported: Record<string, number> = {};
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(json); } catch { return { ok: false, errors: ['Invalid JSON file'], imported: {} }; }

  // Phase 1: Validate before touching anything
  const validation = validateBackupJSON(json);
  if (!validation.valid) {
    return { ok: false, errors: ['Validation failed: ' + validation.errors.join('; ')], imported: {} };
  }

  // Phase 2: Import table by table
  for (const table of TABLES) {
    const rows = parsed[table];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    // Clear existing rows
    const { error: delErr } = await supabase.from(table).delete().neq('id', '__never__');
    if (delErr) {
      errors.push(`Failed to clear ${table}: ${delErr.message}. Skipping this table.`);
      continue;
    }

    // Insert in batches of 500
    let tableInserted = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500);
      const { error: insErr } = await supabase.from(table).insert(batch);
      if (insErr) {
        errors.push(`Failed to insert into ${table} (batch ${Math.floor(i / 500) + 1}): ${insErr.message}`);
      } else {
        tableInserted += batch.length;
      }
    }
    imported[table] = tableInserted;
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
  const manualMap = new Map<string, { title: string; category: string; fileName: string }>();
  if (manuals) {
    for (const m of manuals) {
      if (m.file_url) {
        const storageFileName = m.file_url.split('/').pop() || '';
        manualMap.set(storageFileName, {
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

  for (const file of files) {
    if (file.name.startsWith('.')) continue;
    const { data: blob } = await supabase.storage.from(BUCKET).download(file.name);
    if (!blob) continue;

    const meta = manualMap.get(file.name);
    const folder = categoryLabels[meta?.category || 'other'] || 'Other';
    const fileName = meta?.fileName || file.name;
    zip.folder(folder)!.file(fileName, blob);
  }

  return zip.generateAsync({ type: 'blob' });
}

export async function importPDFsZip(zipBlob: Blob): Promise<{ ok: boolean; uploaded: number; errors: string[] }> {
  const errors: string[] = [];
  let uploaded = 0;

  const zip = await JSZip.loadAsync(zipBlob);
  const entries = Object.entries(zip.files).filter(([, f]) => !f.dir && f.name.toLowerCase().endsWith('.pdf'));

  // Get existing manuals to match files
  const { data: manuals } = await supabase.from('manuals').select('id, file_name, file_url');
  const fileNameToManualId = new Map<string, string>();
  if (manuals) {
    for (const m of manuals) {
      if (m.file_name) fileNameToManualId.set(m.file_name, m.id);
    }
  }

  for (const [path, file] of entries) {
    const fileName = path.split('/').pop() || path;
    const blob = await file.async('blob');

    const manualId = fileNameToManualId.get(fileName);
    const storagePath = manualId ? `${manualId}.pdf` : fileName;

    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, blob, {
      cacheControl: '3600',
      upsert: true,
    });

    if (error) {
      errors.push(`Failed to upload ${fileName}: ${error.message}`);
    } else {
      uploaded++;
      // Update file_url in manuals table if we have a matching manual
      if (manualId) {
        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
        await supabase.from('manuals').update({ file_url: urlData.publicUrl, file_name: fileName }).eq('id', manualId);
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
