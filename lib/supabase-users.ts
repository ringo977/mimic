import { supabase } from './supabase';
import { LabUser, UserRole, UserAffiliation, UserStatus, generateAbbreviation } from '@/data/lab-data';

export interface SupabaseLabUser {
  id: string;
  email: string;
  name: string;
  abbreviation: string;
  role: UserRole;
  affiliation: UserAffiliation;
  is_admin: boolean;
  certifications: string[];
  projects: string[];
  status?: UserStatus | null;
  person_code?: string | null;
  supervisor_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  training_microfab_done?: boolean | null;
  training_microfab_date?: string | null;
  training_bio_done?: boolean | null;
  training_bio_date?: string | null;
  created_at?: string;
}

function toLabUser(row: SupabaseLabUser): LabUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    abbreviation: row.abbreviation || generateAbbreviation(row.name),
    role: row.role,
    affiliation: row.affiliation || 'External',
    isAdmin: row.is_admin ?? false,
    certifications: row.certifications || [],
    projects: row.projects || [],
    status: row.status || 'active',
    personCode: row.person_code || undefined,
    supervisorId: row.supervisor_id || undefined,
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    trainingMicrofabDone: row.training_microfab_done ?? false,
    trainingMicrofabDate: row.training_microfab_date || undefined,
    trainingBioDone: row.training_bio_done ?? false,
    trainingBioDate: row.training_bio_date || undefined,
  };
}

function toSupabaseRow(u: LabUser): Omit<SupabaseLabUser, 'created_at'> {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    abbreviation: u.abbreviation || generateAbbreviation(u.name),
    role: u.role,
    affiliation: u.affiliation,
    is_admin: u.isAdmin,
    certifications: u.certifications,
    projects: u.projects,
    status: u.status || 'active',
    person_code: u.personCode || null,
    supervisor_id: u.supervisorId || null,
    start_date: u.startDate || null,
    end_date: u.endDate || null,
    training_microfab_done: u.trainingMicrofabDone ?? false,
    training_microfab_date: u.trainingMicrofabDate || null,
    training_bio_done: u.trainingBioDone ?? false,
    training_bio_date: u.trainingBioDate || null,
  };
}

// Returns null on error so callers can distinguish "fetch failed" from "no users".
export async function fetchLabUsers(): Promise<LabUser[] | null> {
  const { data, error } = await supabase
    .from('lab_users')
    .select('*')
    .order('name');

  if (error) {
    console.error('Failed to fetch lab users:', error.message);
    return null;
  }

  return (data || []).map(toLabUser);
}

export async function findLabUserByEmail(email: string): Promise<LabUser | null> {
  const { data, error } = await supabase
    .from('lab_users')
    .select('*')
    .ilike('email', email)
    .maybeSingle();

  if (error || !data) return null;
  return toLabUser(data);
}

export async function insertLabUser(u: LabUser): Promise<{ user: LabUser | null; error?: string }> {
  const { data, error } = await supabase
    .from('lab_users')
    .insert(toSupabaseRow(u))
    .select()
    .single();

  if (error) {
    console.error('Failed to insert user:', error.message);
    return { user: null, error: error.message };
  }
  return { user: toLabUser(data) };
}

export async function updateLabUser(u: LabUser): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('lab_users')
    .update(toSupabaseRow(u))
    .eq('id', u.id);

  if (error) {
    console.error('Failed to update user:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function deleteLabUser(id: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('lab_users')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Failed to delete user:', error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
