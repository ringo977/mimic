'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, Lock, Plus, X, Search, Sun, Moon } from 'lucide-react';
import { useLabContext } from './LabContext';
import { useConfirm } from './ConfirmDialog';
import { formatTime, buildBookingSlots, isWorkingHour } from '@/data/lab-data';
import { fetchBookingsForSlot } from '@/lib/supabase-data';

const EPS = 1e-9;

export default function InstrumentsPage() {
  const { user, bookings, addBooking, removeBooking, instruments: mockInstruments, bookingSettings, canManageAllBookings } = useLabContext();
  const [ConfirmDialog, confirmDelete] = useConfirm();
  const categories = useMemo(() => ['All', ...Array.from(new Set(mockInstruments.map(i => i.category)))], [mockInstruments]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookStartHour, setBookStartHour] = useState(bookingSettings.workStartHour);
  const [bookEndHour, setBookEndHour] = useState(bookingSettings.workStartHour + 1);
  const [bookNotes, setBookNotes] = useState('');
  const [bookError, setBookError] = useState('');
  const [booking, setBooking] = useState(false);
  const [search, setSearch] = useState('');

  const step = bookingSettings.slotMinutes / 60;
  const slots = useMemo(() => buildBookingSlots(bookingSettings), [bookingSettings]);
  const todayStr = new Date().toLocaleDateString('en-CA');
  const isPastDate = selectedDate < todayStr;
  const isToday = selectedDate === todayStr;
  const nowHour = (() => { const n = new Date(); return n.getHours() + n.getMinutes() / 60; })();

  const filteredInstruments = useMemo(() => {
    return mockInstruments.filter(i => {
      const matchCat = selectedCategory === 'All' || i.category === selectedCategory;
      const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, search, mockInstruments]);

  const instrument = mockInstruments.find(i => i.id === selectedInstrument);
  const dayBookings = bookings.filter(b => b.instrumentId === selectedInstrument && b.date === selectedDate);

  const isCertified = instrument ? (!instrument.requiresCertification || user.certifications.includes(instrument.id)) : false;

  const changeDate = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toLocaleDateString('en-CA'));
  };

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const overlaps = (start: number, end: number, list: { startHour: number; endHour: number }[]) =>
    list.some(b => start < b.endHour - EPS && end > b.startHour + EPS);

  const hasConflict = (start: number, end: number) => overlaps(start, end, dayBookings);

  // Is a given slot start no longer bookable (in the past)?
  const slotIsPast = (slotStart: number) => isPastDate || (isToday && slotStart < nowHour - EPS);

  const openModalAt = (start: number) => {
    setBookStartHour(start);
    setBookEndHour(Math.min(start + 1, bookingSettings.openEndHour));
    setBookNotes('');
    setBookError('');
    setShowBookingModal(true);
  };

  const handleBook = async () => {
    if (!selectedInstrument || !isCertified) return;
    setBookError('');
    if (bookEndHour <= bookStartHour) { setBookError('End time must be after start time.'); return; }
    if (isPastDate) { setBookError('Cannot book a date in the past.'); return; }
    if (isToday && bookStartHour < nowHour - EPS) { setBookError('Cannot book a time slot in the past.'); return; }
    if (hasConflict(bookStartHour, bookEndHour)) { setBookError('Time conflict with an existing booking.'); return; }

    setBooking(true);
    // Re-check against the freshest server state to reduce double-booking races.
    const fresh = await fetchBookingsForSlot(selectedInstrument, selectedDate);
    if (overlaps(bookStartHour, bookEndHour, fresh)) {
      setBooking(false);
      setBookError('Someone just booked an overlapping slot. Please pick another time.');
      return;
    }
    addBooking({
      instrumentId: selectedInstrument,
      userId: user.id,
      userName: user.name,
      date: selectedDate,
      startHour: bookStartHour,
      endHour: bookEndHour,
      notes: bookNotes,
    });
    setBooking(false);
    setShowBookingModal(false);
    setBookNotes('');
  };

  // ── Instrument list view ──
  if (!selectedInstrument) {
    return (
      <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-4">
        <h1 className="text-lg font-bold text-gray-900 font-manrope">Instruments Booking</h1>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search instruments..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-manrope whitespace-nowrap transition-all ${
                selectedCategory === cat ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredInstruments.map(inst => {
            const certified = !inst.requiresCertification || user.certifications.includes(inst.id);
            const todayBookings = bookings.filter(b => b.instrumentId === inst.id && b.date === todayStr);
            return (
              <button
                key={inst.id}
                onClick={() => setSelectedInstrument(inst.id)}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all text-left"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-2xl">{inst.icon}</span>
                  {inst.requiresCertification && !certified && (
                    <Lock size={14} className="text-red-400" />
                  )}
                </div>
                <h3 className="text-sm font-semibold text-gray-900 font-manrope">{inst.name}</h3>
                <p className="text-xs text-gray-500 font-manrope mt-0.5">{inst.description}</p>
                {inst.manufacturer && <p className="text-[10px] text-gray-400 font-manrope">{inst.manufacturer}{inst.model ? ` ${inst.model}` : ''}{inst.serialNumber ? ` · S/N ${inst.serialNumber}` : ''}</p>}
                <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-400 font-manrope">
                  <span className="flex items-center gap-1"><MapPin size={10} />{inst.location}</span>
                  {todayBookings.length > 0 && (
                    <span className="flex items-center gap-1 text-blue-500"><Clock size={10} />{todayBookings.length} today</span>
                  )}
                </div>
                {inst.requiresCertification && (
                  <div className={`mt-2 text-[10px] font-manrope font-medium px-2 py-0.5 rounded-full inline-block ${
                    certified ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
                  }`}>
                    {certified ? 'Certified' : 'Certification Required'}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Selected instrument: calendar + timeline ──
  const endOptions = [...slots.filter(s => s > bookStartHour + EPS), bookingSettings.openEndHour];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setSelectedInstrument(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{instrument?.icon}</span>
            <h1 className="text-lg font-bold text-gray-900 font-manrope">{instrument?.name}</h1>
          </div>
          <p className="text-xs text-gray-500 font-manrope mt-0.5">{instrument?.location} &middot; {instrument?.description}</p>
          {instrument?.manufacturer && <p className="text-[10px] text-gray-400 font-manrope">{instrument.manufacturer}{instrument.model ? ` ${instrument.model}` : ''}{instrument.serialNumber ? ` · S/N ${instrument.serialNumber}` : ''}</p>}
        </div>
        {isCertified && !isPastDate && (
          <button
            onClick={() => {
              const defaultStart = slots.find(s => !slotIsPast(s) && s >= bookingSettings.workStartHour - EPS)
                ?? slots.find(s => !slotIsPast(s)) ?? slots[0];
              openModalAt(defaultStart);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#102C53] text-white rounded-xl text-sm font-medium font-manrope hover:bg-[#1a3d6e] transition-colors"
          >
            <Plus size={16} /> Book
          </button>
        )}
      </div>

      {!isCertified && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-manrope flex items-center gap-2">
          <Lock size={16} /> You need certification to book this instrument. Contact the Lab Manager.
        </div>
      )}

      {/* Date Navigation */}
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between">
        <button onClick={() => changeDate(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-gray-900 font-manrope">{dateLabel}{isToday && <span className="ml-2 text-[10px] text-blue-600">Today</span>}</p>
          <p className="text-xs text-gray-400 font-manrope mt-0.5">{dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}{isPastDate && ' · past date (read-only)'}</p>
        </div>
        <button onClick={() => changeDate(1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Week Quick Nav */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {Array.from({ length: 7 }, (_, i) => {
          const base = new Date(selectedDate + 'T12:00:00');
          const d = new Date(base);
          d.setDate(base.getDate() + (i - 3));
          const ds = d.toLocaleDateString('en-CA');
          const dayBookingsCount = bookings.filter(b => b.instrumentId === selectedInstrument && b.date === ds).length;
          const dIsToday = ds === todayStr;
          const isSelected = ds === selectedDate;
          return (
            <button
              key={ds}
              onClick={() => setSelectedDate(ds)}
              className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-manrope transition-all shrink-0 ${
                isSelected ? 'bg-[#102C53] text-white' : dIsToday ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="font-medium">{d.toLocaleDateString('en', { weekday: 'short' })}</span>
              <span className="text-lg font-bold mt-0.5">{d.getDate()}</span>
              {dayBookingsCount > 0 && <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-blue-400'}`} />}
            </button>
          );
        })}
      </div>

      {/* Hourly Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 font-manrope">Timeline</h2>
          <div className="flex items-center gap-3 mt-2 text-xs font-manrope flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> Your bookings</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-300" /> Others</span>
            <span className="flex items-center gap-1.5"><Sun size={12} className="text-emerald-500" /> Working hours {formatTime(bookingSettings.workStartHour)}–{formatTime(bookingSettings.workEndHour)}</span>
            <span className="flex items-center gap-1.5"><Moon size={12} className="text-amber-500" /> Extra hours</span>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {slots.map(slot => {
            const slotBookings = dayBookings.filter(b => slot >= b.startHour - EPS && slot < b.endHour - EPS);
            const isBooked = slotBookings.length > 0;
            const myBooking = slotBookings.find(b => b.userId === user.id);
            const otherBooking = slotBookings.find(b => b.userId !== user.id);
            const bk = myBooking || otherBooking;
            const isStart = bk && Math.abs(bk.startHour - slot) < EPS;
            const working = isWorkingHour(slot, bookingSettings);
            const past = slotIsPast(slot);
            const canCancel = bk && (!!myBooking || canManageAllBookings);

            return (
              <div key={slot} className={`flex items-stretch min-h-[44px] ${isBooked ? '' : working ? 'hover:bg-green-50/50' : 'bg-amber-50/40 hover:bg-amber-50/70'}`}>
                <div className={`w-16 shrink-0 flex flex-col items-center justify-center text-xs font-mono border-r border-gray-100 ${working ? 'text-gray-400' : 'text-amber-500'}`}>
                  {formatTime(slot)}
                  {!working && <Moon size={9} className="mt-0.5 opacity-70" />}
                </div>

                <div className="flex-1 p-1.5">
                  {isBooked && bk ? (
                    <div className={`h-full rounded-lg px-3 py-1.5 flex items-center justify-between ${myBooking ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}>
                      {isStart ? (
                        <>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold font-manrope truncate">{bk.userName}</p>
                            <p className={`text-[10px] font-manrope ${myBooking ? 'text-blue-100' : 'text-gray-500'}`}>
                              {formatTime(bk.startHour)}-{formatTime(bk.endHour)}{bk.notes ? ` · ${bk.notes}` : ''}
                            </p>
                          </div>
                          {canCancel && (
                            <button
                              onClick={() => confirmDelete('Cancel Booking?', `${myBooking ? 'Your' : bk.userName + "'s"} booking on ${bk.date} (${formatTime(bk.startHour)}-${formatTime(bk.endHour)}) will be removed.`, () => removeBooking(bk.id))}
                              className="p-1 rounded hover:bg-black/10 transition-colors shrink-0 ml-2"
                              title={myBooking ? 'Cancel booking' : 'Cancel (manager override)'}
                            >
                              <X size={14} />
                            </button>
                          )}
                        </>
                      ) : (
                        <div className={`text-[10px] font-manrope ${myBooking ? 'text-blue-200' : 'text-gray-400'}`}>(continued)</div>
                      )}
                    </div>
                  ) : (
                    <div className={`h-full rounded-lg border border-dashed flex items-center justify-center ${working ? 'border-gray-200' : 'border-amber-200'}`}>
                      {isCertified && !past && (
                        <button
                          onClick={() => openModalAt(slot)}
                          className={`text-[10px] font-manrope transition-colors ${working ? 'text-gray-400 hover:text-[#102C53]' : 'text-amber-500 hover:text-amber-700'}`}
                        >
                          + Book{working ? '' : ' (extra)'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 font-manrope">New Booking</h2>
              <button onClick={() => setShowBookingModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm font-semibold text-gray-900 font-manrope">{instrument?.icon} {instrument?.name}</p>
                <p className="text-xs text-gray-500 font-manrope">{dateLabel}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Start Time</label>
                  <select
                    value={bookStartHour}
                    onChange={e => { const v = Number(e.target.value); setBookStartHour(v); if (bookEndHour <= v) setBookEndHour(Math.min(v + step, bookingSettings.openEndHour)); }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                  >
                    {slots.map(h => <option key={h} value={h}>{formatTime(h)}{isWorkingHour(h, bookingSettings) ? '' : ' (extra)'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">End Time</label>
                  <select
                    value={bookEndHour}
                    onChange={e => setBookEndHour(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                  >
                    {endOptions.map(h => <option key={h} value={h}>{formatTime(h)}</option>)}
                  </select>
                </div>
              </div>

              {!isWorkingHour(bookStartHour, bookingSettings) && (
                <div className="bg-amber-50 text-amber-700 px-3 py-2 rounded-xl text-xs font-manrope flex items-center gap-1.5">
                  <Moon size={13} /> This booking is outside working hours ({formatTime(bookingSettings.workStartHour)}–{formatTime(bookingSettings.workEndHour)}).
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Notes</label>
                <input
                  value={bookNotes}
                  onChange={e => setBookNotes(e.target.value)}
                  placeholder="e.g., IF imaging PHOENIX chips"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                />
              </div>

              {(bookError || hasConflict(bookStartHour, bookEndHour)) && (
                <div className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-manrope">
                  {bookError || 'Time conflict! This slot is already booked.'}
                </div>
              )}

              <button
                onClick={handleBook}
                disabled={booking || hasConflict(bookStartHour, bookEndHour) || bookEndHour <= bookStartHour}
                className="w-full py-3 bg-[#102C53] text-white rounded-xl font-semibold text-sm font-manrope hover:bg-[#1a3d6e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {booking ? 'Checking availability…' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
