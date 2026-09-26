import { supabase } from './supabase';

const BUCKET = 'manuals';

/**
 * Upload a manual PDF. Returns the STORAGE PATH to save in manuals.file_url
 * (not a public URL: the bucket is private, links are resolved on demand by
 * getManualFileUrl). Returns null on failure.
 *
 * Server-side the bucket policies require lab membership; here we also
 * validate that the file really is a PDF (magic bytes), and we always store
 * it as `${manualId}.pdf` regardless of the original file name.
 */
export async function uploadManualFile(manualId: string, file: File): Promise<string | null> {
  // Magic-byte check: a PDF starts with "%PDF-". The file picker's
  // accept=".pdf" is only a hint — this blocks renamed HTML/SVG/etc.
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  const magic = String.fromCharCode(...head);
  if (magic !== '%PDF-') {
    console.error('Rejected upload: not a PDF file');
    return null;
  }

  const path = `${manualId}.pdf`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: 'application/pdf',
    upsert: true,
  });

  if (error) {
    console.error('Failed to upload file:', error.message);
    return null;
  }

  return path;
}

/**
 * Resolve a manual's file_url (a storage path, or a legacy public URL from
 * before the bucket was made private) to a short-lived signed URL.
 */
export async function getManualFileUrl(fileUrl: string): Promise<string | null> {
  // Legacy rows stored the full public URL — extract the path after the
  // bucket segment; new rows store the bare path.
  const marker = `/object/public/${BUCKET}/`;
  const idx = fileUrl.indexOf(marker);
  const path = idx >= 0 ? decodeURIComponent(fileUrl.slice(idx + marker.length)) : fileUrl;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) {
    console.error('Failed to create signed URL:', error?.message);
    return null;
  }
  return data.signedUrl;
}

export async function deleteManualFile(manualId: string): Promise<void> {
  const { data } = await supabase.storage.from(BUCKET).list('', { search: manualId });
  if (data && data.length > 0) {
    await supabase.storage.from(BUCKET).remove(data.map(f => f.name));
  }
}
