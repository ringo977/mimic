'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  LabUser, Booking, Reagent, CryoVial, WishlistItem, LogEntry,
  rolePermissions, mockReagents, generateId,
  getInitialBookings, getInitialCryoVials, getInitialWishlist, getInitialLog,
} from '@/data/lab-data';

interface LabContextType {
  user: LabUser;
  permissions: typeof rolePermissions[LabUser['role']];
  // Navigation
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
      } else {
        setBookings(getInitialBookings());
        setReagents([...mockReagents]);
        setCryoVials(getInitialCryoVials());
        setWishlist(getInitialWishlist());
        setLog(getInitialLog());
      }
    } catch {
      setBookings(getInitialBookings());
      setReagents([...mockReagents]);
      setCryoVials(getInitialCryoVials());
      setWishlist(getInitialWishlist());
      setLog(getInitialLog());
    }
    setLoaded(true);
  }, []);

  // Save to localStorage on changes
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ bookings, reagents, cryoVials, wishlist, log }));
  }, [bookings, reagents, cryoVials, wishlist, log, loaded]);

  const addLogEntry = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    setLog(prev => [{ ...entry, id: generateId(), timestamp: new Date().toISOString() }, ...prev]);
  }, []);

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

  const addWishlistItem = useCallback((item: Omit<WishlistItem, 'id' | 'timestamp' | 'status'>) => {
    setWishlist(prev => [...prev, { ...item, id: generateId(), timestamp: new Date().toISOString(), status: 'pending' }]);
    addLogEntry({ userId: user.id, userName: user.name, action: `Requested ${item.name}`, category: 'wishlist', details: `${item.supplier} ${item.catalogNumber}, Est. €${item.estimatedCost}` });
  }, [user, addLogEntry]);

  const updateWishlistStatus = useCallback((id: string, status: WishlistItem['status'], approvedBy?: string) => {
    setWishlist(prev => prev.map(w => w.id === id ? { ...w, status, approvedBy } : w));
    const item = wishlist.find(w => w.id === id);
    addLogEntry({ userId: user.id, userName: user.name, action: `${status} ${item?.name || id}`, category: 'wishlist', details: `Status → ${status}` });
  }, [user, wishlist, addLogEntry]);

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
    }}>
      {children}
    </LabContext.Provider>
  );
}
