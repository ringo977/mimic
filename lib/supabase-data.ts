import { supabase } from './supabase';
import {
  Booking, Absence, Reagent, CryoVial, WishlistItem, LogEntry,
  Instrument, BookingPolicy, MaintenanceLog, Manual, StorageUnit, StorageBox, Project, Certification, Location,
} from '@/data/lab-data';

// ============================================================
// Generic helpers
// ============================================================
// Returns null on error (unreachable DB, RLS denial, …) so callers can
// distinguish "fetch failed" from "table is legitimately empty".
// PostgREST returns at most 1000 rows per request (Supabase default
// max-rows) and says nothing when it truncates. Reagents and vials are
// already in the hundreds, so every whole-table read pages through in
// chunks and only stops when a chunk comes back short.
//
// Robust against two things: a server max-rows lower than PAGE (each page
// advances by what actually came back, and the loop runs until the exact
// count is reached), and a non-unique sort key (the primary key is always
// the tie-breaker, so a row cannot slip between two pages).
const PAGE = 1000;
export async function fetchAllRows<T>(table: string, order = 'id', pk = 'id'): Promise<T[] | null> {
  const rows: T[] = [];
  let from = 0;
  for (;;) {
    let q = supabase.from(table).select('*', { count: 'exact' }).order(order);
    if (order !== pk) q = q.order(pk);
    const { data, error, count } = await q.range(from, from + PAGE - 1);
    if (error) { console.error(`Failed to fetch ${table}:`, error.message); return null; }
    const got = (data || []) as T[];
    rows.push(...got);
    from += got.length;
    const total = count ?? Number.POSITIVE_INFINITY;
    if (got.length === 0 || rows.length >= total) break;
  }
  return rows;
}
const fetchAll = fetchAllRows;

async function upsertRow<T>(table: string, row: T): Promise<T | null> {
  const { data, error } = await supabase.from(table).upsert(row).select().single();
  if (error) { console.error(`Failed to upsert ${table}:`, error.message); return null; }
  return data;
}

// Plain UPDATE for tables that have a protective BEFORE INSERT trigger
// (absences, wishlist_items): an upsert fires that trigger with the new
// row *before* Postgres notices the conflict, so e.g. a member cancelling
// their own absence was rejected as "creating a cancelled absence".
// .select() makes RLS denials visible (0 rows → null).
async function updateRow<T extends { id: string }>(table: string, row: T): Promise<T | null> {
  const { id, ...rest } = row;
  const { data, error } = await supabase.from(table).update(rest).eq('id', id).select().maybeSingle();
  if (error) { console.error(`Failed to update ${table}:`, error.message); return null; }
  return (data as T | null) ?? null;
}

async function deleteRow(table: string, id: string): Promise<boolean> {
  // .select('id') makes the delete verifiable: RLS denials don't error,
  // they just delete 0 rows — without this check the UI removes the item
  // locally and it silently reappears on reload.
  const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
  if (error) { console.error(`Failed to delete from ${table}:`, error.message); return false; }
  if (!data || data.length === 0) {
    console.error(`Delete from ${table} removed no rows (id ${id}) — likely denied by RLS.`);
    return false;
  }
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
    booking_policy: BookingPolicy | null; responsible_user_id: string | null;
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
    bookingPolicy: r.booking_policy ?? undefined,
    responsibleUserId: r.responsible_user_id ?? undefined,
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
    booking_policy: i.bookingPolicy ?? null,
    responsible_user_id: i.responsibleUserId ?? null,
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

// Bulk cleanup when an instrument is deleted (avoids orphaned history rows).
export async function deleteMaintenanceLogsForInstrument(instrumentId: string): Promise<boolean> {
  const { error } = await supabase.from('maintenance_logs').delete().eq('instrument_id', instrumentId);
  if (error) { console.error('Failed to delete maintenance logs:', error.message); return false; }
  return true;
}

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
    rack_labels: StorageUnit['rackLabels'] | null;
  }>('storage_units', 'name');
  if (!rows) return null;
  return rows.map(r => ({
    id: r.id, name: r.name, type: r.type as StorageUnit['type'],
    temperature: r.temperature, model: r.model, location: r.location,
    locationId: r.location_id ?? undefined,
    numRacks: r.num_racks ?? undefined, boxesPerRack: r.boxes_per_rack ?? undefined,
    gridRows: r.grid_rows ?? undefined, gridCols: r.grid_cols ?? undefined,
    numShelves: r.num_shelves ?? undefined, numDoors: r.num_doors ?? undefined,
    rackLabels: r.rack_labels ?? undefined,
  }));
}

export async function upsertStorageUnit(s: StorageUnit) {
  return upsertRow('storage_units', {
    id: s.id, name: s.name, type: s.type, temperature: s.temperature,
    model: s.model, location: s.location, location_id: s.locationId ?? null,
    num_racks: s.numRacks ?? null, boxes_per_rack: s.boxesPerRack ?? null,
    grid_rows: s.gridRows ?? null, grid_cols: s.gridCols ?? null,
    num_shelves: s.numShelves ?? null, num_doors: s.numDoors ?? null,
    rack_labels: s.rackLabels ?? null,
  });
}

export async function deleteStorageUnit(id: string) { return deleteRow('storage_units', id); }

// ============================================================
// Storage Boxes
// ============================================================
export async function fetchStorageBoxes(): Promise<StorageBox[] | null> {
  const rows = await fetchAll<{
    id: string; storage_unit_id: string; rack: number | null; shelf: number | null; door: string | null;
    number: number; label: string; grid_rows: number; grid_cols: number; notes: string | null;
  }>('storage_boxes', 'label');
  if (!rows) return null;
  return rows.map(r => ({
    id: r.id, storageUnitId: r.storage_unit_id,
    rack: r.rack ?? undefined, shelf: r.shelf ?? undefined, door: (r.door as StorageBox['door']) ?? undefined,
    number: r.number, label: r.label,
    gridRows: r.grid_rows, gridCols: r.grid_cols,
    notes: r.notes ?? undefined,
  }));
}

export async function upsertStorageBox(b: StorageBox) {
  return upsertRow('storage_boxes', {
    id: b.id, storage_unit_id: b.storageUnitId, rack: b.rack ?? null, shelf: b.shelf ?? null, door: b.door ?? null,
    number: b.number, label: b.label, grid_rows: b.gridRows, grid_cols: b.gridCols,
    notes: b.notes ?? null,
  });
}

export async function deleteStorageBox(id: string) { return deleteRow('storage_boxes', id); }

// ============================================================
// Reagents
// ============================================================
export async function fetchReagents(): Promise<Reagent[] | null> {
  const rows = await fetchAll<{
    id: string; name: string; category: string; current_stock: number;
    max_stock: number; unit: string; expiry_date: string; location: string;
    storage_unit_id: string | null; box_id: string | null; shelf: number | null; door: string | null; supplier: string; catalog_number: string;
    alert_threshold: number; lot: string | null; owner: string | null; notes: string | null;
    kind: string | null; derived_from_id: string | null; responsible_user_ids: string[] | null;
  }>('reagents', 'name');
  if (!rows) return null;
  return rows.map(r => ({
    id: r.id, name: r.name, category: r.category,
    currentStock: r.current_stock, maxStock: r.max_stock, unit: r.unit,
    expiryDate: r.expiry_date, location: r.location,
    storageUnitId: r.storage_unit_id ?? undefined, boxId: r.box_id ?? undefined, shelf: r.shelf ?? undefined, door: (r.door as Reagent['door']) ?? undefined,
    supplier: r.supplier, catalogNumber: r.catalog_number,
    alertThreshold: r.alert_threshold,
    lot: r.lot ?? undefined, owner: r.owner ?? undefined, notes: r.notes ?? undefined,
    kind: (r.kind as Reagent['kind']) ?? 'item',
    derivedFromId: r.derived_from_id ?? undefined,
    responsibleUserIds: r.responsible_user_ids ?? undefined,
  }));
}

export async function upsertReagent(r: Reagent, opts?: { skipStock?: boolean }) {
  // skipStock: leave current_stock to the server (see LabContext.updateReagent).
  return upsertRow('reagents', {
    id: r.id, name: r.name, category: r.category,
    ...(opts?.skipStock ? {} : { current_stock: r.currentStock }),
    max_stock: r.maxStock, unit: r.unit,
    expiry_date: r.expiryDate, location: r.location,
    storage_unit_id: r.storageUnitId ?? null, box_id: r.boxId ?? null, shelf: r.shelf ?? null, door: r.door ?? null,
    supplier: r.supplier, catalog_number: r.catalogNumber,
    alert_threshold: r.alertThreshold,
    lot: r.lot ?? null, owner: r.owner ?? null, notes: r.notes ?? null,
    kind: r.kind ?? 'item', derived_from_id: r.derivedFromId ?? null,
    responsible_user_ids: r.responsibleUserIds ?? [],
  });
}

export async function deleteReagent(id: string) { return deleteRow('reagents', id); }

// Atomic server-side stock adjustment (scripts/supabase-2026-09-fix-assessment.sql).
// The RPC checks the caller's role and REJECTS a withdrawal below zero, so a
// failure is an answer, not a transport problem: callers must not "fall back"
// to writing the row themselves.
//
// The server also writes the log_entries row in the same transaction and
// returns it, so the app shows exactly what was recorded.
export async function adjustReagentStock(
  reagentId: string, delta: number, purpose?: string, project?: string,
): Promise<{ stock: number; log: LogEntry | null } | { error: string }> {
  const { data, error } = await supabase.rpc('adjust_reagent_stock', {
    p_reagent_id: reagentId, p_delta: delta, p_purpose: purpose ?? null, p_project: project ?? null,
  });
  if (error) return { error: error.message };
  if (data === null || data === undefined) return { error: 'no stock returned' };
  // v3+ returns { stock, applied, log }; the superseded v1/v2 returned a bare number.
  if (typeof data === 'object' && 'stock' in data) {
    const d = data as { stock: number; log?: LogEntry };
    return { stock: Number(d.stock), log: d.log ?? null };
  }
  return { stock: Number(data), log: null };
}

// Take from a stock and top up the working solution prepared from it, in
// one server transaction (scripts/supabase-2026-09-reagent-kind.sql).
export async function prepareWorkingSolution(
  stockId: string, stockTaken: number, workingId: string, workingMade: number, notes?: string,
): Promise<{ stock: number; working: number; log: LogEntry | null } | { error: string }> {
  const { data, error } = await supabase.rpc('prepare_working_solution', {
    p_stock_id: stockId, p_stock_taken: stockTaken, p_working_id: workingId, p_working_made: workingMade, p_notes: notes ?? null,
  });
  if (error) return { error: error.message };
  const d = data as { stock: number; working: number; log?: LogEntry } | null;
  if (!d) return { error: 'no result returned' };
  return { stock: Number(d.stock), working: Number(d.working), log: d.log ?? null };
}

// Current stock of one reagent, straight from the server (used to undo an
// optimistic update the server refused).
export async function fetchReagentStock(reagentId: string): Promise<number | null> {
  const { data, error } = await supabase.from('reagents').select('current_stock').eq('id', reagentId).maybeSingle();
  if (error || !data) return null;
  return Number(data.current_stock);
}

// ============================================================
// Bookings
// ============================================================
export async function fetchBookings(): Promise<Booking[] | null> {
  const rows = await fetchAll<{
    id: string; instrument_id: string; user_id: string; user_name: string;
    date: string; start_hour: number; end_hour: number;
    notes: string; created_at: string; status: string | null;
  }>('bookings', 'date');
  if (!rows) return null;
  return rows.map(mapBooking);
}

type BookingRow = {
  id: string; instrument_id: string; user_id: string; user_name: string;
  date: string; start_hour: number; end_hour: number; notes: string; created_at: string; status?: string | null;
};
function mapBooking(r: BookingRow): Booking {
  return {
    id: r.id, instrumentId: r.instrument_id, userId: r.user_id, userName: r.user_name,
    date: r.date, startHour: r.start_hour, endHour: r.end_hour, notes: r.notes, createdAt: r.created_at,
    status: r.status === 'pending' ? 'pending' : 'confirmed',
  };
}

/**
 * Insert a new booking or update an existing one. Updates are plain UPDATEs
 * (not upserts) so the BEFORE INSERT policy trigger does not run on them, and
 * `status` is never sent: the server decides it (pending vs confirmed) and only
 * approvers may change it through `setBookingStatus`.
 */
export async function upsertBooking(b: Booking, mode: 'insert' | 'update' = 'insert'): Promise<{ booking: Booking | null; error?: string }> {
  const row: BookingRow = {
    id: b.id, instrument_id: b.instrumentId, user_id: b.userId,
    user_name: b.userName, date: b.date,
    start_hour: b.startHour, end_hour: b.endHour,
    notes: b.notes, created_at: b.createdAt,
  };
  const { id, ...rest } = row;
  const q = mode === 'update'
    ? supabase.from('bookings').update(rest).eq('id', id).select().maybeSingle()
    : supabase.from('bookings').upsert(row).select().maybeSingle();
  const { data, error } = await q;
  if (error) { console.error('Failed to save booking:', error.message); return { booking: null, error: cleanDbError(error.message) }; }
  if (!data) return { booking: null, error: 'not allowed' };
  return { booking: mapBooking(data as BookingRow) };
}

/** Strip Postgres noise from trigger messages so they can be shown to users. */
function cleanDbError(msg: string): string {
  return msg.replace(/^(ERROR:\s*)?(P\d{4}:\s*)?/, '').replace(/\s*CONTEXT:[\s\S]*$/, '').trim();
}

/** Approve (or send back to pending) a booking — instrument responsible or booking manager only. */
export async function setBookingStatus(id: string, status: 'confirmed' | 'pending'): Promise<Booking | null> {
  const saved = await updateRow<{ id: string; status: string }>('bookings', { id, status });
  return saved ? mapBooking(saved as unknown as BookingRow) : null;
}

export async function deleteBooking(id: string) { return deleteRow('bookings', id); }

// ============================================================
// Absences
// ============================================================
interface SupabaseAbsence {
  id: string; user_id: string; user_name: string; type: string;
  start_date: string; end_date: string;
  start_hour: number | null; end_hour: number | null;
  notes: string | null; handover: string | null;
  status: string; flags: string | null; requested_at: string;
  decided_by: string | null; decided_at: string | null; decision_note: string | null;
}

function toAbsence(r: SupabaseAbsence): Absence {
  return {
    id: r.id, userId: r.user_id, userName: r.user_name, type: r.type as Absence['type'],
    startDate: r.start_date, endDate: r.end_date,
    startHour: r.start_hour ?? undefined, endHour: r.end_hour ?? undefined,
    notes: r.notes || undefined, handover: r.handover || undefined,
    status: r.status as Absence['status'], flags: r.flags || undefined,
    requestedAt: r.requested_at,
    decidedBy: r.decided_by || undefined, decidedAt: r.decided_at || undefined,
    decisionNote: r.decision_note || undefined,
  };
}

export async function fetchAbsences(): Promise<Absence[] | null> {
  const rows = await fetchAll<SupabaseAbsence>('absences', 'start_date');
  if (!rows) return null;
  return rows.map(toAbsence);
}

export async function upsertAbsence(a: Absence, mode: 'insert' | 'update' = 'insert') {
  return (mode === 'update' ? updateRow : upsertRow)('absences', {
    id: a.id, user_id: a.userId, user_name: a.userName, type: a.type,
    start_date: a.startDate, end_date: a.endDate,
    start_hour: a.startHour ?? null, end_hour: a.endHour ?? null,
    notes: a.notes ?? null, handover: a.handover ?? null,
    status: a.status, flags: a.flags ?? null, requested_at: a.requestedAt,
    decided_by: a.decidedBy ?? null, decided_at: a.decidedAt ?? null,
    decision_note: a.decisionNote ?? null,
  });
}

export async function deleteAbsence(id: string) { return deleteRow('absences', id); }

// Fresh fetch of bookings for one instrument on one date — used to re-check
// conflicts right before confirming, reducing double-booking races.
// Returns null when the check itself fails, so callers can refuse to book blind.
export async function fetchBookingsForSlot(instrumentId: string, date: string): Promise<Booking[] | null> {
  const { data, error } = await supabase
    .from('bookings').select('*')
    .eq('instrument_id', instrumentId).eq('date', date);
  if (error) { console.error('Failed to fetch slot bookings:', error.message); return null; }
  return (data || []).map((r: BookingRow) => mapBooking(r));
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
    box_id: string | null; rack: number; box: number; row: number; col: number; notes: string;
    cells: number | string | null;
  }>('cryo_vials', 'cell_line');
  if (!rows) return null;
  return rows.map(r => ({
    id: r.id, cellLine: r.cell_line, passage: r.passage, date: r.date,
    userId: r.user_id, userName: r.user_name, storageUnitId: r.storage_unit_id,
    boxId: r.box_id ?? undefined,
    rack: r.rack, box: r.box, row: r.row, col: r.col, notes: r.notes,
    cells: r.cells == null ? undefined : Number(r.cells),
  }));
}

export async function upsertCryoVial(v: CryoVial) {
  return upsertRow('cryo_vials', {
    id: v.id, cell_line: v.cellLine, passage: v.passage, date: v.date,
    user_id: v.userId, user_name: v.userName, storage_unit_id: v.storageUnitId,
    box_id: v.boxId ?? null,
    rack: v.rack, box: v.box, row: v.row, col: v.col, notes: v.notes,
    cells: v.cells ?? null,
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

export async function upsertWishlistItem(w: WishlistItem, mode: 'insert' | 'update' = 'insert') {
  return (mode === 'update' ? updateRow : upsertRow)('wishlist_items', {
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
