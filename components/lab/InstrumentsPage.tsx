'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, Lock, Plus, X, Search } from 'lucide-react';
import { useLabContext } from './LabContext';
import { mockInstruments, formatTime } from '@/data/lab-data';

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00
const categories = ['All', ...Array.from(new Set(mockInstruments.map(i => i.category)))];

export default function InstrumentsPage() {
  const { user, bookings, addBooking, removeBooking } = useLabContext();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookStartHour, setBookStartHour] = useState(9);
  const [bookEndHour, setBookEndHour] = useState(10);
  const [bookNotes, setBookNotes] = useState('');
  const [search, setSearch] = useState('');

  const filteredInstruments = useMemo(() => {
    return mockInstruments.filter(i => {
      const matchCat = selectedCategory === 'All' || i.category === selectedCategory;
      const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [selectedCategory, search]);

  const instrument = mockInstruments.find(i => i.id === selectedInstrument);
  const dayBookings = bookings.filter(b => b.instrumentId === selectedInstrument && b.date === selectedDate);

  const isCertified = instrument ? (!instrument.requiresCertification || user.certifications.includes(instrument.id)) : false;

  // Calendar navigation
  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const dateLabel = new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Check for conflicts
  const hasConflict = (start: number, end: number) => {
    return dayBookings.some(b => start < b.endHour && end > b.startHour);
  };

  const handleBook = () => {
    if (!selectedInstrument || !isCertified) return;
    if (hasConflict(bookStartHour, bookEndHour)) return;
    addBooking({
      instrumentId: selectedInstrument,
      userId: user.id,
      userName: user.name,
      date: selectedDate,
      startHour: bookStartHour,
      endHour: bookEndHour,
      notes: bookNotes,
    });
    setShowBookingModal(false);
    setBookNotes('');
  };

  // If no instrument selected, show instrument list
  if (!selectedInstrument) {
    return (
      <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-4">
        <h1 className="text-lg font-bold text-gray-900 font-manrope">Instruments Booking</h1>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search instruments..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none"
          />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-manrope whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-[#102C53] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Instruments Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredInstruments.map(inst => {
            const certified = !inst.requiresCertification || user.certifications.includes(inst.id);
            const todayBookings = bookings.filter(b => b.instrumentId === inst.id && b.date === new Date().toISOString().split('T')[0]);
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

  // Instrument selected → show calendar + timeline
  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-4">
      {/* Header with back */}
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
        </div>
        {isCertified && (
          <button
            onClick={() => { setBookStartHour(9); setBookEndHour(10); setBookNotes(''); setShowBookingModal(true); }}
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
          <p className="text-sm font-semibold text-gray-900 font-manrope">{dateLabel}</p>
          <p className="text-xs text-gray-400 font-manrope mt-0.5">{dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => changeDate(1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Week Quick Nav - centered on selected date, scrolls with arrows */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {Array.from({ length: 7 }, (_, i) => {
          const base = new Date(selectedDate + 'T12:00:00');
          const d = new Date(base);
          d.setDate(base.getDate() + (i - 3)); // 3 days before, selected, 3 days after
          const ds = d.toISOString().split('T')[0];
          const dayBookingsCount = bookings.filter(b => b.instrumentId === selectedInstrument && b.date === ds).length;
          const isToday = ds === new Date().toISOString().split('T')[0];
          const isSelected = ds === selectedDate;
          return (
            <button
              key={ds}
              onClick={() => setSelectedDate(ds)}
              className={`flex flex-col items-center px-3 py-2 rounded-xl text-xs font-manrope transition-all shrink-0 ${
                isSelected ? 'bg-[#102C53] text-white' : isToday ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
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
          <div className="flex items-center gap-4 mt-2 text-xs font-manrope">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> Your bookings</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-300" /> Others</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Available</span>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {HOURS.map(hour => {
            const slotBookings = dayBookings.filter(b => hour >= b.startHour && hour < b.endHour);
            const isBooked = slotBookings.length > 0;
            const myBooking = slotBookings.find(b => b.userId === user.id);
            const otherBooking = slotBookings.find(b => b.userId !== user.id);
            const booking = myBooking || otherBooking;
            const isStart = booking && booking.startHour === hour;

            return (
              <div key={hour} className={`flex items-stretch min-h-[52px] ${isBooked ? '' : 'hover:bg-green-50/50'}`}>
                {/* Time label */}
                <div className="w-16 shrink-0 flex items-center justify-center text-xs font-mono text-gray-400 border-r border-gray-100">
                  {formatTime(hour)}
                </div>

                {/* Slot content */}
                <div className="flex-1 p-1.5">
                  {isBooked && booking ? (
                    <div className={`h-full rounded-lg px-3 py-2 flex items-center justify-between ${
                      myBooking ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {isStart ? (
                        <>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold font-manrope truncate">{booking.userName}</p>
                            <p className={`text-[10px] font-manrope ${myBooking ? 'text-blue-100' : 'text-gray-500'}`}>
                              {formatTime(booking.startHour)}-{formatTime(booking.endHour)} &middot; {booking.notes}
                            </p>
                          </div>
                          {myBooking && (
                            <button
                              onClick={() => removeBooking(booking.id)}
                              className="p-1 rounded hover:bg-blue-600 transition-colors shrink-0 ml-2"
                              title="Cancel booking"
                            >
                              <X size={14} />
                            </button>
                          )}
                        </>
                      ) : (
                        <div className={`text-[10px] font-manrope ${myBooking ? 'text-blue-200' : 'text-gray-400'}`}>
                          (continued)
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
                      {isCertified && (
                        <button
                          onClick={() => { setBookStartHour(hour); setBookEndHour(hour + 1); setBookNotes(''); setShowBookingModal(true); }}
                          className="text-[10px] text-gray-400 hover:text-[#102C53] font-manrope transition-colors"
                        >
                          + Book
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
                    onChange={e => { const v = Number(e.target.value); setBookStartHour(v); if (bookEndHour <= v) setBookEndHour(v + 1); }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                  >
                    {HOURS.map(h => <option key={h} value={h}>{formatTime(h)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">End Time</label>
                  <select
                    value={bookEndHour}
                    onChange={e => setBookEndHour(Number(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                  >
                    {HOURS.filter(h => h > bookStartHour).map(h => <option key={h} value={h}>{formatTime(h)}</option>)}
                    <option value={21}>21:00</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Notes</label>
                <input
                  value={bookNotes}
                  onChange={e => setBookNotes(e.target.value)}
                  placeholder="e.g., IF imaging PHOENIX chips"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                />
              </div>

              {hasConflict(bookStartHour, bookEndHour) && (
                <div className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-manrope">
                  Time conflict! This slot is already booked.
                </div>
              )}

              <button
                onClick={handleBook}
                disabled={hasConflict(bookStartHour, bookEndHour)}
                className="w-full py-3 bg-[#102C53] text-white rounded-xl font-semibold text-sm font-manrope hover:bg-[#1a3d6e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
