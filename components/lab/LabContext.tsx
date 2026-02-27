'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  LabUser, Booking, Reagent, CryoVial, WishlistItem, LogEntry, Instrument, Manual,
  StorageUnit, Project, Certification, Location,
  rolePermissions, externalRolePermissions, mockReagents, mockInstruments, mockUsers, mockManuals,
  mockStorageUnits, mockProjects, mockCertifications, mockLocations,
  generateId, migrateReagentCategories, migrateStorageUnits, mergeMockDefaults,
  getInitialBookings, getInitialCryoVials, getInitialWishlist, getInitialLog,
} from '@/data/lab-data';
import { fetchLabUsers, insertLabUser, updateLabUser, deleteLabUser } from '@/lib/supabase-users';
import {
  fetchInstruments, upsertInstrument, deleteInstrument,
  fetchLocations, upsertLocation, deleteLocation,
  fetchProjects, upsertProject, deleteProject,
  fetchCertifications, upsertCertification, deleteCertification,
  fetchStorageUnits, upsertStorageUnit, deleteStorageUnit,
  fetchReagents, upsertReagent, deleteReagent,
  fetchBookings, upsertBooking, deleteBooking,
  fetchCryoVials, upsertCryoVial, deleteCryoVial,
  fetchWishlist, upsertWishlistItem,
  fetchLogEntries, insertLogEntry,
  fetchManuals, upsertManual, deleteManual,
} from '@/lib/supabase-data';

interface LabContextType {
  user: LabUser;
  permissions: typeof rolePermissions[LabUser['role']];
  currentPage: string;
  setCurrentPage: (page: string) => void;
  bookings: Booking[];
  addBooking: (b: Omit<Booking, 'id' | 'createdAt'>) => void;
  removeBooking: (id: string) => void;
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
  const [loaded, setLoaded] = useState(false);

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

      // Use Supabase data if available, else fall back to localStorage/mock
      setUsers(sbUsers.length > 0 ? sbUsers : (localData.users as LabUser[]) || [...mockUsers]);
      setInstruments(sbInstruments.length > 0 ? sbInstruments : (localData.instruments ? mergeMockDefaults(localData.instruments as Instrument[], mockInstruments, del) : [...mockInstruments]));
      setLocations(sbLocations.length > 0 ? sbLocations : (localData.locations ? mergeMockDefaults(localData.locations as Location[], mockLocations, del) : [...mockLocations]));
      setProjects(sbProjects.length > 0 ? sbProjects : (localData.projects ? mergeMockDefaults(localData.projects as Project[], mockProjects, del) : [...mockProjects]));
      setCertifications(sbCertifications.length > 0 ? sbCertifications : (localData.certifications ? mergeMockDefaults(localData.certifications as Certification[], mockCertifications, del) : [...mockCertifications]));
      setStorageUnits(sbStorageUnits.length > 0 ? sbStorageUnits : (localData.storageUnits ? mergeMockDefaults(migrateStorageUnits((localData.storageUnits || localData.dewars) as StorageUnit[]), mockStorageUnits, del) : [...mockStorageUnits]));
      setReagents(sbReagents.length > 0 ? sbReagents : (localData.reagents ? migrateReagentCategories(mergeMockDefaults(localData.reagents as Reagent[], mockReagents, del)) : [...mockReagents]));
      setBookings(sbBookings.length > 0 ? sbBookings : (localData.bookings as Booking[]) || getInitialBookings());
      setCryoVials(sbCryoVials.length > 0 ? sbCryoVials : (localData.cryoVials as CryoVial[]) || getInitialCryoVials());
      setWishlist(sbWishlist.length > 0 ? sbWishlist : (localData.wishlist as WishlistItem[]) || getInitialWishlist());
      setLog(sbLog.length > 0 ? sbLog : (localData.log as LogEntry[]) || getInitialLog());

      setManuals(sbManuals.length > 0 ? sbManuals : (localData.manuals ? mergeMockDefaults(localData.manuals as Manual[], mockManuals, del) : [...mockManuals]));

      setLoaded(true);
    }
    loadData();
  }, []);

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
    upsertBooking(full);
    addLogEntry({ userId: b.userId, userName: b.userName, action: `Booked ${b.instrumentId}`, category: 'booking', details: `${b.date} ${b.startHour}:00-${b.endHour}:00` });
  }, [addLogEntry]);

  const removeBooking = useCallback((id: string) => {
    setBookings(prev => {
      const bk = prev.find(b => b.id === id);
      if (bk) addLogEntry({ userId: user.id, userName: user.name, action: `Cancelled ${bk.instrumentId}`, category: 'booking', details: bk.date });
      return prev.filter(b => b.id !== id);
    });
    deleteBooking(id);
  }, [user, addLogEntry]);

  // ---- Reagents ----
  const withdrawReagent = useCallback((reagentId: string, amount: number, purpose: string, project: string) => {
    setReagents(prev => {
      const updated = prev.map(r => r.id === reagentId ? { ...r, currentStock: Math.max(0, r.currentStock - amount) } : r);
      const r = updated.find(x => x.id === reagentId);
      if (r) upsertReagent(r);
      return updated;
    });
    const rg = reagents.find(r => r.id === reagentId);
    addLogEntry({ userId: user.id, userName: user.name, action: `Withdrew ${rg?.name || reagentId}`, category: 'reagent', details: `${amount} ${rg?.unit || ''} - ${purpose} (${project})` });
  }, [user, reagents, addLogEntry]);

  const addReagentStock = useCallback((reagentId: string, amount: number) => {
    setReagents(prev => {
      const updated = prev.map(r => r.id === reagentId ? { ...r, currentStock: Math.min(r.maxStock, r.currentStock + amount) } : r);
      const r = updated.find(x => x.id === reagentId);
      if (r) upsertReagent(r);
      return updated;
    });
    const rg = reagents.find(r => r.id === reagentId);
    addLogEntry({ userId: user.id, userName: user.name, action: `Restocked ${rg?.name || reagentId}`, category: 'reagent', details: `+${amount} ${rg?.unit || ''}` });
  }, [user, reagents, addLogEntry]);

  // ---- Cryo ----
  const addCryoVial = useCallback((v: Omit<CryoVial, 'id'>) => {
    const full: CryoVial = { ...v, id: generateId() };
    setCryoVials(prev => [...prev, full]);
    upsertCryoVial(full);
    addLogEntry({ userId: user.id, userName: user.name, action: `Stored vial ${v.cellLine}`, category: 'cryo', details: `${v.storageUnitId} R${v.rack} B${v.box}, P${v.passage}` });
  }, [user, addLogEntry]);

  const removeCryoVial = useCallback((id: string) => {
    setCryoVials(prev => {
      const vl = prev.find(v => v.id === id);
      if (vl) addLogEntry({ userId: user.id, userName: user.name, action: `Withdrew vial ${vl.cellLine}`, category: 'cryo', details: `${vl.storageUnitId} R${vl.rack} B${vl.box}, P${vl.passage}` });
      return prev.filter(v => v.id !== id);
    });
    deleteCryoVial(id);
  }, [user, addLogEntry]);

  // ---- Wishlist ----
  const addWishlistItem = useCallback((item: Omit<WishlistItem, 'id' | 'timestamp' | 'status'>) => {
    const full: WishlistItem = { ...item, id: generateId(), timestamp: new Date().toISOString(), status: 'pending' };
    setWishlist(prev => [...prev, full]);
    upsertWishlistItem(full);
    addLogEntry({ userId: user.id, userName: user.name, action: `Requested ${item.name}`, category: 'wishlist', details: `${item.supplier} ${item.catalogNumber}` });
  }, [user, addLogEntry]);

  const updateWishlistStatus = useCallback((id: string, status: WishlistItem['status'], approvedBy?: string) => {
    setWishlist(prev => {
      const updated = prev.map(w => w.id === id ? {
        ...w, status, approvedBy: approvedBy || w.approvedBy,
        deliveredAt: status === 'delivered' ? new Date().toISOString() : w.deliveredAt,
      } : w);
      const w = updated.find(x => x.id === id);
      if (w) upsertWishlistItem(w);
      return updated;
    });
    const it = wishlist.find(w => w.id === id);
    addLogEntry({ userId: user.id, userName: user.name, action: `${status} ${it?.name || id}`, category: 'wishlist', details: `Status → ${status}` });
  }, [user, wishlist, addLogEntry]);

  // ---- Users (Supabase) ----
  const addUser = useCallback(async (u: LabUser) => {
    const result = await insertLabUser(u);
    setUsers(prev => [...prev, result || u]);
    addLogEntry({ userId: user.id, userName: user.name, action: `Added user ${u.name}`, category: 'auth', details: `${u.role}, ${u.email}` });
  }, [user, addLogEntry]);

  const updateUser = useCallback(async (u: LabUser) => {
    await updateLabUser(u);
    setUsers(prev => prev.map(x => x.id === u.id ? u : x));
    addLogEntry({ userId: user.id, userName: user.name, action: `Updated user ${u.name}`, category: 'auth', details: u.role });
  }, [user, addLogEntry]);

  const removeUser = useCallback(async (id: string) => {
    await deleteLabUser(id);
    setUsers(prev => {
      const u2 = prev.find(x => x.id === id);
      if (u2) addLogEntry({ userId: user.id, userName: user.name, action: `Removed user ${u2.name}`, category: 'auth', details: u2.email });
      return prev.filter(x => x.id !== id);
    });
  }, [user, addLogEntry]);

  // ---- Reagents CRUD ----
  const addNewReagent = useCallback((r: Reagent) => { setReagents(prev => [...prev, r]); upsertReagent(r); addLogEntry({ userId: user.id, userName: user.name, action: `Added reagent ${r.name}`, category: 'reagent', details: `${r.supplier} ${r.catalogNumber}` }); }, [user, addLogEntry]);
  const updateReagent = useCallback((r: Reagent) => { setReagents(prev => prev.map(x => x.id === r.id ? r : x)); upsertReagent(r); }, []);
  const removeReagent = useCallback((id: string) => { setReagents(prev => { const r = prev.find(x => x.id === id); if (r) addLogEntry({ userId: user.id, userName: user.name, action: `Removed reagent ${r.name}`, category: 'reagent', details: r.catalogNumber }); return prev.filter(x => x.id !== id); }); deleteReagent(id); }, [user, addLogEntry]);

  // ---- Instruments ----
  const addInstrument = useCallback((i: Instrument) => { setInstruments(prev => [...prev, i]); upsertInstrument(i); addLogEntry({ userId: user.id, userName: user.name, action: `Added instrument ${i.name}`, category: 'booking', details: `${i.category}, ${i.location}` }); }, [user, addLogEntry]);
  const updateInstrument = useCallback((i: Instrument) => { setInstruments(prev => prev.map(x => x.id === i.id ? i : x)); upsertInstrument(i); }, []);
  const removeInstrument = useCallback((id: string) => { setInstruments(prev => { const i = prev.find(x => x.id === id); if (i) addLogEntry({ userId: user.id, userName: user.name, action: `Removed instrument ${i.name}`, category: 'booking', details: i.category }); return prev.filter(x => x.id !== id); }); deleteInstrument(id); }, [user, addLogEntry]);

  // ---- Manuals ----
  const addManual = useCallback((m: Manual) => { setManuals(prev => [...prev, m]); upsertManual(m); addLogEntry({ userId: user.id, userName: user.name, action: `Added manual ${m.title}`, category: 'manual', details: m.category }); }, [user, addLogEntry]);
  const updateManual = useCallback((m: Manual) => { setManuals(prev => prev.map(x => x.id === m.id ? m : x)); upsertManual(m); }, []);
  const removeManual = useCallback((id: string) => { setManuals(prev => { const m = prev.find(x => x.id === id); if (m) addLogEntry({ userId: user.id, userName: user.name, action: `Removed manual ${m.title}`, category: 'manual', details: m.category }); return prev.filter(x => x.id !== id); }); deleteManual(id); }, [user, addLogEntry]);

  // ---- Storage Units ----
  const addStorageUnit = useCallback((s: StorageUnit) => { setStorageUnits(prev => [...prev, s]); upsertStorageUnit(s); addLogEntry({ userId: user.id, userName: user.name, action: `Added storage unit ${s.name}`, category: 'cryo', details: `${s.type}, ${s.temperature}` }); }, [user, addLogEntry]);
  const updateStorageUnit = useCallback((s: StorageUnit) => { setStorageUnits(prev => prev.map(x => x.id === s.id ? s : x)); upsertStorageUnit(s); }, []);
  const removeStorageUnit = useCallback((id: string) => { setStorageUnits(prev => { const s = prev.find(x => x.id === id); if (s) addLogEntry({ userId: user.id, userName: user.name, action: `Removed storage unit ${s.name}`, category: 'cryo', details: s.type }); return prev.filter(x => x.id !== id); }); deleteStorageUnit(id); }, [user, addLogEntry]);

  // ---- Projects ----
  const addProject = useCallback((p: Project) => { setProjects(prev => [...prev, p]); upsertProject(p); addLogEntry({ userId: user.id, userName: user.name, action: `Added project ${p.name}`, category: 'auth', details: p.description }); }, [user, addLogEntry]);
  const updateProject = useCallback((p: Project) => { setProjects(prev => prev.map(x => x.id === p.id ? p : x)); upsertProject(p); }, []);
  const removeProject = useCallback((id: string) => { setProjects(prev => { const p = prev.find(x => x.id === id); if (p) addLogEntry({ userId: user.id, userName: user.name, action: `Removed project ${p.name}`, category: 'auth', details: p.description }); return prev.filter(x => x.id !== id); }); deleteProject(id); }, [user, addLogEntry]);

  // ---- Certifications ----
  const addCertification = useCallback((c: Certification) => { setCertifications(prev => [...prev, c]); upsertCertification(c); addLogEntry({ userId: user.id, userName: user.name, action: `Added cert ${c.name}`, category: 'auth', details: c.description }); }, [user, addLogEntry]);
  const updateCertification = useCallback((c: Certification) => { setCertifications(prev => prev.map(x => x.id === c.id ? c : x)); upsertCertification(c); }, []);
  const removeCertification = useCallback((id: string) => { setCertifications(prev => { const c = prev.find(x => x.id === id); if (c) addLogEntry({ userId: user.id, userName: user.name, action: `Removed cert ${c.name}`, category: 'auth', details: c.description }); return prev.filter(x => x.id !== id); }); deleteCertification(id); }, [user, addLogEntry]);

  // ---- Locations ----
  const addLocation = useCallback((l: Location) => { setLocations(prev => [...prev, l]); upsertLocation(l); addLogEntry({ userId: user.id, userName: user.name, action: `Added location ${l.name}`, category: 'auth', details: `${l.building || ''} ${l.floor || ''}`.trim() }); }, [user, addLogEntry]);
  const updateLocation = useCallback((l: Location) => { setLocations(prev => prev.map(x => x.id === l.id ? l : x)); upsertLocation(l); }, []);
  const removeLocation = useCallback((id: string) => { setLocations(prev => { const l = prev.find(x => x.id === id); if (l) addLogEntry({ userId: user.id, userName: user.name, action: `Removed location ${l.name}`, category: 'auth', details: '' }); return prev.filter(x => x.id !== id); }); deleteLocation(id); }, [user, addLogEntry]);

  if (!loaded) return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-50"><div className="animate-pulse text-gray-500 font-manrope">Loading Lab Manager...</div></div>;

  return (
    <LabContext.Provider value={{
      user, permissions: (() => {
        const base = user.affiliation === 'MiMic Lab' ? rolePermissions[user.role] : externalRolePermissions[user.role];
        return { ...base, canAdmin: base.canAdmin || user.isAdmin };
      })(), currentPage, setCurrentPage,
      bookings, addBooking, removeBooking,
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
    </LabContext.Provider>
  );
}
