'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { Calendar, FlaskConical, Snowflake, ShoppingCart, BookOpen, AlertTriangle, Clock, Award, Download, FileText, ChevronLeft, ChevronRight, X, Pencil, Trash2, Plus, Moon, MapPin, User as UserIcon } from 'lucide-react';
import { useLabContext } from './LabContext';
import { rolePermissions, formatTime, formatDate, isWorkingHour, buildBookingSlots } from '@/data/lab-data';
import type { Booking, Instrument, LabUser, BookingSettings } from '@/data/lab-data';
import { fetchBookingsForSlot } from '@/lib/supabase-data';

const INSTRUMENT_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#a855f7'];

function localDateStr(d: Date): string { return d.toLocaleDateString('en-CA'); }

// Monday-based start of the week containing `ref`
function startOfWeek(ref: Date): Date {
  const d = new Date(ref);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  d.setHours(12, 0, 0, 0);
  return d;
}

const EPS = 1e-9;
const HOUR_PX = 46; // pixel height of one hour row

// A booking is 'past' once it has fully ended, 'current' while running, else 'future'.
function bookingStatus(b: Booking, todayStr: string, nowHour: number): 'past' | 'current' | 'future' {
  if (b.date < todayStr) return 'past';
  if (b.date > todayStr) return 'future';
  if (b.endHour <= nowHour + EPS) return 'past';
  if (b.startHour <= nowHour + EPS) return 'current';
  return 'future';
}

// Assign overlapping same-day bookings to side-by-side lanes (like Google Calendar).
function layoutDayEvents(evts: Booking[]): { ev: Booking; lane: number; lanes: number }[] {
  const sorted = [...evts].sort((a, b) => a.startHour - b.startHour || a.endHour - b.endHour);
  const out: { ev: Booking; lane: number; lanes: number }[] = [];
  let cluster: Booking[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    const laneEnds: number[] = [];
    const laneOf = new Map<string, number>();
    cluster.forEach(ev => {
      let lane = laneEnds.findIndex(end => ev.startHour >= end - EPS);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(ev.endHour); }
      else laneEnds[lane] = ev.endHour;
      laneOf.set(ev.id, lane);
    });
    const lanes = laneEnds.length;
    cluster.forEach(ev => out.push({ ev, lane: laneOf.get(ev.id) ?? 0, lanes }));
    cluster = [];
  };
  sorted.forEach(ev => {
    if (cluster.length && ev.startHour >= clusterEnd - EPS) { flush(); clusterEnd = -Infinity; }
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.endHour);
  });
  if (cluster.length) flush();
  return out;
}

type RangePreset = 'work' | 'open' | 'all';

type ModalState =
  | { mode: 'view'; booking: Booking }
  | { mode: 'create'; date: string; startHour: number; endHour?: number; instrumentId?: string };

type DragState =
  | { kind: 'create'; date: string; colTop: number; anchor: number; start: number; end: number; moved: boolean }
  | { kind: 'move'; booking: Booking; date: string; colTop: number; grab: number; dur: number; lowStart: number; lowEnd: number; start: number; end: number; moved: boolean }
  | { kind: 'resize-top' | 'resize-bottom'; booking: Booking; date: string; colTop: number; lowStart: number; lowEnd: number; start: number; end: number; moved: boolean };

function BookingModal({ state, onClose }: { state: ModalState; onClose: () => void }) {
  const { user, bookings, instruments, bookingSettings, addBooking, updateBooking, removeBooking, canManageAllBookings } = useLabContext();
  const slots = useMemo(() => buildBookingSlots(bookingSettings), [bookingSettings]);
  const step = bookingSettings.slotMinutes / 60;
  const todayStr = new Date().toLocaleDateString('en-CA');
  const nowHour = (() => { const n = new Date(); return n.getHours() + n.getMinutes() / 60; })();

  const existing = state.mode === 'view' ? state.booking : null;
  const isMine = existing ? existing.userId === user.id : true;
  const isManager = canManageAllBookings;
  const status = existing ? bookingStatus(existing, todayStr, nowHour) : 'future';
  // Full change + cancel: managers anytime; owners only on future bookings.
  const canModify = isManager || (isMine && status === 'future');

  const [editing, setEditing] = useState(state.mode === 'create');
  const [instrumentId, setInstrumentId] = useState(existing?.instrumentId ?? (state.mode === 'create' ? state.instrumentId ?? '' : ''));
  const [date, setDate] = useState(existing?.date ?? (state.mode === 'create' ? state.date : todayStr));
  const [startHour, setStartHour] = useState<number>(existing?.startHour ?? (state.mode === 'create' ? state.startHour : bookingSettings.workStartHour));
  const [endHour, setEndHour] = useState<number>(existing?.endHour ?? (state.mode === 'create' ? (state.endHour ?? Math.min(state.startHour + 1, bookingSettings.openEndHour)) : bookingSettings.workStartHour + 1));
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  const bookableInstruments = instruments.filter(i => !i.requiresCertification || user.certifications.includes(i.id) || i.id === instrumentId);
  const inst = instruments.find(i => i.id === (instrumentId || existing?.instrumentId));
  const isPastDate = date < todayStr;
  const isToday = date === todayStr;
  const endOptions = [...slots.filter(s => s > startHour + EPS), bookingSettings.openEndHour];

  const conflict = (s: number, e: number) => bookings.some(b =>
    b.instrumentId === instrumentId && b.date === date && b.id !== existing?.id &&
    s < b.endHour - EPS && e > b.startHour + EPS);

  const save = async () => {
    setError('');
    if (!instrumentId) { setError('Select an instrument.'); return; }
    if (endHour <= startHour) { setError('End time must be after start time.'); return; }
    if (!isManager && isPastDate) { setError('Cannot book a date in the past.'); return; }
    if (!isManager && isToday && startHour < nowHour - EPS) { setError('Cannot book a time in the past.'); return; }
    if (conflict(startHour, endHour)) { setError('Time conflict with an existing booking.'); return; }
    setBusy(true);
    const fresh = await fetchBookingsForSlot(instrumentId, date);
    if (fresh.some(b => b.id !== existing?.id && startHour < b.endHour - EPS && endHour > b.startHour + EPS)) {
      setBusy(false); setError('Someone just booked an overlapping slot. Pick another time.'); return;
    }
    if (existing) updateBooking({ ...existing, instrumentId, date, startHour, endHour, notes });
    else addBooking({ instrumentId, userId: user.id, userName: user.name, date, startHour, endHour, notes });
    setBusy(false);
    onClose();
  };

  const title = state.mode === 'create' ? 'New booking' : editing ? 'Edit booking' : 'Booking details';

  // Read-only details view
  if (existing && !editing) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900 font-manrope">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{inst?.icon || '📋'}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900 font-manrope">{inst?.name || existing.instrumentId}</p>
                {inst?.location && <p className="text-xs text-gray-500 font-manrope flex items-center gap-1"><MapPin size={11} />{inst.location}</p>}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <p className="text-sm text-gray-700 font-manrope flex items-center gap-2"><Calendar size={14} className="text-gray-400" />{formatDate(existing.date)}</p>
              <p className="text-sm text-gray-700 font-manrope flex items-center gap-2"><Clock size={14} className="text-gray-400" />{formatTime(existing.startHour)} – {formatTime(existing.endHour)}{!isWorkingHour(existing.startHour, bookingSettings) && <span className="text-amber-600 text-xs flex items-center gap-0.5"><Moon size={11} /> extra hours</span>}</p>
              <p className="text-sm text-gray-700 font-manrope flex items-center gap-2"><UserIcon size={14} className="text-gray-400" />{isMine ? 'You' : existing.userName}</p>
              {existing.notes && <p className="text-sm text-gray-600 font-manrope pl-6">{existing.notes}</p>}
            </div>

            {confirmingCancel ? (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-sm text-red-700 font-manrope mb-3">{isMine ? 'Cancel your booking?' : `Cancel ${existing.userName}'s booking?`}</p>
                <div className="flex gap-2">
                  <button onClick={() => { removeBooking(existing.id); onClose(); }} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold font-manrope hover:bg-red-700 transition-colors">Yes, cancel</button>
                  <button onClick={() => setConfirmingCancel(false)} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold font-manrope hover:bg-gray-200 transition-colors">Keep</button>
                </div>
              </div>
            ) : canModify ? (
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(true)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-[#102C53] text-white rounded-xl text-sm font-semibold font-manrope hover:bg-[#1a3d6e] transition-colors"><Pencil size={15} /> Change</button>
                <button onClick={() => setConfirmingCancel(true)} className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-semibold font-manrope hover:bg-red-100 transition-colors"><Trash2 size={15} /> Cancel</button>
              </div>
            ) : isMine && status === 'current' ? (
              <div className="bg-blue-50 text-blue-700 px-3 py-2.5 rounded-xl text-xs font-manrope flex items-start gap-2">
                <Clock size={14} className="shrink-0 mt-0.5" />
                <span>This booking is in progress. You can only lengthen or shorten its end by dragging its bottom edge on the calendar (not before the current time). It can&rsquo;t be moved or cancelled.</span>
              </div>
            ) : isMine && status === 'past' ? (
              <p className="text-xs text-gray-400 font-manrope text-center pt-1">This booking has ended and can no longer be changed. Contact an admin if needed.</p>
            ) : (
              <p className="text-xs text-gray-400 font-manrope text-center pt-1">You can only change your own bookings.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Create / edit form
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-gray-900 font-manrope">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Instrument</label>
            {existing ? (
              <div className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-xl text-sm font-manrope text-gray-700 flex items-center gap-2">
                <span>{inst?.icon}</span> {inst?.name || existing.instrumentId}
              </div>
            ) : (
              <select
                value={instrumentId}
                onChange={e => setInstrumentId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none bg-white"
              >
                <option value="">Select an instrument…</option>
                {bookableInstruments.map(i => <option key={i.id} value={i.id}>{i.icon} {i.name}</option>)}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Date</label>
            <input
              type="date"
              value={date}
              min={todayStr}
              onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Start</label>
              <select
                value={startHour}
                onChange={e => { const v = Number(e.target.value); setStartHour(v); if (endHour <= v) setEndHour(Math.min(v + step, bookingSettings.openEndHour)); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
              >
                {slots.map(h => <option key={h} value={h}>{formatTime(h)}{isWorkingHour(h, bookingSettings) ? '' : ' (extra)'}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">End</label>
              <select
                value={endHour}
                onChange={e => setEndHour(Number(e.target.value))}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
              >
                {endOptions.map(h => <option key={h} value={h}>{formatTime(h)}</option>)}
              </select>
            </div>
          </div>

          {!isWorkingHour(startHour, bookingSettings) && (
            <div className="bg-amber-50 text-amber-700 px-3 py-2 rounded-xl text-xs font-manrope flex items-center gap-1.5">
              <Moon size={13} /> Outside working hours ({formatTime(bookingSettings.workStartHour)}–{formatTime(bookingSettings.workEndHour)}).
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Notes</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g., IF imaging PHOENIX chips"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
            />
          </div>

          {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-manrope">{error}</div>}

          <div className="flex gap-2">
            {existing && <button onClick={() => { setEditing(false); setError(''); }} className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold font-manrope hover:bg-gray-200 transition-colors">Back</button>}
            <button
              onClick={save}
              disabled={busy || endHour <= startHour || !instrumentId}
              className="flex-1 py-3 bg-[#102C53] text-white rounded-xl font-semibold text-sm font-manrope hover:bg-[#1a3d6e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'Checking availability…' : existing ? 'Save changes' : 'Confirm booking'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeeklyCalendar({ bookings, instruments, user, bookingSettings }: {
  bookings: Booking[]; instruments: Instrument[]; user: LabUser; bookingSettings: BookingSettings;
}) {
  const { updateBooking, canManageAllBookings } = useLabContext();
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeInstruments, setActiveInstruments] = useState<Set<string>>(new Set()); // empty = all
  const [preset, setPreset] = useState<RangePreset>('open');
  const [modal, setModal] = useState<ModalState | null>(null);
  const [drag, setDragState] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const setDrag = (d: DragState | null) => { dragRef.current = d; setDragState(d); };

  const now = new Date();
  const todayStr = localDateStr(now);
  const nowHour = now.getHours() + now.getMinutes() / 60;

  const colorOf = useMemo(() => {
    const map = new Map<string, string>();
    instruments.forEach((i, idx) => map.set(i.id, INSTRUMENT_PALETTE[idx % INSTRUMENT_PALETTE.length]));
    return map;
  }, [instruments]);

  const weekStart = useMemo(() => { const s = startOfWeek(new Date()); s.setDate(s.getDate() + weekOffset * 7); return s; }, [weekOffset]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d; }), [weekStart]);

  // Visible time range, inspired by Agora's presets (Work day / Compact / All hours)
  const [rangeStart, rangeEnd] = preset === 'work'
    ? [Math.floor(bookingSettings.workStartHour), Math.ceil(bookingSettings.workEndHour)]
    : preset === 'all'
      ? [0, 24]
      : [Math.floor(bookingSettings.openStartHour), Math.ceil(bookingSettings.openEndHour)];
  const hourMarks = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i);
  const gridHeight = (rangeEnd - rangeStart) * HOUR_PX;

  const showAll = activeInstruments.size === 0;
  const visibleBookings = bookings.filter(b => showAll || activeInstruments.has(b.instrumentId));

  const slotStep = bookingSettings.slotMinutes / 60;
  const minH = bookingSettings.openStartHour;
  const maxH = bookingSettings.openEndHour;
  const snap = (h: number) => Math.round((Math.round(h / slotStep) * slotStep) * 100) / 100;
  const clamp = (h: number, lo: number, hi: number) => Math.min(Math.max(h, lo), hi);
  const conflictFor = (instrumentId: string, date: string, s: number, e: number, excludeId: string) =>
    bookings.some(b => b.instrumentId === instrumentId && b.date === date && b.id !== excludeId && s < b.endHour - EPS && e > b.startHour + EPS);

  const colTopFromChild = (el: HTMLElement): number => {
    const col = el.closest('[data-daycol]') as HTMLElement | null;
    return col ? col.getBoundingClientRect().top : 0;
  };

  const startCreate = (e: React.PointerEvent<HTMLDivElement>, ds: string) => {
    if (e.button !== 0) return;
    const colTop = e.currentTarget.getBoundingClientRect().top;
    const h = clamp(snap(rangeStart + (e.clientY - colTop) / HOUR_PX), minH, maxH - slotStep);
    setDrag({ kind: 'create', date: ds, colTop, anchor: h, start: h, end: Math.min(h + slotStep, maxH), moved: false });
  };
  const ceilSlot = (h: number) => Math.min(Math.ceil((h - EPS) / slotStep) * slotStep, maxH);
  // Lowest start/end a NON-manager may drag a booking to. Managers (admins) are free.
  const dragBounds = (ev: Booking) => {
    const free = canManageAllBookings || ev.date !== todayStr;
    const low = free ? minH : ceilSlot(nowHour);
    return { lowStart: low, lowEnd: low };
  };

  const startMove = (e: React.PointerEvent<HTMLDivElement>, ev: Booking) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const colTop = colTopFromChild(e.currentTarget);
    const pointerH = rangeStart + (e.clientY - colTop) / HOUR_PX;
    const { lowStart, lowEnd } = dragBounds(ev);
    setDrag({ kind: 'move', booking: ev, date: ev.date, colTop, grab: pointerH - ev.startHour, dur: ev.endHour - ev.startHour, lowStart, lowEnd, start: ev.startHour, end: ev.endHour, moved: false });
  };
  const startResize = (e: React.PointerEvent<HTMLDivElement>, ev: Booking, edge: 'top' | 'bottom') => {
    e.stopPropagation();
    if (e.button !== 0) return;
    const colTop = colTopFromChild(e.currentTarget);
    const { lowStart, lowEnd } = dragBounds(ev);
    setDrag({ kind: edge === 'top' ? 'resize-top' : 'resize-bottom', booking: ev, date: ev.date, colTop, lowStart, lowEnd, start: ev.startHour, end: ev.endHour, moved: false });
  };

  const dragActive = drag !== null;
  useEffect(() => {
    if (!dragActive) return;
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current; if (!d) return;
      const raw = rangeStart + (e.clientY - d.colTop) / HOUR_PX;
      if (d.kind === 'create') {
        const cur = clamp(snap(raw), minH, maxH);
        let start = Math.min(d.anchor, cur), end = Math.max(d.anchor, cur);
        if (end - start < slotStep - EPS) end = Math.min(start + slotStep, maxH);
        setDrag({ ...d, start, end, moved: d.moved || Math.abs(cur - d.anchor) > EPS });
      } else if (d.kind === 'move') {
        const ns = clamp(snap(raw - d.grab), d.lowStart, maxH - d.dur);
        setDrag({ ...d, start: ns, end: ns + d.dur, moved: d.moved || Math.abs(ns - d.booking.startHour) > EPS });
      } else if (d.kind === 'resize-top') {
        const ns = clamp(snap(raw), d.lowStart, d.end - slotStep);
        setDrag({ ...d, start: ns, moved: d.moved || Math.abs(ns - d.booking.startHour) > EPS });
      } else {
        const ne = clamp(snap(raw), Math.max(d.start + slotStep, d.lowEnd), maxH);
        setDrag({ ...d, end: ne, moved: d.moved || Math.abs(ne - d.booking.endHour) > EPS });
      }
    };
    const onUp = () => {
      const d = dragRef.current; setDrag(null);
      if (!d) return;
      if (d.kind === 'create') { setModal({ mode: 'create', date: d.date, startHour: d.start, endHour: d.end }); return; }
      if (!d.moved) { setModal({ mode: 'view', booking: d.booking }); return; }
      const b = d.booking;
      if (d.end - d.start < slotStep - EPS) return;
      // Don't block on past time when editing an existing booking: it may already
      // be in the past (earlier today) and the user still wants to adjust it.
      if (conflictFor(b.instrumentId, b.date, d.start, d.end, b.id)) return;
      updateBooking({ ...b, startHour: d.start, endHour: d.end });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragActive]);

  const bookedInstrumentIds = useMemo(() => new Set(bookings.map(b => b.instrumentId)), [bookings]);
  const filterInstruments = instruments.filter(i => bookedInstrumentIds.has(i.id));

  const toggleInstrument = (id: string) => {
    setActiveInstruments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const weekRangeLabel = `${days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const weekBookingCount = days.reduce((acc, d) => acc + visibleBookings.filter(b => b.date === localDateStr(d)).length, 0);

  const presetLabels: Record<RangePreset, string> = {
    work: `Work ${formatTime(bookingSettings.workStartHour)}–${formatTime(bookingSettings.workEndHour)}`,
    open: `Open ${formatTime(bookingSettings.openStartHour)}–${formatTime(bookingSettings.openEndHour)}`,
    all: 'All hours',
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h2 className="text-sm font-semibold text-gray-900 font-manrope flex items-center gap-2">
          <Calendar size={16} className="text-[#102C53]" />
          Weekly Calendar
          <span className="text-xs font-normal text-gray-400">{weekBookingCount} booking{weekBookingCount !== 1 ? 's' : ''}</span>
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={preset}
            onChange={e => setPreset(e.target.value as RangePreset)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium font-manrope bg-gray-100 text-gray-600 border-0 outline-none cursor-pointer hover:bg-gray-200"
          >
            {(['work', 'open', 'all'] as RangePreset[]).map(p => <option key={p} value={p}>{presetLabels[p]}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronLeft size={16} /></button>
            <button onClick={() => setWeekOffset(0)} className={`px-3 py-1.5 rounded-lg text-xs font-medium font-manrope transition-colors ${weekOffset === 0 ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Today</button>
            <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>
      <p className="text-xs text-gray-500 font-manrope mb-3">{weekRangeLabel}</p>

      {/* Instrument filter */}
      {filterInstruments.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-hide">
          <button
            onClick={() => setActiveInstruments(new Set())}
            className={`px-3 py-1.5 rounded-full text-xs font-medium font-manrope whitespace-nowrap transition-all ${showAll ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            All instruments
          </button>
          {filterInstruments.map(inst => {
            const active = activeInstruments.has(inst.id);
            return (
              <button
                key={inst.id}
                onClick={() => toggleInstrument(inst.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium font-manrope whitespace-nowrap transition-all border ${active ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                style={active ? { backgroundColor: colorOf.get(inst.id) } : undefined}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: active ? '#fff' : colorOf.get(inst.id) }} />
                {inst.icon} {inst.name}
              </button>
            );
          })}
        </div>
      )}

      {/* Time-grid week view */}
      <div className="overflow-x-auto">
        <div className="min-w-[820px]">
          {/* Day headers */}
          <div className="flex border-b border-gray-100">
            <div className="w-[52px] shrink-0" />
            {days.map(d => {
              const isToday = localDateStr(d) === todayStr;
              return (
                <div key={d.toISOString()} className="flex-1 text-center pb-2">
                  <p className={`text-[10px] font-semibold uppercase tracking-wide font-manrope ${isToday ? 'text-[#102C53]' : 'text-gray-400'}`}>{d.toLocaleDateString('en', { weekday: 'short' })}</p>
                  <p className={`text-sm font-bold font-manrope inline-flex items-center justify-center w-7 h-7 rounded-full ${isToday ? 'bg-[#102C53] text-white' : 'text-gray-700'}`}>{d.getDate()}</p>
                </div>
              );
            })}
          </div>

          {/* Grid body */}
          <div className="flex">
            {/* Time axis */}
            <div className="w-[52px] shrink-0 relative" style={{ height: gridHeight }}>
              {hourMarks.map(h => (
                <div key={h} className="absolute right-2 text-[10px] font-mono text-gray-400 -translate-y-1/2" style={{ top: (h - rangeStart) * HOUR_PX }}>
                  {h < 24 ? formatTime(h) : ''}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map(d => {
              const ds = localDateStr(d);
              const isToday = ds === todayStr;
              const dayLayout = layoutDayEvents(visibleBookings.filter(b => b.date === ds));
              const ghost = drag && drag.date === ds ? drag : null;
              return (
                <div key={ds} data-daycol onPointerDown={e => startCreate(e, ds)} className={`flex-1 relative border-l border-gray-100 cursor-pointer ${isToday ? 'bg-[#102C53]/[0.02]' : ''} ${dragActive ? 'select-none' : ''}`} style={{ height: gridHeight }}>
                  {/* Hour bands + gridlines */}
                  {hourMarks.slice(0, -1).map(h => {
                    const working = isWorkingHour(h, bookingSettings);
                    return (
                      <div key={h} className={`absolute left-0 right-0 border-t border-gray-100 ${working ? '' : 'bg-amber-50/50'}`} style={{ top: (h - rangeStart) * HOUR_PX, height: HOUR_PX }}>
                        <div className="absolute left-0 right-0 border-t border-dashed border-gray-100/70" style={{ top: HOUR_PX / 2 }} />
                      </div>
                    );
                  })}

                  {/* Now indicator */}
                  {isToday && nowHour >= rangeStart && nowHour <= rangeEnd && (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: (nowHour - rangeStart) * HOUR_PX }}>
                      <div className="relative">
                        <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
                        <div className="border-t border-red-500" />
                      </div>
                    </div>
                  )}

                  {/* Events */}
                  {dayLayout.map(({ ev, lane, lanes }) => {
                    const inst = instruments.find(i => i.id === ev.instrumentId);
                    const isMine = ev.userId === user.id;
                    const status = bookingStatus(ev, todayStr, nowHour);
                    // Full drag (move + both edges): managers always; owners only on future bookings.
                    const fullDrag = canManageAllBookings || (isMine && status === 'future');
                    // In-progress bookings owned by the user: only the END can be dragged.
                    const endOnly = !fullDrag && isMine && status === 'current';
                    const draggingThis = !!drag && drag.kind !== 'create' && drag.booking.id === ev.id;
                    const color = colorOf.get(ev.instrumentId) || '#64748b';
                    const start = Math.max(ev.startHour, rangeStart);
                    const end = Math.min(ev.endHour, rangeEnd);
                    if (end <= start) return null;
                    const top = (start - rangeStart) * HOUR_PX;
                    const height = Math.max((end - start) * HOUR_PX - 2, 15);
                    const widthPct = 100 / lanes;
                    const compact = height < 30;
                    return (
                      <div
                        key={ev.id}
                        onPointerDown={fullDrag ? e => startMove(e, ev) : undefined}
                        onClick={fullDrag ? undefined : e => { e.stopPropagation(); setModal({ mode: 'view', booking: ev }); }}
                        title={`${inst?.name || ev.instrumentId} · ${ev.userName} · ${formatTime(ev.startHour)}–${formatTime(ev.endHour)}${ev.notes ? ' · ' + ev.notes : ''}`}
                        className={`absolute rounded-md px-1.5 py-0.5 text-left overflow-hidden text-white shadow-sm hover:shadow-md hover:brightness-105 transition-all z-10 touch-none ${fullDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${draggingThis ? 'opacity-30' : ''}`}
                        style={{
                          top,
                          height,
                          left: `calc(${lane * widthPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                          backgroundColor: color,
                          boxShadow: isMine ? `inset 0 0 0 2px rgba(255,255,255,0.9)` : undefined,
                        }}
                      >
                        {fullDrag && <div onPointerDown={e => startResize(e, ev, 'top')} className="absolute -top-0.5 left-0 right-0 h-2 cursor-ns-resize z-20" />}
                        <p className="text-[10px] font-semibold leading-tight truncate pointer-events-none">{formatTime(ev.startHour)} {inst?.icon} {inst?.name || ev.instrumentId}</p>
                        {!compact && <p className="text-[9px] leading-tight truncate opacity-90 pointer-events-none">{isMine ? 'You' : ev.userName}</p>}
                        {(fullDrag || endOnly) && <div onPointerDown={e => startResize(e, ev, 'bottom')} className="absolute -bottom-0.5 left-0 right-0 h-2 cursor-ns-resize z-20" />}
                      </div>
                    );
                  })}

                  {/* Drag ghost */}
                  {ghost && (
                    <div
                      className="absolute left-0.5 right-0.5 rounded-md border-2 border-dashed border-[#102C53] bg-[#102C53]/10 z-30 pointer-events-none flex items-start justify-center"
                      style={{ top: (ghost.start - rangeStart) * HOUR_PX, height: Math.max((ghost.end - ghost.start) * HOUR_PX, 14) }}
                    >
                      <span className="text-[9px] font-mono text-[#102C53] mt-0.5 font-semibold">{formatTime(ghost.start)}–{formatTime(ghost.end)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500 font-manrope flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-[#102C53] ring-2 ring-inset ring-white/90" /> Your bookings</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-400" /> Color = instrument</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" /> Outside working hours</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500" /> Now</span>
        <span className="ml-auto text-gray-400">Drag empty space to book · drag a booking to move · drag its edges to resize</span>
      </div>

      {modal && <BookingModal state={modal} onClose={() => setModal(null)} />}
    </div>
  );
}

function getInitials(name: string, abbreviation?: string): string {
  if (abbreviation) return abbreviation;
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.substring(0, 3).toUpperCase();
  return parts[0][0].toUpperCase() + parts[parts.length - 1].substring(0, 2).toUpperCase();
}

interface Props {
  onNavigate: (page: string) => void;
}

export default function DashboardPage({ onNavigate }: Props) {
  const { user, permissions, bookings, reagents, cryoVials, wishlist, instruments: mockInstruments, manuals, bookingSettings } = useLabContext();

  const today = new Date().toISOString().split('T')[0];
  const todayBookings = bookings.filter(b => b.date === today);
  const myTodayBookings = todayBookings.filter(b => b.userId === user.id);
  const lowStockReagents = reagents.filter(r => r.currentStock <= r.alertThreshold);
  const pendingOrders = wishlist.filter(w => w.status === 'pending');
  const totalVials = cryoVials.length;

  const badges = [
    { id: 'instruments', label: 'Instruments', sublabel: `${todayBookings.length} booked today`, icon: Calendar, color: 'bg-blue-500', show: true },
    { id: 'reagents', label: 'Reagents', sublabel: `${lowStockReagents.length} low stock`, icon: FlaskConical, color: 'bg-emerald-500', show: true },
    { id: 'cryo', label: 'Cryo Storage', sublabel: `${totalVials} vials stored`, icon: Snowflake, color: 'bg-cyan-500', show: permissions.canManageCryo },
    { id: 'wishlist', label: 'Wishlist', sublabel: `${pendingOrders.length} pending`, icon: ShoppingCart, color: 'bg-amber-500', show: permissions.canRequestOrders },
    { id: 'manuals', label: 'Manuals & SDS', sublabel: 'Protocols & Docs', icon: BookOpen, color: 'bg-purple-500', show: true },
  ];

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#102C53] flex items-center justify-center text-white text-xl font-bold font-manrope shrink-0">
            {getInitials(user.name, user.abbreviation)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 font-manrope">Welcome back, {user.name.split(' ')[0]}!</h1>
            <p className="text-sm text-gray-500 font-manrope mt-0.5">{user.email}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#102C53]/10 text-[#102C53] text-xs font-semibold font-manrope">
                <Award size={12} />
                {rolePermissions[user.role].label}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-manrope">
                {user.certifications.length} certifications
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-manrope">
                {user.projects.length} projects
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Badges Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {badges.filter(b => b.show).map(badge => {
          const Icon = badge.icon;
          return (
            <button
              key={badge.id}
              onClick={() => onNavigate(badge.id)}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all text-left group"
            >
              <div className={`w-10 h-10 rounded-xl ${badge.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-semibold text-gray-900 font-manrope">{badge.label}</p>
              <p className="text-xs text-gray-500 font-manrope mt-0.5">{badge.sublabel}</p>
            </button>
          );
        })}
      </div>

      {/* Weekly Calendar — all bookings, filterable by instrument */}
      <WeeklyCalendar bookings={bookings} instruments={mockInstruments} user={user} bookingSettings={bookingSettings} />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* My Bookings Today */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 font-manrope flex items-center gap-2 mb-4">
            <Clock size={16} className="text-blue-500" />
            My Bookings Today
          </h2>
          {myTodayBookings.length === 0 ? (
            <p className="text-sm text-gray-400 font-manrope py-4 text-center">No bookings for today</p>
          ) : (
            <div className="space-y-2.5">
              {myTodayBookings.map(booking => {
                const instrument = mockInstruments.find(i => i.id === booking.instrumentId);
                return (
                  <div key={booking.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <div className="text-xl">{instrument?.icon || '📋'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 font-manrope truncate">{instrument?.name || booking.instrumentId}</p>
                      <p className="text-xs text-gray-500 font-manrope">{booking.notes}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-[#102C53] font-manrope">{formatTime(booking.startHour)}</p>
                      <p className="text-xs text-gray-400 font-manrope">{formatTime(booking.endHour)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 font-manrope flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-500" />
            Alerts
          </h2>
          {lowStockReagents.length === 0 && pendingOrders.length === 0 ? (
            <p className="text-sm text-gray-400 font-manrope py-4 text-center">All clear!</p>
          ) : (
            <div className="space-y-2.5">
              {lowStockReagents.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                    <AlertTriangle size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 font-manrope truncate">{r.name}</p>
                    <p className="text-xs text-amber-600 font-manrope">Low stock: {r.currentStock}/{r.maxStock} {r.unit}</p>
                  </div>
                </div>
              ))}
              {pendingOrders.map(w => (
                <div key={w.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                    <ShoppingCart size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 font-manrope truncate">{w.name}</p>
                    <p className="text-xs text-blue-600 font-manrope">Pending approval - {w.requestedByName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Available Documents (with PDF) */}
      {manuals.filter(m => m.fileUrl).length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 font-manrope flex items-center gap-2 mb-4">
            <FileText size={16} className="text-purple-500" />
            Documents Available
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {manuals.filter(m => m.fileUrl).map(doc => (
              <a
                key={doc.id}
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center text-purple-600">
                  <Download size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 font-manrope truncate">{doc.title}</p>
                  <p className="text-[10px] text-gray-500 font-manrope">{doc.fileName || 'PDF'} &middot; {formatDate(doc.lastUpdated)}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* All Today's Bookings */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 font-manrope flex items-center gap-2 mb-4">
          <Calendar size={16} className="text-[#102C53]" />
          All Bookings Today ({todayBookings.length})
        </h2>
        {todayBookings.length === 0 ? (
          <p className="text-sm text-gray-400 font-manrope py-4 text-center">No bookings today</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {todayBookings.sort((a, b) => a.startHour - b.startHour).map(booking => {
              const instrument = mockInstruments.find(i => i.id === booking.instrumentId);
              const isMine = booking.userId === user.id;
              return (
                <div key={booking.id} className={`flex items-center gap-3 p-3 rounded-xl ${isMine ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'}`}>
                  <div className="text-lg">{instrument?.icon || '📋'}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 font-manrope truncate">{instrument?.name}</p>
                    <p className="text-xs text-gray-500 font-manrope">{booking.userName}</p>
                  </div>
                  <span className="text-xs font-mono text-gray-600 shrink-0">
                    {formatTime(booking.startHour)}-{formatTime(booking.endHour)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
