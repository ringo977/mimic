'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  LabUser, Booking, Reagent, CryoVial, WishlistItem, LogEntry, Instrument,
  rolePermissions, mockReagents, mockInstruments, mockUsers, generateId,
  getInitialBookings, getInitialCryoVials, getInitialWishlist, getInitialLog,
} from '@/data/lab-data';

interface LabContextType {
  user: LabUser;
  permissions: typeof rolePermissions[LabUser['role']];
  currentPage: string;
  setCurrentPage: (page: string) => void;
  // Bookings
  bookings: Booking[];
  addBooking: (b: Omit<Booking, 'id' | 'createdAt'>) => void;
  removeBooking: (id: string) => void;
  // Reagents
  reagents: Reagent[];
  withdrawReagent: (reagentId: string, amount: number, purpose: string, project: string) => void;
  addReagentStock: (reagentId: string, amount: number) => void;
  // Cryo
  cryoVials: CryoVial[];
  addCryoVial: (v: Omit<CryoVial, 'id'>) => void;
  removeCryoVial: (id: string) => void;
  // Wishlist
  wishlist: WishlistItem[];
  addWishlistItem: (item: Omit<WishlistItem, 'id' | 'timestamp' | 'status'>) => void;
  updateWishlistStatus: (id: string, status: WishlistItem['status'], approvedBy?: string) => void;
  // Log
  log: LogEntry[];
  addLogEntry: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  // Admin: Users
  users: LabUser[];
  addUser: (u: LabUser) => void;
  updateUser: (u: LabUser) => void;
  removeUser: (id: string) => void;
  // Admin: Reagents CRUD
  addNewReagent: (r: Reagent) => void;
  updateReagent: (r: Reagent) => void;
  removeReagent: (id: string) => void;
  // Admin: Instruments
  instruments: Instrument[];
  addInstrument: (i: Instrument) => void;
  updateInstrument: (i: Instrument) => void;
  removeInstrument: (id: string) => void;
}

const LabContext = createContext<LabContextType | null>(null);

export function useLabContext() {
  const ctx = useContext(LabContext);
  if (!ctx) throw new Error('useLabContext must be used within LabProvider');
  return ctx;
}

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
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setBookings(data.bookings || getInitialBookings());
        setReagents(data.reagents || mockReagents);
        setCryoVials(data.cryoVials || getInitialCryoVials());
        setWishlist(data.wishlist || getInitialWishlist());
        setLog(data.log || getInitialLog());
        setUsers(data.users || [...mockUsers]);
        setInstruments(data.instruments || [...mockInstruments]);
      } else {
        setBookings(getInitialBookings());
        setReagents([...mockReagents]);
        setCryoVials(getInitialCryoVials());
        setWishlist(getInitialWishlist());
        setLog(getInitialLog());
        setUsers([...mockUsers]);
        setInstruments([...mockInstruments]);
      }
    } catch {
      setBookings(getInitialBookings());
      setReagents([...mockReagents]);
      setCryoVials(getInitialCryoVials());
      setWishlist(getInitialWishlist());
      setLog(getInitialLog());
      setUsers([...mockUsers]);
      setInstruments([...mockInstruments]);
    }
    setLoaded(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bookings, reagents, cryoVials, wishlist, log, users, instruments }));
  }, [bookings, reagents, cryoVials, wishlist, log, users, instruments, loaded]);

  const addLogEntry = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    setLog(prev => [{ ...entry, id: generateId(), timestamp: new Date().toISOString() }, ...prev]);
  }, []);

  // --- Bookings ---
  const addBooking = useCallback((b: Omit<Booking, 'id' | 'createdAt'>) => {
    const newB: Booking = { ...b, id: generateId(), createdAt: new Date().toISOString() };
    setBookings(prev => [...prev, newB]);
    addLogEntry({ userId: b.userId, userName: b.userName, action: `Booked ${b.instrumentId}`, category: 'booking', details: `${b.date} ${b.startHour}:00-${b.endHour}:00` });
  }, [addLogEntry]);

  const removeBooking = useCallback((id: string) => {
    setBookings(prev => {
      const booking = prev.find(b => b.id === id);
      if (booking) {
        addLogEntry({ userId: user.id, userName: user.name, action: `Cancelled booking ${booking.instrumentId}`, category: 'booking', details: `${booking.date} ${booking.startHour}:00-${booking.endHour}:00` });
      }
      return prev.filter(b => b.id !== id);
    });
  }, [user, addLogEntry]);

  // --- Reagents ---
  const withdrawReagent = useCallback((reagentId: string, amount: number, purpose: string, project: string) => {
    setReagents(prev => prev.map(r => r.id === reagentId ? { ...r, currentStock: Math.max(0, r.currentStock - amount) } : r));
    const reagent = reagents.find(r => r.id === reagentId);
    addLogEntry({ userId: user.id, userName: user.name, action: `Withdrew ${reagent?.name || reagentId}`, category: 'reagent', details: `${amount} ${reagent?.unit || ''} - ${purpose} (${project})` });
  }, [user, reagents, addLogEntry]);

  const addReagentStock = useCallback((reagentId: string, amount: number) => {
    setReagents(prev => prev.map(r => r.id === reagentId ? { ...r, currentStock: Math.min(r.maxStock, r.currentStock + amount) } : r));
    const reagent = reagents.find(r => r.id === reagentId);
    addLogEntry({ userId: user.id, userName: user.name, action: `Restocked ${reagent?.name || reagentId}`, category: 'reagent', details: `+${amount} ${reagent?.unit || ''}` });
  }, [user, reagents, addLogEntry]);

  // --- Cryo ---
  const addCryoVial = useCallback((v: Omit<CryoVial, 'id'>) => {
    setCryoVials(prev => [...prev, { ...v, id: generateId() }]);
    addLogEntry({ userId: user.id, userName: user.name, action: `Stored vial ${v.cellLine}`, category: 'cryo', details: `T${v.tank} R${v.rack} B${v.box} ${String.fromCharCode(65 + v.row)}${v.col + 1}, P${v.passage}` });
  }, [user, addLogEntry]);

  const removeCryoVial = useCallback((id: string) => {
    setCryoVials(prev => {
      const vial = prev.find(v => v.id === id);
      if (vial) {
        addLogEntry({ userId: user.id, userName: user.name, action: `Withdrew vial ${vial.cellLine}`, category: 'cryo', details: `T${vial.tank} R${vial.rack} B${vial.box} ${String.fromCharCode(65 + vial.row)}${vial.col + 1}, P${vial.passage}` });
      }
      return prev.filter(v => v.id !== id);
    });
  }, [user, addLogEntry]);

  // --- Wishlist ---
  const addWishlistItem = useCallback((item: Omit<WishlistItem, 'id' | 'timestamp' | 'status'>) => {
    setWishlist(prev => [...prev, { ...item, id: generateId(), timestamp: new Date().toISOString(), status: 'pending' }]);
    addLogEntry({ userId: user.id, userName: user.name, action: `Requested ${item.name}`, category: 'wishlist', details: `${item.supplier} ${item.catalogNumber}, Est. €${item.estimatedCost}` });
  }, [user, addLogEntry]);

  const updateWishlistStatus = useCallback((id: string, status: WishlistItem['status'], approvedBy?: string) => {
    setWishlist(prev => prev.map(w => w.id === id ? { ...w, status, approvedBy } : w));
    const item = wishlist.find(w => w.id === id);
    addLogEntry({ userId: user.id, userName: user.name, action: `${status} ${item?.name || id}`, category: 'wishlist', details: `Status → ${status}` });
  }, [user, wishlist, addLogEntry]);

  // --- Admin: Users ---
  const addUser = useCallback((u: LabUser) => {
    setUsers(prev => [...prev, u]);
    addLogEntry({ userId: user.id, userName: user.name, action: `Added user ${u.name}`, category: 'auth', details: `Role: ${u.role}, Email: ${u.email}` });
  }, [user, addLogEntry]);

  const updateUser = useCallback((u: LabUser) => {
    setUsers(prev => prev.map(existing => existing.id === u.id ? u : existing));
    addLogEntry({ userId: user.id, userName: user.name, action: `Updated user ${u.name}`, category: 'auth', details: `Role: ${u.role}` });
  }, [user, addLogEntry]);

  const removeUser = useCallback((id: string) => {
    setUsers(prev => {
      const u = prev.find(x => x.id === id);
      if (u) addLogEntry({ userId: user.id, userName: user.name, action: `Removed user ${u.name}`, category: 'auth', details: u.email });
      return prev.filter(x => x.id !== id);
    });
  }, [user, addLogEntry]);

  // --- Admin: Reagents CRUD ---
  const addNewReagent = useCallback((r: Reagent) => {
    setReagents(prev => [...prev, r]);
    addLogEntry({ userId: user.id, userName: user.name, action: `Added reagent ${r.name}`, category: 'reagent', details: `${r.supplier} ${r.catalogNumber}` });
  }, [user, addLogEntry]);

  const updateReagent = useCallback((r: Reagent) => {
    setReagents(prev => prev.map(existing => existing.id === r.id ? r : existing));
  }, []);

  const removeReagent = useCallback((id: string) => {
    setReagents(prev => {
      const r = prev.find(x => x.id === id);
      if (r) addLogEntry({ userId: user.id, userName: user.name, action: `Removed reagent ${r.name}`, category: 'reagent', details: r.catalogNumber });
      return prev.filter(x => x.id !== id);
    });
  }, [user, addLogEntry]);

  // --- Admin: Instruments ---
  const addInstrument = useCallback((i: Instrument) => {
    setInstruments(prev => [...prev, i]);
    addLogEntry({ userId: user.id, userName: user.name, action: `Added instrument ${i.name}`, category: 'booking', details: `${i.category}, ${i.location}` });
  }, [user, addLogEntry]);

  const updateInstrument = useCallback((i: Instrument) => {
    setInstruments(prev => prev.map(existing => existing.id === i.id ? i : existing));
  }, []);

  const removeInstrument = useCallback((id: string) => {
    setInstruments(prev => {
      const i = prev.find(x => x.id === id);
      if (i) addLogEntry({ userId: user.id, userName: user.name, action: `Removed instrument ${i.name}`, category: 'booking', details: i.category });
      return prev.filter(x => x.id !== id);
    });
  }, [user, addLogEntry]);

  if (!loaded) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-50">
        <div className="animate-pulse text-gray-500 font-manrope">Loading Lab Manager...</div>
      </div>
    );
  }

  return (
    <LabContext.Provider value={{
      user, permissions: rolePermissions[user.role], currentPage, setCurrentPage,
      bookings, addBooking, removeBooking,
      reagents, withdrawReagent, addReagentStock,
      cryoVials, addCryoVial, removeCryoVial,
      wishlist, addWishlistItem, updateWishlistStatus,
      log, addLogEntry,
      users, addUser, updateUser, removeUser,
      addNewReagent, updateReagent, removeReagent,
      instruments, addInstrument, updateInstrument, removeInstrument,
    }}>
      {children}
    </LabContext.Provider>
  );
}
