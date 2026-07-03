import { supabase } from './supabase';
import {
  Booking, Reagent, CryoVial, WishlistItem, LogEntry,
  Instrument, MaintenanceLog, Manual, StorageUnit, Project, Certification, Location,
} from '@/data/lab-data';

// ============================================================
// Generic helpers
// ============================================================
// Returns null on error (unreachable DB, RLS denial, …) so callers can
// distinguish "fetch failed" from "table is legitimately empty".
async function fetchAll<T>(table: string, order = 'id'): Promise<T[] | null> {
  const { data, error } = await supabase.from(table).select('*').order(order);
  if (error) { console.error(`Failed to fetch ${table}:`, error.message); return null; }
  return data || [];
}

async function upsertRow<T>(table: string, row: T): Promise<T | null> {
  const { data, error } = await supabase.from(table).upsert(row).select().single();
  if (error) { console.error(`Failed to upsert ${table}:`, error.message); return null; }
  return data;
}

async function deleteRow(table: string, id: string): Promise<boolean> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) { console.error(`Failed to delete from ${table}:`, error.message); return false; }
  return true;
}

// ============================================================
// Instruments
// ============================================================
export async function fetchInstruments(): Promise<Instrument[] | null> {
  const rows = await fetchAll<{
    id: string; name: string; category: string; location: string;
    location_id: string | null; requires_certification: boolean;
    description: string; icon: string;
    serial_number: string | null; manufacturer: string | null; model: string | null;
    purchase_date: string | null; commission_date: string | null;
    maintenance_period_months: number | null;
    last_maintenance_date: string | null; next_maintenance_date: string | null;
  }>('instruments', 'name');
  if (!rows) return null;
  return rows.map(r => ({
    id: r.id, name: r.name, category: r.category, location: r.location,
    locationId: r.location_id ?? undefined,
    requiresCertification: r.requires_certification,
    description: r.description, icon: r.icon,
    serialNumber: r.serial_number ?? undefined,
    manufacturer: r.manufacturer ?? undefined,
    model: r.model ?? undefined,
    purchaseDate: r.purchase_date ?? undefined,
    commissionDate: r.commission_date ?? undefined,
    maintenancePeriodMonths: r.maintenance_period_months ?? undefined,
    lastMaintenanceDate: r.last_maintenance_date ?? undefined,
    nextMaintenanceDate: r.next_maintenance_date ?? undefined,
  }));
}

export async function upsertInstrument(i: Instrument) {
  return upsertRow('instruments', {
    id: i.id, name: i.name, category: i.category, location: i.location,
    location_id: i.locationId ?? null, requires_certification: i.requiresCertification,
    description: i.description, icon: i.icon,
    serial_number: i.serialNumber ?? null,
    manufacturer: i.manufacturer ?? null,
    model: i.model ?? null,
    purchase_date: i.purchaseDate ?? null,
    commission_date: i.commissionDate ?? null,
    maintenance_period_months: i.maintenancePeriodMonths ?? null,
    last_maintenance_date: i.lastMaintenanceDate ?? null,
    next_maintenance_date: i.nextMaintenanceDate ?? null,
  });
}

export async function deleteInstrument(id: string) { return deleteRow('instruments', id); }

// ============================================================
// Maintenance Logs
// ============================================================
export async function fetchMaintenanceLogs(instrumentId?: string): Promise<MaintenanceLog[]> {
  let query = supabase.from('maintenance_logs').select('*').order('date', { ascending: false });
  if (instrumentId) query = query.eq('instrument_id', instrumentId);
  const { data, error } = await query;
  if (error) { console.error('Failed to fetch maintenance logs:', error.message); return []; }
  return (data || []).map((r: { id: string; instrument_id: string; date: string; type: string; description: string; performed_by: string; cost: number | null; notes: string | null }) => ({
    id: r.id, instrumentId: r.instrument_id, date: r.date,
    type: r.type as MaintenanceLog['type'], description: r.description,
    performedBy: r.performed_by, cost: r.cost ?? undefined, notes: r.notes ?? undefined,
  }));
}

export async function upsertMaintenanceLog(m: MaintenanceLog) {
  return upsertRow('maintenance_logs', {
    id: m.id, instrument_id: m.instrumentId, date: m.date,
    type: m.type, description: m.description,
    performed_by: m.performedBy, cost: m.cost ?? null, notes: m.notes ?? null,
  });
}

export async function deleteMaintenanceLog(id: string) { return deleteRow('maintenance_logs', id); }

// ============================================================
// Locations
// ============================================================
export async function fetchLocations(): Promise<Location[] | null> {
  return fetchAll<Location>('locations', 'name');
}
export async function upsertLocation(l: Location) { return upsertRow('locations', l); }
export async function deleteLocation(id: string) { return deleteRow('locations', id); }

// ============================================================
// Projects
// ============================================================
export async function fetchProjects(): Promise<Project[] | null> {
  return fetchAll<Project>('projects', 'name');
}
export async function upsertProject(p: Project) { return upsertRow('projects', p); }
export async function deleteProject(id: string) { return deleteRow('projects', id); }

// ============================================================
// Certifications
// ============================================================
export async function fetchCertifications(): Promise<Certification[] | null> {
  const rows = await fetchAll<{
    id: string; name: string; instrument_id: string | null; description: string;
  }>('certifications', 'name');
  if (!rows) return null;
  return rows.map(r => ({
    id: r.id, name: r.name, instrumentId: r.instrument_id ?? undefined, description: r.description,
  }));
}

export async function upsertCertification(c: Certification) {
  return upsertRow('certifications', {
    id: c.id, name: c.name, instrument_id: c.instrumentId ?? null, description: c.description,
  });
}

export async function deleteCertification(id: string) { return deleteRow('certifications', id); }

// ============================================================
// Storage Units
// ============================================================
export async function fetchStorageUnits(): Promise<StorageUnit[] | null> {
  const rows = await fetchAll<{
    id: string; name: string; type: string; temperature: string; model: string;
    location: string; location_id: string | null;
    num_racks: number | null; boxes_per_rack: number | null;
    grid_rows: number | null; grid_cols: number | null;
    num_shelves: number | null; num_doors: number | null;
  }>('storage_units', 'name');
  if (!rows) return null;
  return rows.map(r => ({
    id: r.id, name: r.name, type: r.type as StorageUnit['type'],
    temperature: r.temperature, model: r.model, location: r.location,
    locationId: r.location_id ?? undefined,
    numRacks: r.num_racks ?? undefined, boxesPerRack: r.boxes_per_rack ?? undefined,
    gridRows: r.grid_rows ?? undefined, gridCols: r.grid_cols ?? undefined,
    numShelves: r.num_shelves ?? undefined, numDoors: r.num_doors ?? undefined,
  }));
}

export async function upsertStorageUnit(s: StorageUnit) {
  return upsertRow('storage_units', {
    id: s.id, name: s.name, type: s.type, temperature: s.temperature,
    model: s.model, location: s.location, location_id: s.locationId ?? null,
    num_racks: s.numRacks ?? null, boxes_per_rack: s.boxesPerRack ?? null,
    grid_rows: s.gridRows ?? null, grid_cols: s.gridCols ?? null,
    num_shelves: s.numShelves ?? null, num_doors: s.numDoors ?? null,
  });
}

export async function deleteStorageUnit(id: string) { return deleteRow('storage_units', id); }

// ============================================================
// Reagents
// ============================================================
export async function fetchReagents(): Promise<Reagent[] | null> {
  const rows = await fetchAll<{
    id: string; name: string; category: string; current_stock: number;
    max_stock: number; unit: string; expiry_date: string; location: string;
    storage_unit_id: string | null; supplier: string; catalog_number: string;
    alert_threshold: number;
  }>('reagents', 'name');
  if (!rows) return null;
  return rows.map(r => ({
    id: r.id, name: r.name, category: r.category,
    currentStock: r.current_stock, maxStock: r.max_stock, unit: r.unit,
    expiryDate: r.expiry_date, location: r.location,
    storageUnitId: r.storage_unit_id ?? undefined,
    supplier: r.supplier, catalogNumber: r.catalog_number,
    alertThreshold: r.alert_threshold,
  }));
}

export async function upsertReagent(r: Reagent) {
  return upsertRow('reagents', {
    id: r.id, name: r.name, category: r.category,
    current_stock: r.currentStock, max_stock: r.maxStock, unit: r.unit,
    expiry_date: r.expiryDate, location: r.location,
    storage_unit_id: r.storageUnitId ?? null,
    supplier: r.supplier, catalog_number: r.catalogNumber,
    alert_threshold: r.alertThreshold,
  });
}

export async function deleteReagent(id: string) { return deleteRow('reagents', id); }

// ============================================================
// Bookings
// ============================================================
export async function fetchBookings(): Promise<Booking[] | null> {
  const rows = await fetchAll<{
    id: string; instrument_id: string; user_id: string; user_name: string;
    date: string; start_hour: number; end_hour: number;
    notes: string; created_at: string;
  }>('bookings', 'date');
  if (!rows) return null;
  return rows.map(r => ({
    id: r.id, instrumentId: r.instrument_id, userId: r.user_id,
    userName: r.user_name, date: r.date,
    startHour: r.start_hour, endHour: r.end_hour,
    notes: r.notes, createdAt: r.created_at,
  }));
}

export async function upsertBooking(b: Booking) {
  return upsertRow('bookings', {
    id: b.id, instrument_id: b.instrumentId, user_id: b.userId,
    user_name: b.userName, date: b.date,
    start_hour: b.startHour, end_hour: b.endHour,
    notes: b.notes, created_at: b.createdAt,
  });
}

export async function deleteBooking(id: string) { return deleteRow('bookings', id); }

// Fresh fetch of bookings for one instrument on one date — used to re-check
// conflicts right before confirming, reducing double-booking races.
// Returns null when the check itself fails, so callers can refuse to book blind.
export async function fetchBookingsForSlot(instrumentId: string, date: string): Promise<Booking[] | null> {
  const { data, error } = await supabase
    .from('bookings').select('*')
    .eq('instrument_id', instrumentId).eq('date', date);
  if (error) { console.error('Failed to fetch slot bookings:', error.message); return null; }
  return (data || []).map((r: {
    id: string; instrument_id: string; user_id: string; user_name: string;
    date: string; start_hour: number; end_hour: number; notes: string; created_at: string;
  }) => ({
    id: r.id, instrumentId: r.instrument_id, userId: r.user_id, userName: r.user_name,
    date: r.date, startHour: r.start_hour, endHour: r.end_hour, notes: r.notes, createdAt: r.created_at,
  }));
}

// ============================================================
// App settings (key/value, JSONB) — e.g. booking working hours
// ============================================================
export async function fetchAppSetting<T>(key: string): Promise<T | null> {
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', key).maybeSingle();
  if (error) { console.warn(`app_settings fetch (${key}) failed:`, error.message); return null; }
  return (data?.value as T) ?? null;
}

export async function upsertAppSetting(key: string, value: unknown): Promise<boolean> {
  const { error } = await supabase.from('app_settings').upsert({ key, value });
  if (error) { console.warn(`app_settings upsert (${key}) failed:`, error.message); return false; }
  return true;
}

// ============================================================
// Cryo Vials
// ============================================================
export async function fetchCryoVials(): Promise<CryoVial[] | null> {
  const rows = await fetchAll<{
    id: string; cell_line: string; passage: number; date: string;
    user_id: string; user_name: string; storage_unit_id: string;
    rack: number; box: number; row: number; col: number; notes: string;
  }>('cryo_vials', 'cell_line');
  if (!rows) return null;
  return rows.map(r => ({
    id: r.id, cellLine: r.cell_line, passage: r.passage, date: r.date,
    userId: r.user_id, userName: r.user_name, storageUnitId: r.storage_unit_id,
    rack: r.rack, box: r.box, row: r.row, col: r.col, notes: r.notes,
  }));
}

export async function upsertCryoVial(v: CryoVial) {
  return upsertRow('cryo_vials', {
    id: v.id, cell_line: v.cellLine, passage: v.passage, date: v.date,
    user_id: v.userId, user_name: v.userName, storage_unit_id: v.storageUnitId,
    rack: v.rack, box: v.box, row: v.row, col: v.col, notes: v.notes,
  });
}

export async function deleteCryoVial(id: string) { return deleteRow('cryo_vials', id); }

// ============================================================
// Wishlist
// ============================================================
export async function fetchWishlist(): Promise<WishlistItem[] | null> {
  const rows = await fetchAll<{
    id: string; name: string; type: string; catalog_number: string;
    supplier: string; estimated_cost: number; quantity: number;
    urgency: string; requested_by: string; requested_by_name: string;
    status: string; approved_by: string | null; delivered_at: string | null;
    stocked_to_reagent_id: string | null; stocked_to_storage_unit_id: string | null;
    notes: string; timestamp: string;
  }>('wishlist_items', 'timestamp');
  if (!rows) return null;
  return rows.map(r => ({
    id: r.id, name: r.name, type: r.type as WishlistItem['type'],
    catalogNumber: r.catalog_number, supplier: r.supplier,
    estimatedCost: r.estimated_cost, quantity: r.quantity,
    urgency: r.urgency as WishlistItem['urgency'],
    requestedBy: r.requested_by, requestedByName: r.requested_by_name,
    status: r.status as WishlistItem['status'],
    approvedBy: r.approved_by ?? undefined,
    deliveredAt: r.delivered_at ?? undefined,
    stockedToReagentId: r.stocked_to_reagent_id ?? undefined,
    stockedToStorageUnitId: r.stocked_to_storage_unit_id ?? undefined,
    notes: r.notes, timestamp: r.timestamp,
  }));
}

export async function upsertWishlistItem(w: WishlistItem) {
  return upsertRow('wishlist_items', {
    id: w.id, name: w.name, type: w.type, catalog_number: w.catalogNumber,
    supplier: w.supplier, estimated_cost: w.estimatedCost, quantity: w.quantity,
    urgency: w.urgency, requested_by: w.requestedBy,
    requested_by_name: w.requestedByName, status: w.status,
    approved_by: w.approvedBy ?? null, delivered_at: w.deliveredAt ?? null,
    stocked_to_reagent_id: w.stockedToReagentId ?? null,
    stocked_to_storage_unit_id: w.stockedToStorageUnitId ?? null,
    notes: w.notes, timestamp: w.timestamp,
  });
}

export async function deleteWishlistItem(id: string) { return deleteRow('wishlist_items', id); }

// ============================================================
// Log Entries
// ============================================================
// Newest first, capped at 500 entries so login doesn't download the whole audit trail.
export async function fetchLogEntries(): Promise<LogEntry[] | null> {
  const { data, error } = await supabase
    .from('log_entries').select('*')
    .order('timestamp', { ascending: false })
    .limit(500);
  if (error) { console.error('Failed to fetch log_entries:', error.message); return null; }
  return (data || []).map((r: {
    id: string; timestamp: string; user_id: string; user_name: string;
    action: string; category: string; details: string;
  }) => ({
    id: r.id, timestamp: r.timestamp, userId: r.user_id,
    userName: r.user_name, action: r.action,
    category: r.category as LogEntry['category'], details: r.details,
  }));
}

export async function insertLogEntry(entry: LogEntry) {
  return upsertRow('log_entries', {
    id: entry.id, timestamp: entry.timestamp, user_id: entry.userId,
    user_name: entry.userName, action: entry.action,
    category: entry.category, details: entry.details,
  });
}

// ============================================================
// Manuals (metadata only, fileData stays in localStorage)
// ============================================================
export async function fetchManuals(): Promise<Manual[] | null> {
  const rows = await fetchAll<{
    id: string; title: string; category: string; instrument: string | null;
    description: string; last_updated: string; uploaded_by: string;
    file_name: string | null; file_url: string | null;
  }>('manuals', 'title');
  if (!rows) return null;
  return rows.map(r => ({
    id: r.id, title: r.title, category: r.category as Manual['category'],
    instrument: r.instrument ?? undefined, description: r.description,
    lastUpdated: r.last_updated, uploadedBy: r.uploaded_by,
    fileName: r.file_name ?? undefined, fileUrl: r.file_url ?? undefined,
  }));
}

export async function upsertManual(m: Manual) {
  return upsertRow('manuals', {
    id: m.id, title: m.title, category: m.category,
    instrument: m.instrument ?? null, description: m.description,
    last_updated: m.lastUpdated, uploaded_by: m.uploadedBy,
    file_name: m.fileName ?? null, file_url: m.fileUrl ?? null,
  });
}

export async function deleteManual(id: string) { return deleteRow('manuals', id); }
