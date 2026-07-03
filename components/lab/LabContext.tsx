'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  LabUser, Booking, Reagent, CryoVial, WishlistItem, LogEntry, Instrument, Manual,
  StorageUnit, Project, Certification, Location, BookingSettings,
  rolePermissions, externalRolePermissions, mockReagents, mockInstruments, mockUsers, mockManuals,
  mockStorageUnits, mockProjects, mockCertifications, mockLocations,
  generateId, migrateReagentCategories, migrateStorageUnits, mergeMockDefaults,
  getInitialBookings, getInitialCryoVials, getInitialWishlist, getInitialLog,
  defaultBookingSettings, sanitizeBookingSettings, formatTime,
} from '@/data/lab-data';
import { fetchLabUsers, insertLabUser, updateLabUser, deleteLabUser } from '@/lib/supabase-users';
import {
  fetchInstruments, upsertInstrument, deleteInstrument,
  fetchLocations, upsertLocation, deleteLocation,
  fetchProjects, upsertProject, deleteProject,
  fetchCertifications, upsertCertification, deleteCertification,
  fetchStorageUnits, upsertStorageUnit, deleteStorageUnit,
  fetchReagents, upsertReagent, deleteReagent, adjustReagentStock,
  fetchBookings, upsertBooking, deleteBooking,
  fetchCryoVials, upsertCryoVial, deleteCryoVial,
  fetchWishlist, upsertWishlistItem,
  fetchLogEntries, insertLogEntry,
  fetchManuals, upsertManual, deleteManual,
  fetchAppSetting, upsertAppSetting,
} from '@/lib/supabase-data';

const BOOKING_SETTINGS_KEY = 'booking_settings';

interface LabContextType {
  user: LabUser;
  permissions: typeof rolePermissions[LabUser['role']];
  currentPage: string;
  setCurrentPage: (page: string) => void;
  bookings: Booking[];
  addBooking: (b: Omit<Booking, 'id' | 'createdAt'>) => void;
  updateBooking: (b: Booking) => void;
  removeBooking: (id: string) => void;
  bookingSettings: BookingSettings;
  updateBookingSettings: (s: BookingSettings) => void;
  canManageAllBookings: boolean;
  reagents: Reagent[];
  withdrawReagent: (reagentId: string, amount: number, purpose: string, project: string) => void;
  addReagentStock: (reagentId: string, amount: number) => void;
  cryoVials: CryoVial[];
  addCryoVial: (v: Omit<CryoVial, 'id'>) => void;
  removeCryoVial: (id: string) => void;
  wishlist: WishlistItem[];
  addWishlistItem: (item: Omit<WishlistItem, 'id' | 'timestamp' | 'status'>) => void;
  updateWishlistStatus: (id: string, status: WishlistItem['status'], approvedBy?: string) => void;
  log: LogEntry[];
  addLogEntry: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  users: LabUser[];
  addUser: (u: LabUser) => void | Promise<void>;
  updateUser: (u: LabUser) => void | Promise<void>;
  removeUser: (id: string) => void | Promise<void>;
  addNewReagent: (r: Reagent) => void;
  updateReagent: (r: Reagent) => void;
  removeReagent: (id: string) => void;
  instruments: Instrument[];
  addInstrument: (i: Instrument) => void;
  updateInstrument: (i: Instrument) => void;
  removeInstrument: (id: string) => void;
  manuals: Manual[];
  addManual: (m: Manual) => void;
  updateManual: (m: Manual) => void;
  removeManual: (id: string) => void;
  storageUnits: StorageUnit[];
  addStorageUnit: (s: StorageUnit) => void;
  updateStorageUnit: (s: StorageUnit) => void;
  removeStorageUnit: (id: string) => void;
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [bookingSettings, setBookingSettings] = useState<BookingSettings>(defaultBookingSettings);
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
      // Fallback data from localStorage (for migration / offline)
      let localData: Record<string, unknown> = {};
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) localData = JSON.parse(saved);
      } catch { /* noop */ }
      const del = new Set<string>((localData._deletedIds as string[]) || []);

      // Fetch everything from Supabase in parallel
      const [
        sbUsers, sbInstruments, sbLocations, sbProjects, sbCertifications,
        sbStorageUnits, sbReagents, sbBookings, sbCryoVials, sbWishlist,
        sbLog, sbManuals,
      ] = await Promise.all([
        fetchLabUsers(),
        fetchInstruments(),
        fetchLocations(),
        fetchProjects(),
        fetchCertifications(),
        fetchStorageUnits(),
        fetchReagents(),
        fetchBookings(),
        fetchCryoVials(),
        fetchWishlist(),
        fetchLogEntries(),
        fetchManuals(),
      ]);

      // Use Supabase data when the fetch succeeded (even if the table is
      // empty). Fall back to localStorage/mock ONLY when the fetch failed
      // (null) — e.g. DB unreachable — and warn the user we're offline.
      setUsers(sbUsers ?? (localData.users as LabUser[]) ?? [...mockUsers]);
      setInstruments(sbInstruments ?? (localData.instruments ? mergeMockDefaults(localData.instruments as Instrument[], mockInstruments, del) : [...mockInstruments]));
      setLocations(sbLocations ?? (localData.locations ? mergeMockDefaults(localData.locations as Location[], mockLocations, del) : [...mockLocations]));
      setProjects(sbProjects ?? (localData.projects ? mergeMockDefaults(localData.projects as Project[], mockProjects, del) : [...mockProjects]));
      setCertifications(sbCertifications ?? (localData.certifications ? mergeMockDefaults(localData.certifications as Certification[], mockCertifications, del) : [...mockCertifications]));
      setStorageUnits(sbStorageUnits ?? (localData.storageUnits ? mergeMockDefaults(migrateStorageUnits((localData.storageUnits || localData.dewars) as StorageUnit[]), mockStorageUnits, del) : [...mockStorageUnits]));
      setReagents(sbReagents ?? (localData.reagents ? migrateReagentCategories(mergeMockDefaults(localData.reagents as Reagent[], mockReagents, del)) : [...mockReagents]));
      setBookings(sbBookings ?? (localData.bookings as Booking[]) ?? getInitialBookings());
      setCryoVials(sbCryoVials ?? (localData.cryoVials as CryoVial[]) ?? getInitialCryoVials());
      setWishlist(sbWishlist ?? (localData.wishlist as WishlistItem[]) ?? getInitialWishlist());
      setLog(sbLog ?? (localData.log as LogEntry[]) ?? getInitialLog());
      setManuals(sbManuals ?? (localData.manuals ? mergeMockDefaults(localData.manuals as Manual[], mockManuals, del) : [...mockManuals]));

      // If any core fetch failed, the data on screen is a local fallback —
      // make that visible instead of silently showing stale/demo data.
      if ([sbUsers, sbInstruments, sbReagents, sbBookings, sbCryoVials, sbWishlist, sbManuals].some(x => x === null)) {
        setSyncError('Could not load data from the server — showing local fallback data. Changes may not be saved. Check your connection and reload.');
      }

      // Booking settings: Supabase → localStorage → defaults
      const sbSettings = await fetchAppSetting<Partial<BookingSettings>>(BOOKING_SETTINGS_KEY);
      const localSettings = localData.bookingSettings as Partial<BookingSettings> | undefined;
      setBookingSettings(sanitizeBookingSettings(sbSettings ?? localSettings ?? defaultBookingSettings));

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
  const addBooking = useCallback((b: Omit<Booking, 'id' | 'createdAt'>) => {
    const full: Booking = { ...b, id: generateId(), createdAt: new Date().toISOString() };
    setBookings(prev => [...prev, full]);
    track(upsertBooking(full), 'Booking');
    addLogEntry({ userId: b.userId, userName: b.userName, action: `Booked ${b.instrumentId}`, category: 'booking', details: `${b.date} ${formatTime(b.startHour)}-${formatTime(b.endHour)}` });
  }, [addLogEntry, track]);

  const updateBooking = useCallback((b: Booking) => {
    setBookings(prev => prev.map(x => x.id === b.id ? b : x));
    track(upsertBooking(b), 'Booking update');
    addLogEntry({ userId: user.id, userName: user.name, action: `Updated ${b.instrumentId}`, category: 'booking', details: `${b.date} ${formatTime(b.startHour)}-${formatTime(b.endHour)}` });
  }, [user, addLogEntry, track]);

  const removeBooking = useCallback((id: string) => {
    setBookings(prev => {
      const bk = prev.find(b => b.id === id);
      if (bk) addLogEntry({ userId: user.id, userName: user.name, action: `Cancelled ${bk.instrumentId}`, category: 'booking', details: bk.date });
      return prev.filter(b => b.id !== id);
    });
    track(deleteBooking(id), 'Booking cancellation');
  }, [user, addLogEntry, track]);

  const updateBookingSettings = useCallback((s: BookingSettings) => {
    const clean = sanitizeBookingSettings(s);
    setBookingSettings(clean);
    track(upsertAppSetting(BOOKING_SETTINGS_KEY, clean), 'Booking hours');
    addLogEntry({ userId: user.id, userName: user.name, action: 'Updated booking hours', category: 'booking', details: `Work ${clean.workStartHour}:00-${clean.workEndHour}:00, open ${clean.openStartHour}:00-${clean.openEndHour}:00, ${clean.slotMinutes}min slots` });
  }, [user, addLogEntry, track]);

  // ---- Reagents ----
  // Stock changes go through an atomic server-side RPC (no lost updates when
  // two people adjust the same reagent at once). Optimistic local update
  // first, then reconcile with the value returned by the server. Falls back
  // to the legacy full-row upsert if the RPC is not installed.
  const changeReagentStock = useCallback((reagentId: string, delta: number, label: string) => {
    setReagents(prev => prev.map(r => r.id === reagentId ? { ...r, currentStock: Math.min(r.maxStock, Math.max(0, r.currentStock + delta)) } : r));
    (async () => {
      const newStock = await adjustReagentStock(reagentId, delta);
      if (newStock !== null) {
        setReagents(prev => prev.map(r => r.id === reagentId ? { ...r, currentStock: newStock } : r));
      } else {
        setReagents(prev => {
          const r = prev.find(x => x.id === reagentId);
          if (r) track(upsertReagent(r), label);
          return prev;
        });
      }
    })();
  }, [track]);

  const withdrawReagent = useCallback((reagentId: string, amount: number, purpose: string, project: string) => {
    changeReagentStock(reagentId, -amount, 'Reagent withdrawal');
    const rg = reagents.find(r => r.id === reagentId);
    addLogEntry({ userId: user.id, userName: user.name, action: `Withdrew ${rg?.name || reagentId}`, category: 'reagent', details: `${amount} ${rg?.unit || ''} - ${purpose} (${project})` });
  }, [user, reagents, addLogEntry, changeReagentStock]);

  const addReagentStock = useCallback((reagentId: string, amount: number) => {
    changeReagentStock(reagentId, amount, 'Reagent restock');
    const rg = reagents.find(r => r.id === reagentId);
    addLogEntry({ userId: user.id, userName: user.name, action: `Restocked ${rg?.name || reagentId}`, category: 'reagent', details: `+${amount} ${rg?.unit || ''}` });
  }, [user, reagents, addLogEntry, changeReagentStock]);

  // ---- Cryo ----
  const addCryoVial = useCallback((v: Omit<CryoVial, 'id'>) => {
    const full: CryoVial = { ...v, id: generateId() };
    setCryoVials(prev => [...prev, full]);
    track(upsertCryoVial(full), 'Cryo vial');
    addLogEntry({ userId: user.id, userName: user.name, action: `Stored vial ${v.cellLine}`, category: 'cryo', details: `${v.storageUnitId} R${v.rack} B${v.box}, P${v.passage}` });
  }, [user, addLogEntry, track]);

  const removeCryoVial = useCallback((id: string) => {
    setCryoVials(prev => {
      const vl = prev.find(v => v.id === id);
      if (vl) addLogEntry({ userId: user.id, userName: user.name, action: `Withdrew vial ${vl.cellLine}`, category: 'cryo', details: `${vl.storageUnitId} R${vl.rack} B${vl.box}, P${vl.passage}` });
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

  const updateWishlistStatus = useCallback((id: string, status: WishlistItem['status'], approvedBy?: string) => {
    setWishlist(prev => {
      const updated = prev.map(w => w.id === id ? {
        ...w, status, approvedBy: approvedBy || w.approvedBy,
        deliveredAt: status === 'delivered' ? new Date().toISOString() : w.deliveredAt,
      } : w);
      const w = updated.find(x => x.id === id);
      if (w) track(upsertWishlistItem(w), 'Wishlist update');
      return updated;
    });
    const it = wishlist.find(w => w.id === id);
    addLogEntry({ userId: user.id, userName: user.name, action: `${status} ${it?.name || id}`, category: 'wishlist', details: `Status → ${status}` });
  }, [user, wishlist, addLogEntry, track]);

  // ---- Users (Supabase) ----
  const addUser = useCallback(async (u: LabUser) => {
    const result = await insertLabUser(u);
    if (!result) setSyncError(`User "${u.name}": the change was NOT saved to the server. Check your connection, then reload and retry.`);
    setUsers(prev => [...prev, result || u]);
    addLogEntry({ userId: user.id, userName: user.name, action: `Added user ${u.name}`, category: 'auth', details: `${u.role}, ${u.email}` });
  }, [user, addLogEntry]);

  const updateUser = useCallback(async (u: LabUser) => {
    const ok = await updateLabUser(u);
    if (!ok) setSyncError(`User "${u.name}": the change was NOT saved to the server. Check your connection, then reload and retry.`);
    setUsers(prev => prev.map(x => x.id === u.id ? u : x));
    addLogEntry({ userId: user.id, userName: user.name, action: `Updated user ${u.name}`, category: 'auth', details: u.role });
  }, [user, addLogEntry]);

  const removeUser = useCallback(async (id: string) => {
    const ok = await deleteLabUser(id);
    if (!ok) setSyncError('User removal: the change was NOT saved to the server. Check your connection, then reload and retry.');
    setUsers(prev => {
      const u2 = prev.find(x => x.id === id);
      if (u2) addLogEntry({ userId: user.id, userName: user.name, action: `Removed user ${u2.name}`, category: 'auth', details: u2.email });
      return prev.filter(x => x.id !== id);
    });
  }, [user, addLogEntry]);

  // ---- Reagents CRUD ----
  const addNewReagent = useCallback((r: Reagent) => { setReagents(prev => [...prev, r]); track(upsertReagent(r), `Reagent "${r.name}"`); addLogEntry({ userId: user.id, userName: user.name, action: `Added reagent ${r.name}`, category: 'reagent', details: `${r.supplier} ${r.catalogNumber}` }); }, [user, addLogEntry, track]);
  const updateReagent = useCallback((r: Reagent) => { setReagents(prev => prev.map(x => x.id === r.id ? r : x)); track(upsertReagent(r), `Reagent "${r.name}"`); }, [track]);
  const removeReagent = useCallback((id: string) => { setReagents(prev => { const r = prev.find(x => x.id === id); if (r) addLogEntry({ userId: user.id, userName: user.name, action: `Removed reagent ${r.name}`, category: 'reagent', details: r.catalogNumber }); return prev.filter(x => x.id !== id); }); track(deleteReagent(id), 'Reagent removal'); }, [user, addLogEntry, track]);

  // ---- Instruments ----
  const addInstrument = useCallback((i: Instrument) => { setInstruments(prev => [...prev, i]); track(upsertInstrument(i), `Instrument "${i.name}"`); addLogEntry({ userId: user.id, userName: user.name, action: `Added instrument ${i.name}`, category: 'booking', details: `${i.category}, ${i.location}` }); }, [user, addLogEntry, track]);
  const updateInstrument = useCallback((i: Instrument) => { setInstruments(prev => prev.map(x => x.id === i.id ? i : x)); track(upsertInstrument(i), `Instrument "${i.name}"`); }, [track]);
  const removeInstrument = useCallback((id: string) => { setInstruments(prev => { const i = prev.find(x => x.id === id); if (i) addLogEntry({ userId: user.id, userName: user.name, action: `Removed instrument ${i.name}`, category: 'booking', details: i.category }); return prev.filter(x => x.id !== id); }); track(deleteInstrument(id), 'Instrument removal'); }, [user, addLogEntry, track]);

  // ---- Manuals ----
  const addManual = useCallback((m: Manual) => { setManuals(prev => [...prev, m]); track(upsertManual(m), `Document "${m.title}"`); addLogEntry({ userId: user.id, userName: user.name, action: `Added manual ${m.title}`, category: 'manual', details: m.category }); }, [user, addLogEntry, track]);
  const updateManual = useCallback((m: Manual) => { setManuals(prev => prev.map(x => x.id === m.id ? m : x)); track(upsertManual(m), `Document "${m.title}"`); }, [track]);
  const removeManual = useCallback((id: string) => { setManuals(prev => { const m = prev.find(x => x.id === id); if (m) addLogEntry({ userId: user.id, userName: user.name, action: `Removed manual ${m.title}`, category: 'manual', details: m.category }); return prev.filter(x => x.id !== id); }); track(deleteManual(id), 'Document removal'); }, [user, addLogEntry, track]);

  // ---- Storage Units ----
  const addStorageUnit = useCallback((s: StorageUnit) => { setStorageUnits(prev => [...prev, s]); track(upsertStorageUnit(s), `Storage unit "${s.name}"`); addLogEntry({ userId: user.id, userName: user.name, action: `Added storage unit ${s.name}`, category: 'cryo', details: `${s.type}, ${s.temperature}` }); }, [user, addLogEntry, track]);
  const updateStorageUnit = useCallback((s: StorageUnit) => { setStorageUnits(prev => prev.map(x => x.id === s.id ? s : x)); track(upsertStorageUnit(s), `Storage unit "${s.name}"`); }, [track]);
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
      bookings, addBooking, updateBooking, removeBooking,
      bookingSettings, updateBookingSettings,
      canManageAllBookings: user.isAdmin || ['admin', 'pi', 'lab_manager'].includes(user.role),
      reagents, withdrawReagent, addReagentStock,
      cryoVials, addCryoVial, removeCryoVial,
      wishlist, addWishlistItem, updateWishlistStatus,
      log, addLogEntry,
      users, addUser, updateUser, removeUser,
      addNewReagent, updateReagent, removeReagent,
      instruments, addInstrument, updateInstrument, removeInstrument,
      manuals, addManual, updateManual, removeManual,
      storageUnits, addStorageUnit, updateStorageUnit, removeStorageUnit,
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
