import { supabase } from './supabase';

const BUCKET = 'manuals';

export async function uploadManualFile(manualId: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'pdf';
  const path = `${manualId}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });

  if (error) {
    console.error('Failed to upload file:', error.message);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteManualFile(manualId: string): Promise<void> {
  const { data } = await supabase.storage.from(BUCKET).list('', { search: manualId });
  if (data && data.length > 0) {
    await supabase.storage.from(BUCKET).remove(data.map(f => f.name));
  }
}
