'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  LabUser, Booking, Absence, Reagent, CryoVial, WishlistItem, LogEntry, Instrument, Manual,
  StorageUnit, StorageBox, Project, Certification, Location, BookingSettings, AbsenceSettings, CellType,
  rolePermissions, externalRolePermissions,
  generateId, formatCells,
  defaultBookingSettings, sanitizeBookingSettings, formatTime,
  defaultAbsenceSettings, sanitizeAbsenceSettings, absenceTypeMeta,
} from '@/data/lab-data';
import { fetchLabUsers, insertLabUser, updateLabUser, deleteLabUser } from '@/lib/supabase-users';
import {
  fetchInstruments, upsertInstrument, deleteInstrument,
  fetchLocations, upsertLocation, deleteLocation,
  fetchProjects, upsertProject, deleteProject,
  fetchCertifications, upsertCertification, deleteCertification,
  fetchStorageUnits, upsertStorageUnit, deleteStorageUnit,
  fetchStorageBoxes, upsertStorageBox, deleteStorageBox,
  fetchReagents, upsertReagent, deleteReagent, adjustReagentStock, fetchReagentStock, prepareWorkingSolution as rpcPrepareWorkingSolution,
  fetchBookings, upsertBooking, deleteBooking, setBookingStatus, createBookingSeries, deleteBookingSeries,
  fetchCryoVials, upsertCryoVialChecked, deleteCryoVial,
  fetchWishlist, upsertWishlistItem, deleteWishlistItem,
  fetchLogEntries, insertLogEntry,
  fetchManuals, upsertManual, deleteManual,
  fetchAppSetting, upsertAppSetting,
  fetchAbsences, upsertAbsence, deleteAbsence,
} from '@/lib/supabase-data';

const BOOKING_SETTINGS_KEY = 'booking_settings';
const ABSENCE_SETTINGS_KEY = 'absence_settings';
const CELL_TYPES_KEY = 'cell_types';

interface LabContextType {
  user: LabUser;
  permissions: typeof rolePermissions[LabUser['role']];
  currentPage: string;
  setCurrentPage: (page: string) => void;
  bookings: Booking[];
  addBooking: (b: Omit<Booking, 'id' | 'createdAt'>) => void;
  updateBooking: (b: Booking) => void;
  removeBooking: (id: string) => void;
  /** Multi-day booking (one row per date, all-or-nothing). Resolves to an error message, or null on success. */
  addBookingSeries: (args: { instrumentId: string; dates: string[]; startHour: number; endHour: number; notes: string }) => Promise<string | null>;
  removeBookingSeries: (seriesId: string) => void;
  /** Approve a pending booking (instrument responsible or booking manager). */
  approveBooking: (id: string) => void;
  bookingSettings: BookingSettings;
  updateBookingSettings: (s: BookingSettings) => void;
  canManageAllBookings: boolean;
  absences: Absence[];
  addAbsence: (a: Omit<Absence, 'id' | 'requestedAt'>) => void;
  updateAbsence: (a: Absence) => void;
  removeAbsence: (id: string) => void;
  absenceSettings: AbsenceSettings;
  /** Cell types → vial colours (Admin-managed, shared via app_settings). */
  cellTypes: CellType[];
  updateCellTypes: (types: CellType[]) => void;
  updateAbsenceSettings: (s: AbsenceSettings) => void;
  canApproveAbsences: boolean;
  reagents: Reagent[];
  withdrawReagent: (reagentId: string, amount: number, purpose: string, project: string) => void;
  addReagentStock: (reagentId: string, amount: number) => void;
  prepareWorkingSolution: (stockId: string, stockTaken: number, workingId: string, workingMade: number, notes?: string) => void;
  cryoVials: CryoVial[];
  addCryoVial: (v: Omit<CryoVial, 'id'>) => void;
  addCryoVials: (list: Omit<CryoVial, 'id'>[]) => void;
  removeCryoVial: (id: string) => void;
  wishlist: WishlistItem[];
  addWishlistItem: (item: Omit<WishlistItem, 'id' | 'timestamp' | 'status'>) => void;
  updateWishlistStatus: (id: string, status: WishlistItem['status'], approvedBy?: string, extra?: Partial<Pick<WishlistItem, 'stockedToReagentId' | 'stockedToStorageUnitId'>>) => void;
  /** Edit the content of a request (name, price, quantity…) — requester on own items, or an approver. */
  updateWishlistItem: (w: WishlistItem) => void;
  /** Delete a request — requester on own pending items, or an admin. */
  removeWishlistItem: (id: string) => void;
  log: LogEntry[];
  addLogEntry: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  users: LabUser[];
  addUser: (u: LabUser) => void | Promise<void>;
  updateUser: (u: LabUser) => void | Promise<void>;
  removeUser: (id: string) => void | Promise<void>;
  addNewReagent: (r: Reagent) => void;
  updateReagent: (r: Reagent, opts?: { keepServerStock?: boolean }) => void;
  removeReagent: (id: string) => void;
  instruments: Instrument[];
  addInstrument: (i: Instrument) => void;
  updateInstrument: (i: Instrument) => void;
  removeInstrument: (id: string) => Promise<boolean>;
  /** Show the red sync banner from a page (e.g. a failed maintenance-log save). */
  reportError: (message: string) => void;
  manuals: Manual[];
  addManual: (m: Manual) => void;
  updateManual: (m: Manual) => void;
  removeManual: (id: string) => void;
  storageUnits: StorageUnit[];
  addStorageUnit: (s: StorageUnit) => void;
  updateStorageUnit: (s: StorageUnit) => void;
  removeStorageUnit: (id: string) => void;
  storageBoxes: StorageBox[];
  addStorageBox: (b: StorageBox) => void;
  updateStorageBox: (b: StorageBox) => void;
  removeStorageBox: (id: string) => void;
  projects: Project[];
  addProject: (p: Project) => void;
  updateProject: (p: Project) => void;
  removeProject: (id: string) => void;
  certifications: Certification[];
  addCertification: (c: Certification) => void;
  updateCertification: (c: Certification) => void;
  removeCertification: (id: string) => void;
  locations: Location[];
  addLocation: (l: Location) => void;
  updateLocation: (l: Location) => void;
  removeLocation: (id: string) => void;
}

const LabContext = createContext<LabContextType | null>(null);
export function useLabContext() { const ctx = useContext(LabContext); if (!ctx) throw new Error('useLabContext must be used within LabProvider'); return ctx; }

const STORAGE_KEY = 'mimic-lab-data';

export function LabProvider({ user, children }: { user: LabUser; children: React.ReactNode }) {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [cryoVials, setCryoVials] = useState<CryoVial[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [users, setUsers] = useState<LabUser[]>([]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [manuals, setManuals] = useState<Manual[]>([]);
  const [storageUnits, setStorageUnits] = useState<StorageUnit[]>([]);
  const [storageBoxes, setStorageBoxes] = useState<StorageBox[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [bookingSettings, setBookingSettings] = useState<BookingSettings>(defaultBookingSettings);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [absenceSettings, setAbsenceSettings] = useState<AbsenceSettings>(defaultAbsenceSettings);
  const [cellTypes, setCellTypes] = useState<CellType[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Watch a fire-and-forget persistence call: if it fails (null/false result
  // or rejection), surface a visible warning instead of losing data silently.
  const track = useCallback((p: Promise<unknown>, what: string) => {
    p.then(res => {
      if (res === null || res === false) setSyncError(`${what}: the change was NOT saved to the server. Check your connection, then reload and retry.`);
    }).catch(() => {
      setSyncError(`${what}: the change was NOT saved to the server. Check your connection, then reload and retry.`);
    });
  }, []);

  useEffect(() => {
    async function loadData() {
      // Fetch everything from Supabase in parallel
      const [
        sbUsers, sbInstruments, sbLocations, sbProjects, sbCertifications,
        sbStorageUnits, sbStorageBoxes, sbReagents, sbBookings, sbCryoVials, sbWishlist,
        sbLog, sbManuals,
      ] = await Promise.all([
        fetchLabUsers(),
        fetchInstruments(),
        fetchLocations(),
        fetchProjects(),
        fetchCertifications(),
        fetchStorageUnits(),
        fetchStorageBoxes(),
        fetchReagents(),
        fetchBookings(),
        fetchCryoVials(),
        fetchWishlist(),
        fetchLogEntries(),
        fetchManuals(),
      ]);

      // Supabase is the single source of truth. A failed fetch (null) shows
      // an empty list plus a very visible error banner — never mock/demo
      // data, which used to be silently displayed as if it were real.
      setUsers(sbUsers ?? []);
      setInstruments(sbInstruments ?? []);
      setLocations(sbLocations ?? []);
      setProjects(sbProjects ?? []);
      setCertifications(sbCertifications ?? []);
      setStorageUnits(sbStorageUnits ?? []);
      // storage_boxes may not exist yet (migration not run) — degrade to empty
      setStorageBoxes(sbStorageBoxes ?? []);
      setReagents(sbReagents ?? []);
      setBookings(sbBookings ?? []);
      setCryoVials(sbCryoVials ?? []);
      setWishlist(sbWishlist ?? []);
      setLog(sbLog ?? []);
      setManuals(sbManuals ?? []);

      if ([sbUsers, sbInstruments, sbLocations, sbProjects, sbCertifications,
        sbStorageUnits, sbReagents, sbBookings, sbCryoVials, sbWishlist,
        sbLog, sbManuals].some(x => x === null)) {
        setSyncError('Could not load data from the server — some sections are empty. Do NOT make changes; check your connection and reload.');
      }

      // Booking settings: Supabase → localStorage → defaults
      let localData: Record<string, unknown> = {};
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) localData = JSON.parse(saved);
      } catch { /* noop */ }
      const sbSettings = await fetchAppSetting<Partial<BookingSettings>>(BOOKING_SETTINGS_KEY);
      const localSettings = localData.bookingSettings as Partial<BookingSettings> | undefined;
      setBookingSettings(sanitizeBookingSettings(sbSettings ?? localSettings ?? defaultBookingSettings));

      // Absences (table may not exist yet if the migration wasn't run — degrade to empty)
      const sbAbsences = await fetchAbsences();
      setAbsences(sbAbsences ?? []);
      const sbAbsSettings = await fetchAppSetting<Partial<AbsenceSettings>>(ABSENCE_SETTINGS_KEY);
      setAbsenceSettings(sanitizeAbsenceSettings(sbAbsSettings ?? defaultAbsenceSettings));
      const sbCellTypes = await fetchAppSetting<CellType[]>(CELL_TYPES_KEY);
      setCellTypes(Array.isArray(sbCellTypes) ? sbCellTypes.filter(t => t && t.name).map(t => ({ ...t, aliases: Array.isArray(t.aliases) ? t.aliases : [] })) : []);

      setLoaded(true);
    }
    loadData();
  }, []);

  // Persist booking settings to localStorage as offline fallback
  useEffect(() => {
    if (!loaded) return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      saved.bookingSettings = bookingSettings;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch { /* noop */ }
  }, [bookingSettings, loaded]);

  // ---- Log ----
  const addLogEntry = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const full: LogEntry = { ...entry, id: generateId(), timestamp: new Date().toISOString() };
    setLog(prev => [full, ...prev]);
    insertLogEntry(full);
  }, []);

  // ---- Bookings ----
  // The server (trigger enforce_booking_policy) is the authority on rules and
  // on the pending/confirmed status: after each save we take back its row, and
  // if it refused the booking we drop the optimistic copy.
  const addBooking = useCallback((b: Omit<Booking, 'id' | 'createdAt'>) => {
    const full: Booking = { ...b, id: generateId(), createdAt: new Date().toISOString() };
    setBookings(prev => [...prev, full]);
    upsertBooking(full).then(({ booking: saved, error }) => {
      if (saved) { setBookings(prev => prev.map(x => x.id === saved.id ? saved : x)); return; }
      setBookings(prev => prev.filter(x => x.id !== full.id));
      setSyncError(`Booking refused by the server: ${error || 'unknown error'}`);
    }).catch(() => setSyncError('Booking: the change was NOT saved to the server. Check your connection, then reload and retry.'));
    addLogEntry({ userId: b.userId, userName: b.userName, action: `Booked ${b.instrumentId}`, category: 'booking', details: `${b.date} ${formatTime(b.startHour)}-${formatTime(b.endHour)}${b.status === 'pending' ? ' (pending authorization)' : ''}` });
  }, [addLogEntry]);

  const updateBooking = useCallback((b: Booking) => {
    let before: Booking | undefined;
    setBookings(prev => { before = prev.find(x => x.id === b.id); return prev.map(x => x.id === b.id ? b : x); });
    upsertBooking(b, 'update').then(({ booking: saved, error }) => {
      if (saved) { setBookings(prev => prev.map(x => x.id === saved.id ? saved : x)); return; }
      if (before) { const bk = before; setBookings(prev => prev.map(x => x.id === bk.id ? bk : x)); }
      setSyncError(`Booking update refused by the server: ${error || 'unknown error'}`);
    }).catch(() => setSyncError('Booking update: the change was NOT saved to the server. Check your connection, then reload and retry.'));
    addLogEntry({ userId: user.id, userName: user.name, action: `Updated ${b.instrumentId}`, category: 'booking', details: `${b.date} ${formatTime(b.startHour)}-${formatTime(b.endHour)}` });
  }, [user, addLogEntry]);

  const approveBooking = useCallback((id: string) => {
    const bk = bookings.find(b => b.id === id);
    setBookings(prev => prev.map(x => x.id === id ? { ...x, status: 'confirmed' } : x));
    const p = setBookingStatus(id, 'confirmed').then(saved => {
      if (saved) setBookings(prev => prev.map(x => x.id === saved.id ? saved : x));
      else setBookings(prev => prev.map(x => x.id === id ? { ...x, status: 'pending' } : x));
      return saved;
    });
    track(p, 'Booking authorization');
    if (bk) addLogEntry({ userId: user.id, userName: user.name, action: `Authorized booking on ${bk.instrumentId}`, category: 'booking', details: `${bk.userName} — ${bk.date} ${formatTime(bk.startHour)}-${formatTime(bk.endHour)}` });
  }, [bookings, user, addLogEntry, track]);

  const removeBooking = useCallback((id: string) => {
    setBookings(prev => {
      const bk = prev.find(b => b.id === id);
      if (bk) addLogEntry({ userId: user.id, userName: user.name, action: `Cancelled ${bk.instrumentId}`, category: 'booking', details: bk.date });
      return prev.filter(b => b.id !== id);
    });
    track(deleteBooking(id), 'Booking cancellation');
  }, [user, addLogEntry, track]);

  const addBookingSeries = useCallback(async (args: { instrumentId: string; dates: string[]; startHour: number; endHour: number; notes: string }): Promise<string | null> => {
    // No optimistic rows: the server decides all-or-nothing and the status of each day.
    const { bookings: saved, error } = await createBookingSeries(args);
    if (!saved) return error || 'unknown error';
    setBookings(prev => [...prev.filter(b => !saved.some(s => s.id === b.id)), ...saved]);
    addLogEntry({ userId: user.id, userName: user.name, action: `Booked ${args.instrumentId} for ${saved.length} days`, category: 'booking', details: `${args.dates[0]} → ${args.dates[args.dates.length - 1]} ${formatTime(args.startHour)}-${formatTime(args.endHour)}` });
    return null;
  }, [user, addLogEntry]);

  const removeBookingSeries = useCallback((seriesId: string) => {
    let removed: Booking[] = [];
    setBookings(prev => { removed = prev.filter(b => b.seriesId === seriesId); return prev.filter(b => b.seriesId !== seriesId); });
    const p = deleteBookingSeries(seriesId).then(ids => {
      if (ids === null) { setBookings(prev => [...prev, ...removed]); return null; }
      return ids;
    });
    track(p, 'Series cancellation');
    if (removed.length > 0) addLogEntry({ userId: user.id, userName: user.name, action: `Cancelled ${removed[0].instrumentId} series`, category: 'booking', details: `${removed.length} days from ${removed[0].date}` });
  }, [user, addLogEntry, track]);

  const updateBookingSettings = useCallback((s: BookingSettings) => {
    const clean = sanitizeBookingSettings(s);
    setBookingSettings(clean);
    track(upsertAppSetting(BOOKING_SETTINGS_KEY, clean), 'Booking hours');
    addLogEntry({ userId: user.id, userName: user.name, action: 'Updated booking hours', category: 'booking', details: `Work ${clean.workStartHour}:00-${clean.workEndHour}:00, open ${clean.openStartHour}:00-${clean.openEndHour}:00, ${clean.slotMinutes}min slots` });
  }, [user, addLogEntry, track]);

  // ---- Absences ----
  const addAbsence = useCallback((a: Omit<Absence, 'id' | 'requestedAt'>) => {
    const full: Absence = { ...a, id: generateId(), requestedAt: new Date().toISOString() };
    setAbsences(prev => [...prev, full]);
    // The server re-applies the auto-approval rules and may downgrade the
    // request to "pending": take its word for the status.
    const saved = upsertAbsence(full).then(row => {
      if (row && row.status !== full.status) {
        setAbsences(prev => prev.map(x => x.id === full.id ? { ...x, status: row.status as Absence['status'], flags: (row as { flags?: string | null }).flags ?? x.flags } : x));
        setSyncError('Absence request: the server decided it needs supervisor approval, so it was saved as pending (not auto-approved).');
      }
      return row;
    });
    track(saved, 'Absence request');
    addLogEntry({ userId: a.userId, userName: a.userName, action: `Requested ${absenceTypeMeta[a.type].label}`, category: 'absence', details: `${a.startDate}${a.endDate !== a.startDate ? ` → ${a.endDate}` : ''} (${full.status.replace('_', '-')})` });
  }, [addLogEntry, track]);

  const updateAbsence = useCallback((a: Absence) => {
    setAbsences(prev => prev.map(x => x.id === a.id ? a : x));
    track(upsertAbsence(a, 'update'), 'Absence update');
    addLogEntry({ userId: user.id, userName: user.name, action: `${a.status === 'approved' ? 'Approved' : a.status === 'rejected' ? 'Rejected' : a.status === 'cancelled' ? 'Cancelled' : 'Updated'} absence of ${a.userName}`, category: 'absence', details: `${absenceTypeMeta[a.type].label} ${a.startDate}${a.endDate !== a.startDate ? ` → ${a.endDate}` : ''}` });
  }, [user, addLogEntry, track]);

  const removeAbsence = useCallback((id: string) => {
    setAbsences(prev => prev.filter(a => a.id !== id));
    track(deleteAbsence(id), 'Absence deletion');
  }, [track]);

  const updateCellTypes = useCallback((types: CellType[]) => {
    const clean = types.filter(t => t.name.trim()).map(t => ({ ...t, name: t.name.trim(), aliases: t.aliases.map(a => a.trim()).filter(Boolean) }));
    setCellTypes(clean);
    track(upsertAppSetting(CELL_TYPES_KEY, clean), 'Cell types');
    addLogEntry({ userId: user.id, userName: user.name, action: 'Updated cell type colours', category: 'cryo', details: clean.map(t => t.name).join(', ') });
  }, [user, addLogEntry, track]);

  const updateAbsenceSettings = useCallback((s: AbsenceSettings) => {
    const clean = sanitizeAbsenceSettings(s);
    setAbsenceSettings(clean);
    track(upsertAppSetting(ABSENCE_SETTINGS_KEY, clean), 'Absence settings');
    addLogEntry({ userId: user.id, userName: user.name, action: 'Updated absence policy settings', category: 'absence', details: `auto ≤${clean.autoApproveMaxDays}d, notice ${clean.noticeDaysShort}d, SW ${clean.swMonthlyCap}/month` });
  }, [user, addLogEntry, track]);

  // ---- Reagents ----
  // Stock changes go through an atomic server-side RPC (no lost updates when
  // two people adjust the same reagent at once). Optimistic local update
  // first, then reconcile with the value returned by the server. Falls back
  // to the legacy full-row upsert if the RPC is not installed.
  // Optimistic update, then the server decides. If it refuses (role, stock
  // below zero, connection) the local value is put back to what the server
  // holds — never written over from the browser.
  // The server writes the movement AND its log row in one transaction and
  // returns both; the browser only mirrors them. It never writes a log line
  // of its own for stock moves, so the log cannot disagree with the stock.
  const changeReagentStock = useCallback(async (reagentId: string, delta: number, label: string, purpose?: string, project?: string) => {
    setReagents(prev => prev.map(r => r.id === reagentId ? { ...r, currentStock: Math.max(0, r.currentStock + delta) } : r));
    const res = await adjustReagentStock(reagentId, delta, purpose, project);
    if ('stock' in res) {
      setReagents(prev => prev.map(r => r.id === reagentId ? { ...r, currentStock: res.stock } : r));
      if (res.log) setLog(prev => [res.log as LogEntry, ...prev]);
      return;
    }
    const serverStock = await fetchReagentStock(reagentId);
    if (serverStock !== null) setReagents(prev => prev.map(r => r.id === reagentId ? { ...r, currentStock: serverStock } : r));
    setSyncError(`${label}: refused by the server (${res.error}). The stock shown is the server's value.`);
  }, []);

  const withdrawReagent = useCallback((reagentId: string, amount: number, purpose: string, project: string) => {
    if (amount <= 0) return;
    changeReagentStock(reagentId, -amount, 'Reagent withdrawal', purpose, project);
  }, [changeReagentStock]);

  const addReagentStock = useCallback((reagentId: string, amount: number) => {
    if (amount <= 0) return;
    changeReagentStock(reagentId, amount, 'Reagent restock');
  }, [changeReagentStock]);

  // Take from a stock and top up the working solution made from it: one
  // server transaction, one log line (prepare_working_solution RPC).
  const prepareWorkingSolution = useCallback(async (stockId: string, stockTaken: number, workingId: string, workingMade: number, notes?: string) => {
    if (stockTaken <= 0 || workingMade <= 0 || stockId === workingId) return;
    setReagents(prev => prev.map(r =>
      r.id === stockId ? { ...r, currentStock: Math.max(0, r.currentStock - stockTaken) }
      : r.id === workingId ? { ...r, currentStock: r.currentStock + workingMade, derivedFromId: r.derivedFromId ?? stockId }
      : r));
    const res = await rpcPrepareWorkingSolution(stockId, stockTaken, workingId, workingMade, notes);
    if ('stock' in res) {
      setReagents(prev => prev.map(r =>
        r.id === stockId ? { ...r, currentStock: res.stock }
        : r.id === workingId ? { ...r, currentStock: res.working }
        : r));
      if (res.log) setLog(prev => [res.log as LogEntry, ...prev]);
      return;
    }
    const [st, ws] = await Promise.all([fetchReagentStock(stockId), fetchReagentStock(workingId)]);
    setReagents(prev => prev.map(r =>
      r.id === stockId && st !== null ? { ...r, currentStock: st }
      : r.id === workingId && ws !== null ? { ...r, currentStock: ws }
      : r));
    setSyncError(`Prepare working solution: refused by the server (${res.error}). The stocks shown are the server's values.`);
  }, []);

  // ---- Cryo ----
  // One or many vials of the same batch: every row is written, one log line.
  const addCryoVials = useCallback((list: Omit<CryoVial, 'id'>[]) => {
    if (list.length === 0) return;
    const full: CryoVial[] = list.map(v => ({ ...v, id: generateId() }));
    setCryoVials(prev => [...prev, ...full]);
    // The database enforces one vial per slot (unique index). If someone
    // took the slot between our screen refresh and the save, drop the
    // optimistic vial and say exactly why instead of a generic sync error.
    full.forEach(v => {
      upsertCryoVialChecked(v).then(res => {
        if (res.ok) return;
        setCryoVials(prev => prev.filter(x => x.id !== v.id));
        setSyncError(res.slotTaken
          ? `Slot ${String.fromCharCode(65 + v.row)}${v.col + 1} was taken by another vial in the meantime — this vial was NOT stored. Reload and pick a free slot.`
          : `Cryo vial: the change was NOT saved to the server (${res.error}). Check your connection, then reload and retry.`);
      });
    });
    const v = full[0];
    const cells = v.cells ? `, ${formatCells(v.cells)} cells` : '';
    addLogEntry({
      userId: user.id, userName: user.name,
      action: full.length === 1 ? `Stored vial ${v.cellLine}` : `Stored ${full.length} vials ${v.cellLine}`,
      category: 'cryo',
      details: `${v.storageUnitId} R${v.rack} B${v.box}, P${v.passage}${cells}`,
    });
  }, [user, addLogEntry]);
  const addCryoVial = useCallback((v: Omit<CryoVial, 'id'>) => addCryoVials([v]), [addCryoVials]);

  const removeCryoVial = useCallback((id: string) => {
    setCryoVials(prev => {
      const vl = prev.find(v => v.id === id);
      if (vl) addLogEntry({ userId: user.id, userName: user.name, action: `Withdrew vial ${vl.cellLine}`, category: 'cryo', details: `P${vl.passage}${vl.cells ? `, ${formatCells(vl.cells)} cells` : ''} — R${vl.rack} B${vl.box} (${String.fromCharCode(65 + vl.row)}${vl.col + 1})${vl.userId !== user.id ? ` — frozen by ${vl.userName}` : ''}` });
      return prev.filter(v => v.id !== id);
    });
    track(deleteCryoVial(id), 'Cryo vial removal');
  }, [user, addLogEntry, track]);

  // ---- Wishlist ----
  const addWishlistItem = useCallback((item: Omit<WishlistItem, 'id' | 'timestamp' | 'status'>) => {
    const full: WishlistItem = { ...item, id: generateId(), timestamp: new Date().toISOString(), status: 'pending' };
    setWishlist(prev => [...prev, full]);
    track(upsertWishlistItem(full), 'Wishlist request');
    addLogEntry({ userId: user.id, userName: user.name, action: `Requested ${item.name}`, category: 'wishlist', details: `${item.supplier} ${item.catalogNumber}` });
  }, [user, addLogEntry, track]);

  const updateWishlistStatus = useCallback((id: string, status: WishlistItem['status'], approvedBy?: string, extra?: Partial<Pick<WishlistItem, 'stockedToReagentId' | 'stockedToStorageUnitId'>>) => {
    setWishlist(prev => {
      const updated = prev.map(w => w.id === id ? {
        ...w, status, approvedBy: approvedBy || w.approvedBy,
        deliveredAt: status === 'delivered' ? new Date().toISOString() : w.deliveredAt,
        ...(extra || {}),
      } : w);
      const w = updated.find(x => x.id === id);
      if (w) track(upsertWishlistItem(w, 'update'), 'Wishlist update');
      return updated;
    });
    const it = wishlist.find(w => w.id === id);
    addLogEntry({ userId: user.id, userName: user.name, action: `${status} ${it?.name || id}`, category: 'wishlist', details: `Status → ${status}` });
  }, [user, wishlist, addLogEntry, track]);

  // ---- Users (Supabase) ----
  const addUser = useCallback(async (u: LabUser) => {
    const { user: result, error } = await insertLabUser(u);
    // No optimistic insert: a failed save must not leave a ghost user in the list.
    if (!result) { setSyncError(`User "${u.name}" was NOT saved to the server${error ? ` — ${error}` : ''}. Reload and retry.`); return; }
    setUsers(prev => [...prev, result]);
    addLogEntry({ userId: user.id, userName: user.name, action: `Added user ${u.name}`, category: 'auth', details: `${u.role}, ${u.email}` });
  }, [user, addLogEntry]);

  const updateUser = useCallback(async (u: LabUser) => {
    const { ok, error } = await updateLabUser(u);
    if (!ok) { setSyncError(`User "${u.name}" was NOT saved to the server${error ? ` — ${error}` : ''}. Reload and retry.`); return; }
    setUsers(prev => prev.map(x => x.id === u.id ? u : x));
    addLogEntry({ userId: user.id, userName: user.name, action: `Updated user ${u.name}`, category: 'auth', details: u.role });
  }, [user, addLogEntry]);

  const removeUser = useCallback(async (id: string) => {
    const { ok, error } = await deleteLabUser(id);
    if (!ok) { setSyncError(`User removal was NOT saved to the server${error ? ` — ${error}` : ''}. Reload and retry.`); return; }
    setUsers(prev => {
      const u2 = prev.find(x => x.id === id);
      if (u2) addLogEntry({ userId: user.id, userName: user.name, action: `Removed user ${u2.name}`, category: 'auth', details: u2.email });
      return prev.filter(x => x.id !== id);
    });
  }, [user, addLogEntry]);

  // ---- Reagents CRUD ----
  const updateWishlistItem = useCallback((w: WishlistItem) => {
    setWishlist(prev => prev.map(x => x.id === w.id ? w : x));
    track(upsertWishlistItem(w, 'update'), 'Wishlist edit');
    addLogEntry({ userId: user.id, userName: user.name, action: `Edited request ${w.name}`, category: 'wishlist', details: `${w.supplier} ${w.catalogNumber} · €${w.estimatedCost} × ${w.quantity}` });
  }, [user, addLogEntry, track]);

  const removeWishlistItem = useCallback((id: string) => {
    setWishlist(prev => {
      const w = prev.find(x => x.id === id);
      if (w) addLogEntry({ userId: user.id, userName: user.name, action: `Deleted request ${w.name}`, category: 'wishlist', details: `${w.supplier} ${w.catalogNumber}` });
      return prev.filter(x => x.id !== id);
    });
    track(deleteWishlistItem(id), 'Wishlist deletion');
  }, [user, addLogEntry, track]);

  const addNewReagent = useCallback((r: Reagent) => { setReagents(prev => [...prev, r]); track(upsertReagent(r), `Reagent "${r.name}"`); addLogEntry({ userId: user.id, userName: user.name, action: `Added reagent ${r.name}`, category: 'reagent', details: `${r.supplier} ${r.catalogNumber}` }); }, [user, addLogEntry, track]);
  // keepServerStock: the admin edit form did not touch the stock, so do not
  // overwrite current_stock with the (possibly stale) value the form loaded —
  // concurrent withdrawals through the RPC would be silently undone.
  const updateReagent = useCallback((r: Reagent, opts?: { keepServerStock?: boolean }) => {
    const keep = !!opts?.keepServerStock;
    setReagents(prev => prev.map(x => x.id === r.id ? (keep ? { ...r, currentStock: x.currentStock } : r) : x));
    track(upsertReagent(r, { skipStock: keep }), `Reagent "${r.name}"`);
  }, [track]);
  const removeReagent = useCallback((id: string) => { setReagents(prev => { const r = prev.find(x => x.id === id); if (r) addLogEntry({ userId: user.id, userName: user.name, action: `Removed reagent ${r.name}`, category: 'reagent', details: r.catalogNumber }); return prev.filter(x => x.id !== id); }); track(deleteReagent(id), 'Reagent removal'); }, [user, addLogEntry, track]);

  // ---- Instruments ----
  const addInstrument = useCallback((i: Instrument) => { setInstruments(prev => [...prev, i]); track(upsertInstrument(i), `Instrument "${i.name}"`); addLogEntry({ userId: user.id, userName: user.name, action: `Added instrument ${i.name}`, category: 'booking', details: `${i.category}, ${i.location}` }); }, [user, addLogEntry, track]);
  const updateInstrument = useCallback((i: Instrument) => { setInstruments(prev => prev.map(x => x.id === i.id ? i : x)); track(upsertInstrument(i), `Instrument "${i.name}"`); }, [track]);
  // Server first: the caller only cleans up bookings/certifications/maintenance
  // logs after the instrument row is really gone.
  const removeInstrument = useCallback(async (id: string): Promise<boolean> => {
    const ok = await deleteInstrument(id);
    if (!ok) { setSyncError('Instrument removal was NOT saved to the server. Reload and retry.'); return false; }
    setInstruments(prev => { const i = prev.find(x => x.id === id); if (i) addLogEntry({ userId: user.id, userName: user.name, action: `Removed instrument ${i.name}`, category: 'booking', details: i.category }); return prev.filter(x => x.id !== id); });
    return true;
  }, [user, addLogEntry]);

  // ---- Manuals ----
  const addManual = useCallback((m: Manual) => { setManuals(prev => [...prev, m]); track(upsertManual(m), `Document "${m.title}"`); addLogEntry({ userId: user.id, userName: user.name, action: `Added manual ${m.title}`, category: 'manual', details: m.category }); }, [user, addLogEntry, track]);
  const updateManual = useCallback((m: Manual) => { setManuals(prev => prev.map(x => x.id === m.id ? m : x)); track(upsertManual(m), `Document "${m.title}"`); }, [track]);
  const removeManual = useCallback((id: string) => {
    setManuals(prev => { const m = prev.find(x => x.id === id); if (m) addLogEntry({ userId: user.id, userName: user.name, action: `Removed manual ${m.title}`, category: 'manual', details: m.category }); return prev.filter(x => x.id !== id); });
    track(deleteManual(id), 'Document removal');
    // Move the PDF to trash/ so the history can bring the manual back. If the
    // move fails the file stays where it is and the admin is told (a PDF is
    // never hard-deleted from here).
    import('@/lib/supabase-storage')
      .then(({ deleteManualFile }) => deleteManualFile(id))
      .then(ok => { if (!ok) setSyncError('The document was removed but its PDF could not be moved to the trash: the file is still in storage. Check the storage policies, then move it by hand from the Supabase dashboard.'); })
      .catch(() => setSyncError('The document was removed but its PDF could not be moved to the trash: the file is still in storage.'));
  }, [user, addLogEntry, track]);

  // ---- Storage Units ----
  const addStorageUnit = useCallback((s: StorageUnit) => { setStorageUnits(prev => [...prev, s]); track(upsertStorageUnit(s), `Storage unit "${s.name}"`); addLogEntry({ userId: user.id, userName: user.name, action: `Added storage unit ${s.name}`, category: 'cryo', details: `${s.type}, ${s.temperature}` }); }, [user, addLogEntry, track]);
  const updateStorageUnit = useCallback((s: StorageUnit) => { setStorageUnits(prev => prev.map(x => x.id === s.id ? s : x)); track(upsertStorageUnit(s), `Storage unit "${s.name}"`); }, [track]);
  const addStorageBox = useCallback((b: StorageBox) => { setStorageBoxes(prev => [...prev, b]); track(upsertStorageBox(b), `Box "${b.label}"`); }, [track]);
  const updateStorageBox = useCallback((b: StorageBox) => { setStorageBoxes(prev => prev.map(x => x.id === b.id ? b : x)); track(upsertStorageBox(b), `Box "${b.label}"`); }, [track]);
  const removeStorageBox = useCallback((id: string) => { setStorageBoxes(prev => prev.filter(x => x.id !== id)); track(deleteStorageBox(id), 'Box removal'); }, [track]);

  const removeStorageUnit = useCallback((id: string) => { setStorageUnits(prev => { const s = prev.find(x => x.id === id); if (s) addLogEntry({ userId: user.id, userName: user.name, action: `Removed storage unit ${s.name}`, category: 'cryo', details: s.type }); return prev.filter(x => x.id !== id); }); track(deleteStorageUnit(id), 'Storage unit removal'); }, [user, addLogEntry, track]);

  // ---- Projects ----
  const addProject = useCallback((p: Project) => { setProjects(prev => [...prev, p]); track(upsertProject(p), `Project "${p.name}"`); addLogEntry({ userId: user.id, userName: user.name, action: `Added project ${p.name}`, category: 'auth', details: p.description }); }, [user, addLogEntry, track]);
  const updateProject = useCallback((p: Project) => { setProjects(prev => prev.map(x => x.id === p.id ? p : x)); track(upsertProject(p), `Project "${p.name}"`); }, [track]);
  const removeProject = useCallback((id: string) => { setProjects(prev => { const p = prev.find(x => x.id === id); if (p) addLogEntry({ userId: user.id, userName: user.name, action: `Removed project ${p.name}`, category: 'auth', details: p.description }); return prev.filter(x => x.id !== id); }); track(deleteProject(id), 'Project removal'); }, [user, addLogEntry, track]);

  // ---- Certifications ----
  const addCertification = useCallback((c: Certification) => { setCertifications(prev => [...prev, c]); track(upsertCertification(c), `Certification "${c.name}"`); addLogEntry({ userId: user.id, userName: user.name, action: `Added cert ${c.name}`, category: 'auth', details: c.description }); }, [user, addLogEntry, track]);
  const updateCertification = useCallback((c: Certification) => { setCertifications(prev => prev.map(x => x.id === c.id ? c : x)); track(upsertCertification(c), `Certification "${c.name}"`); }, [track]);
  const removeCertification = useCallback((id: string) => { setCertifications(prev => { const c = prev.find(x => x.id === id); if (c) addLogEntry({ userId: user.id, userName: user.name, action: `Removed cert ${c.name}`, category: 'auth', details: c.description }); return prev.filter(x => x.id !== id); }); track(deleteCertification(id), 'Certification removal'); }, [user, addLogEntry, track]);

  // ---- Locations ----
  const addLocation = useCallback((l: Location) => { setLocations(prev => [...prev, l]); track(upsertLocation(l), `Location "${l.name}"`); addLogEntry({ userId: user.id, userName: user.name, action: `Added location ${l.name}`, category: 'auth', details: `${l.building || ''} ${l.floor || ''}`.trim() }); }, [user, addLogEntry, track]);
  const updateLocation = useCallback((l: Location) => { setLocations(prev => prev.map(x => x.id === l.id ? l : x)); track(upsertLocation(l), `Location "${l.name}"`); }, [track]);
  const removeLocation = useCallback((id: string) => { setLocations(prev => { const l = prev.find(x => x.id === id); if (l) addLogEntry({ userId: user.id, userName: user.name, action: `Removed location ${l.name}`, category: 'auth', details: '' }); return prev.filter(x => x.id !== id); }); track(deleteLocation(id), 'Location removal'); }, [user, addLogEntry, track]);

  if (!loaded) return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-50"><div className="animate-pulse text-gray-500 font-manrope">Loading Lab Manager...</div></div>;

  return (
    <LabContext.Provider value={{
      user, permissions: (() => {
        const base = user.affiliation === 'MiMic Lab' ? rolePermissions[user.role] : externalRolePermissions[user.role];
        return { ...base, canAdmin: base.canAdmin || user.isAdmin };
      })(), currentPage, setCurrentPage,
      bookings, addBooking, updateBooking, removeBooking, approveBooking, addBookingSeries, removeBookingSeries,
      bookingSettings, updateBookingSettings,
      canManageAllBookings: user.isAdmin || ['admin', 'pi', 'lab_manager'].includes(user.role),
      absences, addAbsence, updateAbsence, removeAbsence,
      absenceSettings, updateAbsenceSettings,
      cellTypes, updateCellTypes,
      canApproveAbsences: user.isAdmin || ['admin', 'pi'].includes(user.role),
      reagents, withdrawReagent, addReagentStock, prepareWorkingSolution,
      cryoVials, addCryoVial, addCryoVials, removeCryoVial,
      wishlist, addWishlistItem, updateWishlistStatus, updateWishlistItem, removeWishlistItem,
      log, addLogEntry,
      users, addUser, updateUser, removeUser,
      addNewReagent, updateReagent, removeReagent,
      instruments, addInstrument, updateInstrument, removeInstrument, reportError: setSyncError,
      manuals, addManual, updateManual, removeManual,
      storageUnits, addStorageUnit, updateStorageUnit, removeStorageUnit,
      storageBoxes, addStorageBox, updateStorageBox, removeStorageBox,
      projects, addProject, updateProject, removeProject,
      certifications, addCertification, updateCertification, removeCertification,
      locations, addLocation, updateLocation, removeLocation,
    }}>
      {children}
      {syncError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[95] max-w-lg w-[calc(100%-2rem)] bg-red-600 text-white rounded-xl shadow-lg px-4 py-3 flex items-start gap-3 font-manrope">
          <span className="text-sm leading-snug flex-1">{syncError}</span>
          <button onClick={() => window.location.reload()} className="shrink-0 px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-semibold">Reload</button>
          <button onClick={() => setSyncError(null)} className="shrink-0 px-2 py-1 rounded-lg hover:bg-white/20 text-xs font-semibold" aria-label="Dismiss">✕</button>
        </div>
      )}
    </LabContext.Provider>
  );
}
