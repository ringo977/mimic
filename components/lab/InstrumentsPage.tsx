'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, Lock, Plus, X, Search, Sun, Moon, Hourglass, CheckCircle2, Users, CalendarDays, CalendarRange, CalendarX2 } from 'lucide-react';
import { useLabContext } from './LabContext';
import { useConfirm } from './ConfirmDialog';
import { formatTime, buildBookingSlots, isWorkingHour, validateBookingPolicy, slotLabel, seatsTaken, peakSeats, isSlotFull, slotsUsedInWeek, hoursUsedOnDay, weekStart, addDaysStr, formatDate,
  policyCapacity, policyAdvanceDays, userGroupOf, userGroupLabel, bookingNeedsApproval, isExtraHours, isBookableTime, describeBookingPolicy } from '@/data/lab-data';
import { fetchBookingsForSlot } from '@/lib/supabase-data';

const EPS = 1e-9;

export default function InstrumentsPage() {
  const { user, permissions, bookings, addBooking, removeBooking, approveBooking, addBookingSeries, removeBookingSeries, instruments: mockInstruments, locations, users, bookingSettings, canManageAllBookings } = useLabContext();
  const canBook = permissions.canBook; // guests: read-only calendar (also enforced server-side by RLS)
  const [ConfirmDialog, confirmDelete] = useConfirm();
  const categories = useMemo(() => ['All', ...Array.from(new Set(mockInstruments.map(i => i.category)))], [mockInstruments]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  // locationId is authoritative; the location text is a copy that goes stale on rename
  const locName = (i: { locationId?: string; location?: string }) =>
    locations.find(l => l.id === i.locationId)?.name || i.location || '—';
  const respName = (i: { responsibleUserId?: string }) =>
    i.responsibleUserId ? users.find(u => u.id === i.responsibleUserId)?.name : undefined;
  const locationNames = useMemo(
    () => ['All', ...Array.from(new Set(mockInstruments.map(locName))).sort((a, b) => a.localeCompare(b))],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mockInstruments, locations]);
  const [selectedLocation, setSelectedLocation] = useState('All');
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookStartHour, setBookStartHour] = useState(bookingSettings.workStartHour);
  const [bookEndHour, setBookEndHour] = useState(bookingSettings.workStartHour + 1);
  const [bookNotes, setBookNotes] = useState('');
  // Multi-day series (instruments with policy.multiDay): last day, weekends on/off
  const [bookUntil, setBookUntil] = useState('');
  const [skipWeekends, setSkipWeekends] = useState(true);
  const [bookError, setBookError] = useState('');
  const [booking, setBooking] = useState(false);
  const [search, setSearch] = useState('');
  // Month overview of the selected instrument (find a free day quickly)
  const [showMonth, setShowMonth] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => new Date().toLocaleDateString('en-CA').slice(0, 7)); // YYYY-MM
  // Week view: 7 days from the selected date × hours, in one grid (beta testers'
  // request: see the whole week of one instrument without stepping day by day)
  const [showWeek, setShowWeek] = useState(false);

  const step = bookingSettings.slotMinutes / 60;
  const slots = useMemo(() => buildBookingSlots(bookingSettings), [bookingSettings]);
  const todayStr = new Date().toLocaleDateString('en-CA');
  const isPastDate = selectedDate < todayStr;
  const isToday = selectedDate === todayStr;
  const nowHour = (() => { const n = new Date(); return n.getHours() + n.getMinutes() / 60; })();

  const filteredInstruments = useMemo(() => {
    return mockInstruments.filter(i => {
      const matchCat = selectedCategory === 'All' || i.category === selectedCategory;
      const matchLoc = selectedLocation === 'All' || locName(i) === selectedLocation;
      const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchLoc && matchSearch;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedLocation, search, mockInstruments, locations]);

  const instrument = mockInstruments.find(i => i.id === selectedInstrument);
  const dayBookings = bookings.filter(b => b.instrumentId === selectedInstrument && b.date === selectedDate);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysStr(selectedDate, i)), [selectedDate]);
  const weekBookings = bookings.filter(b => b.instrumentId === selectedInstrument && b.date >= weekDays[0] && b.date <= weekDays[6]);

  const isCertified = instrument ? (!instrument.requiresCertification || user.certifications.includes(instrument.id)) : false;

  const changeDate = (days: number) => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toLocaleDateString('en-CA'));
  };

  const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Instruments with fixed slots (PDMS hood): clicking anywhere inside a slot
  // books the whole slot, so the timeline stays usable at 30-minute resolution.
  const policy = instrument?.bookingPolicy;
  const fixedSlots = policy?.slots && policy.slots.length > 0 ? policy.slots : null;
  const capacity = policyCapacity(policy);
  const quotaUsed = policy?.maxSlotsPerWeek && selectedInstrument
    ? slotsUsedInWeek(bookings, selectedInstrument, user.id, selectedDate) : 0;
  const hoursUsed = policy?.maxHoursPerDay && selectedInstrument
    ? hoursUsedOnDay(bookings, selectedInstrument, user.id, selectedDate) : 0;
  const myGroup = userGroupOf(user.role);
  const horizon = canManageAllBookings ? undefined : policyAdvanceDays(policy, myGroup);
  const lastBookableDate = horizon !== undefined ? addDaysStr(todayStr, horizon) : '';
  const beyondHorizon = Boolean(lastBookableDate) && selectedDate > lastBookableDate;
  const canApprove = canManageAllBookings || (!!instrument?.responsibleUserId && instrument.responsibleUserId === user.id);

  // Capacity-aware conflict: an interval is blocked only when all seats are taken.
  const hasConflict = (start: number, end: number, list: typeof bookings = dayBookings) =>
    selectedInstrument ? isSlotFull(list, instrument, selectedInstrument, selectedDate, start, end) : false;
  // Seats still free for the whole interval that a booking starting at `start` would take.
  const seatsLeftAt = (start: number, end: number) =>
    selectedInstrument ? capacity - peakSeats(bookings, selectedInstrument, selectedDate, start, end) : 0;

  // Is a given slot start no longer bookable (in the past — or, when the policy
  // allows booking a slot in progress, already ended)?
  const slotIsPast = (slotStart: number) => {
    if (canManageAllBookings) return isPastDate;
    const fs = fixedSlots?.find(s => slotStart >= s.start - EPS && slotStart < s.end - EPS);
    const end = fs ? fs.end : slotStart + step;
    return !isBookableTime(policy, selectedDate, fs ? fs.start : slotStart, end, todayStr, nowHour);
  };

  const openModalAt = (start: number) => {
    const slot = fixedSlots?.find(s => start >= s.start - EPS && start < s.end - EPS) || fixedSlots?.[0];
    setBookStartHour(slot ? slot.start : start);
    setBookEndHour(slot ? slot.end : Math.min(start + 1, bookingSettings.openEndHour));
    setBookNotes('');
    setBookUntil('');
    setSkipWeekends(true);
    setBookError('');
    setShowBookingModal(true);
  };

  // Dates of the series being composed in the form (selected date → until), or [] for a single day
  const seriesDates = (() => {
    if (!policy?.multiDay || !bookUntil || bookUntil <= selectedDate) return [];
    const out: string[] = [];
    for (let i = 0; out.length <= 31; i++) {
      const ds = addDaysStr(selectedDate, i);
      if (ds > bookUntil) break;
      const dow = new Date(ds + 'T12:00:00').getDay();
      if (skipWeekends && (dow === 0 || dow === 6)) continue;
      out.push(ds);
    }
    return out;
  })();
  const isSeries = seriesDates.length > 1;
  // First day of the series (after the selected one) that is already full at these hours
  const seriesConflictDay = isSeries
    ? seriesDates.find(ds => selectedInstrument && isSlotFull(bookings, instrument, selectedInstrument, ds, bookStartHour, bookEndHour)) : undefined;

  const handleBook = async () => {
    if (!selectedInstrument || !isCertified || !canBook) return;
    setBookError('');
    if (bookEndHour <= bookStartHour) { setBookError('End time must be after start time.'); return; }
    if (isPastDate) { setBookError('Cannot book a date in the past.'); return; }
    if (!canManageAllBookings && !isBookableTime(policy, selectedDate, bookStartHour, bookEndHour, todayStr, nowHour)) {
      setBookError(policy?.allowInProgress ? 'This slot has already ended.' : 'Cannot book a time slot in the past.'); return;
    }
    if (hasConflict(bookStartHour, bookEndHour)) { setBookError(capacity > 1 ? `All ${capacity} seats are taken in that time range.` : 'Time conflict with an existing booking.'); return; }
    if (!canManageAllBookings) {
      const policyError = validateBookingPolicy({
        instrument, bookings, userId: user.id, role: user.role, date: selectedDate,
        startHour: bookStartHour, endHour: bookEndHour, today: todayStr,
      });
      if (policyError) { setBookError(policyError); return; }
    }

    if (isSeries) {
      if (seriesDates.length > 31) { setBookError('A series covers at most 31 days.'); return; }
      if (!canManageAllBookings) {
        for (const ds of seriesDates) {
          if (lastBookableDate && ds > lastBookableDate) { setBookError(`${formatDate(ds)} is beyond your booking horizon (until ${formatDate(lastBookableDate)}).`); return; }
          const err = validateBookingPolicy({ instrument, bookings, userId: user.id, role: user.role, date: ds, startHour: bookStartHour, endHour: bookEndHour, today: todayStr });
          if (err) { setBookError(`${formatDate(ds)}: ${err}`); return; }
        }
      }
      if (seriesConflictDay) { setBookError(`${formatDate(seriesConflictDay)} is already taken at these hours.`); return; }
      setBooking(true);
      // All-or-nothing on the server (RLS + policy trigger on every day).
      const err = await addBookingSeries({ instrumentId: selectedInstrument, dates: seriesDates, startHour: bookStartHour, endHour: bookEndHour, notes: bookNotes });
      setBooking(false);
      if (err) { setBookError(`Series refused — nothing was booked. ${err}`); return; }
      setShowBookingModal(false);
      setBookNotes('');
      setBookUntil('');
      return;
    }

    setBooking(true);
    // Re-check against the freshest server state to reduce double-booking races.
    const fresh = await fetchBookingsForSlot(selectedInstrument, selectedDate);
    if (fresh === null) {
      setBooking(false);
      setBookError('Could not verify availability (connection problem). Please try again.');
      return;
    }
    if (hasConflict(bookStartHour, bookEndHour, fresh)) {
      setBooking(false);
      setBookError(capacity > 1 ? 'Someone just took the last seat in that time range. Please pick another time.' : 'Someone just booked an overlapping slot. Please pick another time.');
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
      status: !canManageAllBookings && bookingNeedsApproval(policy, bookStartHour, bookEndHour, bookingSettings) ? 'pending' : 'confirmed',
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

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 font-manrope w-16 shrink-0">Type</span>
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
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 font-manrope w-16 shrink-0 flex items-center gap-1"><MapPin size={10} /> Room</span>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {locationNames.map(loc => (
                <button
                  key={loc}
                  onClick={() => setSelectedLocation(loc)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-manrope whitespace-nowrap transition-all border ${
                    selectedLocation === loc ? 'bg-[#4DC9FF]/15 border-[#4DC9FF] text-[#102C53]' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredInstruments.length === 0 && (
          <p className="text-center py-10 text-sm text-gray-400 font-manrope">No instrument matches these filters.</p>
        )}

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
                {respName(inst) && <p className="text-[10px] text-gray-400 font-manrope">Resp. {respName(inst)}</p>}
                <div className="flex items-center gap-3 mt-2.5 text-xs text-gray-400 font-manrope">
                  <span className="flex items-center gap-1"><MapPin size={10} />{locName(inst)}</span>
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
          <p className="text-xs text-gray-500 font-manrope mt-0.5">{instrument ? locName(instrument) : ''} &middot; {instrument?.description}</p>
          {instrument?.manufacturer && <p className="text-[10px] text-gray-400 font-manrope">{instrument.manufacturer}{instrument.model ? ` ${instrument.model}` : ''}{instrument.serialNumber ? ` · S/N ${instrument.serialNumber}` : ''}</p>}
        </div>
        {canBook && isCertified && !isPastDate && (
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

      {!canBook && (
        <div className="bg-amber-50 text-amber-700 px-4 py-3 rounded-xl text-sm font-manrope flex items-center gap-2">
          <Lock size={16} /> Your role does not allow booking instruments — the calendar is read-only.
        </div>
      )}
      {canBook && !isCertified && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-manrope flex items-center gap-2">
          <Lock size={16} /> You need certification to book this instrument. Contact the Lab Manager.
        </div>
      )}

      {/* Date Navigation */}
      <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center justify-between">
        <button onClick={() => changeDate(showWeek ? -7 : -1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label={showWeek ? 'Previous week' : 'Previous day'}>
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          {showWeek ? (
            <>
              <p className="text-sm font-semibold text-gray-900 font-manrope">{formatDate(selectedDate)} – {formatDate(addDaysStr(selectedDate, 6))}</p>
              <p className="text-xs text-gray-400 font-manrope mt-0.5">{weekBookings.length} booking{weekBookings.length !== 1 ? 's' : ''} in these 7 days</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-gray-900 font-manrope">{dateLabel}{isToday && <span className="ml-2 text-[10px] text-blue-600">Today</span>}</p>
              <p className="text-xs text-gray-400 font-manrope mt-0.5">{dayBookings.length} booking{dayBookings.length !== 1 ? 's' : ''}{isPastDate && ' · past date (read-only)'}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setShowWeek(v => !v); setShowMonth(false); }}
            className={`p-2 rounded-lg transition-colors ${showWeek ? 'bg-[#102C53] text-white' : 'hover:bg-gray-100 text-gray-600'}`}
            title={showWeek ? 'Back to the day timeline' : 'Week view (7 days from this date)'}
            aria-pressed={showWeek}
          >
            <CalendarRange size={18} />
          </button>
          <button
            onClick={() => { setShowMonth(v => !v); setShowWeek(false); setMonthCursor(selectedDate.slice(0, 7)); }}
            className={`p-2 rounded-lg transition-colors ${showMonth ? 'bg-[#102C53] text-white' : 'hover:bg-gray-100 text-gray-600'}`}
            title={showMonth ? 'Hide month overview' : 'Month overview'}
            aria-pressed={showMonth}
          >
            <CalendarDays size={18} />
          </button>
          <button onClick={() => changeDate(showWeek ? 7 : 1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600" aria-label={showWeek ? 'Next week' : 'Next day'}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {showMonth && instrument && (
        <MonthOverview
          month={monthCursor}
          onMonth={setMonthCursor}
          selectedDate={selectedDate}
          onSelect={ds => setSelectedDate(ds)}
          todayStr={todayStr}
          lastBookableDate={lastBookableDate}
          dayInfo={ds => {
            const list = bookings.filter(b => b.instrumentId === instrument.id && b.date === ds);
            const mine = list.some(b => b.userId === user.id);
            // Occupancy: fixed slots → seats taken over seats available;
            // free timeline → hours booked over open hours × seats.
            let total: number, taken: number;
            if (fixedSlots) {
              total = fixedSlots.length * capacity;
              taken = fixedSlots.reduce((n, sl) => n + Math.min(capacity, seatsTaken(list, instrument.id, ds, sl.start, sl.end).length), 0);
            } else {
              total = (bookingSettings.openEndHour - bookingSettings.openStartHour) * capacity;
              taken = list.reduce((n, b) => n + (b.endHour - b.startHour), 0);
            }
            return { count: list.length, mine, ratio: total > 0 ? Math.min(1, taken / total) : 0, pending: list.some(b => b.status === 'pending') };
          }}
        />
      )}

      {/* Week Quick Nav */}
      {!showMonth && !showWeek && <div className="flex gap-1.5 overflow-x-auto pb-1">
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
      </div>}

      {/* Week grid: 7 days × hours for this instrument */}
      {showWeek && instrument && (() => {
        const HOUR_PX = 28;
        const rangeStart = Math.floor(bookingSettings.openStartHour);
        const rangeEnd = Math.ceil(bookingSettings.openEndHour);
        const hours = Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i);
        const gridH = (rangeEnd - rangeStart) * HOUR_PX;
        const snap = (h: number) => Math.round((Math.floor(h / step) * step) * 100) / 100;
        const cellClick = (e: React.MouseEvent<HTMLDivElement>, ds: string) => {
          if (!canBook || !isCertified) return;
          const r = e.currentTarget.getBoundingClientRect();
          const raw = rangeStart + (e.clientY - r.top) / HOUR_PX;
          const h = Math.min(Math.max(snap(raw), bookingSettings.openStartHour), bookingSettings.openEndHour - step);
          const inHorizon = !lastBookableDate || ds <= lastBookableDate;
          const past = canManageAllBookings ? ds < todayStr : !isBookableTime(policy, ds, h, Math.min(h + step, bookingSettings.openEndHour), todayStr, nowHour);
          if (past || !inHorizon) return;
          setSelectedDate(ds);
          openModalAt(h);
        };
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-3 flex-wrap text-xs font-manrope">
              <h2 className="text-sm font-semibold text-gray-900">Week</h2>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> Your bookings</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-300" /> Others</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 border border-amber-200" /> Extra hours</span>
              <span className="ml-auto text-gray-400">Click a free hour to book it · click a day name to open its timeline</span>
            </div>
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="flex border-b border-gray-100">
                  <div className="w-12 shrink-0" />
                  {weekDays.map(ds => {
                    const d = new Date(ds + 'T12:00:00');
                    const dIsToday = ds === todayStr;
                    const n = weekBookings.filter(b => b.date === ds).length;
                    return (
                      <button key={ds} onClick={() => { setSelectedDate(ds); setShowWeek(false); }} className="flex-1 text-center py-2 hover:bg-gray-50" title="Open this day">
                        <p className={`text-[10px] font-semibold uppercase tracking-wide font-manrope ${dIsToday ? 'text-[#102C53]' : 'text-gray-400'}`}>{d.toLocaleDateString('en', { weekday: 'short' })}</p>
                        <p className={`text-sm font-bold font-manrope inline-flex items-center justify-center w-7 h-7 rounded-full ${dIsToday ? 'bg-[#102C53] text-white' : 'text-gray-700'}`}>{d.getDate()}</p>
                        <p className="text-[9px] text-gray-400 font-manrope">{n > 0 ? `${n} bk` : ''}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="flex">
                  <div className="w-12 shrink-0 relative" style={{ height: gridH }}>
                    {hours.map(h => (
                      <div key={h} className="absolute right-1.5 text-[10px] font-mono text-gray-400 -translate-y-1/2" style={{ top: (h - rangeStart) * HOUR_PX }}>{h < 24 ? formatTime(h) : ''}</div>
                    ))}
                  </div>
                  {weekDays.map(ds => {
                    const list = weekBookings.filter(b => b.date === ds);
                    const dIsToday = ds === todayStr;
                    const beyond = Boolean(lastBookableDate) && ds > lastBookableDate;
                    const pastDay = ds < todayStr;
                    // simple lanes for capacity > 1: sort by start, assign first free lane
                    const laneEnd: number[] = [];
                    const placed = list.slice().sort((a, b) => a.startHour - b.startHour).map(b => {
                      let lane = laneEnd.findIndex(e => e <= b.startHour + EPS);
                      if (lane < 0) { lane = laneEnd.length; laneEnd.push(b.endHour); } else laneEnd[lane] = b.endHour;
                      return { b, lane };
                    });
                    const lanes = Math.max(1, laneEnd.length);
                    return (
                      <div
                        key={ds}
                        onClick={e => cellClick(e, ds)}
                        className={`flex-1 relative border-l border-gray-100 ${dIsToday ? 'bg-[#102C53]/[0.02]' : ''} ${pastDay || beyond ? 'bg-gray-50/60 cursor-default' : canBook && isCertified ? 'cursor-pointer' : ''}`}
                        style={{ height: gridH }}
                        title={beyond ? `Beyond your booking horizon (until ${formatDate(lastBookableDate)})` : undefined}
                      >
                        {hours.slice(0, -1).map(h => (
                          <div key={h} className={`absolute left-0 right-0 border-t border-gray-100 ${isWorkingHour(h, bookingSettings) ? '' : 'bg-amber-50/50'}`} style={{ top: (h - rangeStart) * HOUR_PX, height: HOUR_PX }} />
                        ))}
                        {dIsToday && nowHour >= rangeStart && nowHour <= rangeEnd && (
                          <div className="absolute left-0 right-0 border-t border-red-500 z-20 pointer-events-none" style={{ top: (nowHour - rangeStart) * HOUR_PX }} />
                        )}
                        {placed.map(({ b, lane }) => {
                          const st = Math.max(b.startHour, rangeStart), en = Math.min(b.endHour, rangeEnd);
                          if (en <= st) return null;
                          const mine = b.userId === user.id;
                          const pending = b.status === 'pending';
                          const w = 100 / lanes;
                          return (
                            <div
                              key={b.id}
                              onClick={e => { e.stopPropagation(); setSelectedDate(ds); setShowWeek(false); }}
                              className={`absolute rounded-md px-1 py-0.5 text-[10px] font-manrope leading-tight overflow-hidden z-10 cursor-pointer ${mine ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                              style={{ top: (st - rangeStart) * HOUR_PX + 1, height: Math.max((en - st) * HOUR_PX - 2, 14), left: `calc(${lane * w}% + 1px)`, width: `calc(${w}% - 2px)`,
                                backgroundImage: pending ? 'repeating-linear-gradient(135deg, rgba(255,255,255,0.35) 0 4px, transparent 4px 9px)' : undefined }}
                              title={`${b.userName} · ${formatTime(b.startHour)}–${formatTime(b.endHour)}${b.notes ? ' · ' + b.notes : ''}${pending ? ' · pending authorization' : ''}`}
                            >
                              <p className="font-semibold truncate">{pending ? '⏳ ' : ''}{mine ? 'You' : b.userName}</p>
                              {(en - st) * HOUR_PX >= 30 && <p className="truncate opacity-80">{formatTime(b.startHour)}–{formatTime(b.endHour)}</p>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Hourly Timeline */}
      {!showWeek && <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900 font-manrope">Timeline</h2>
          <div className="flex items-center gap-3 mt-2 text-xs font-manrope flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500" /> Your bookings</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-300" /> Others</span>
            <span className="flex items-center gap-1.5"><Sun size={12} className="text-emerald-500" /> Working hours {formatTime(bookingSettings.workStartHour)}–{formatTime(bookingSettings.workEndHour)}</span>
            <span className="flex items-center gap-1.5"><Moon size={12} className="text-amber-500" /> Extra hours</span>
            {capacity > 1 && <span className="flex items-center gap-1.5"><Users size={12} className="text-gray-500" /> {capacity} seats</span>}
            {policy?.extraHoursNeedApproval && <span className="flex items-center gap-1.5"><Hourglass size={12} className="text-amber-600" /> Hatched = pending authorization</span>}
          </div>
          {(() => {
            const rules = describeBookingPolicy(policy, myGroup);
            if (rules.length === 0 && !policy?.note) return null;
            return (
              <div className="mt-2 text-[11px] text-gray-500 font-manrope space-y-0.5">
                {rules.map(r => <p key={r}>• {r}</p>)}
                {policy?.note && <p>{policy.note}</p>}
                {beyondHorizon && <p className="text-red-600 font-medium">This date is beyond your booking horizon (until {formatDate(lastBookableDate)}).</p>}
              </div>
            );
          })()}
        </div>
        <div className="divide-y divide-gray-50">
          {slots.map(slot => {
            const slotBookings = dayBookings
              .filter(b => slot >= b.startHour - EPS && slot < b.endHour - EPS)
              .sort((a, b) => (a.userId === user.id ? -1 : b.userId === user.id ? 1 : 0) || a.startHour - b.startHour);
            const isBooked = slotBookings.length > 0;
            const working = isWorkingHour(slot, bookingSettings);
            const past = slotIsPast(slot);
            // Seats still free for what a booking started here would take (the whole
            // fixed slot, or one step of the free timeline).
            const fs = fixedSlots?.find(s => slot >= s.start - EPS && slot < s.end - EPS);
            const seatsLeft = seatsLeftAt(fs ? fs.start : slot, fs ? fs.end : slot + step);
            const bookable = canBook && isCertified && !past && !beyondHorizon && seatsLeft > 0;

            return (
              <div key={slot} className={`flex items-stretch min-h-[44px] ${isBooked ? '' : working ? 'hover:bg-green-50/50' : 'bg-amber-50/40 hover:bg-amber-50/70'}`}>
                <div className={`w-16 shrink-0 flex flex-col items-center justify-center text-xs font-mono border-r border-gray-100 ${working ? 'text-gray-400' : 'text-amber-500'}`}>
                  {formatTime(slot)}
                  {!working && <Moon size={9} className="mt-0.5 opacity-70" />}
                </div>

                <div className="flex-1 p-1.5 flex items-stretch gap-1.5">
                  {slotBookings.map(bk => {
                    const myBooking = bk.userId === user.id;
                    const isStart = Math.abs(bk.startHour - slot) < EPS;
                    const pending = bk.status === 'pending';
                    const canCancel = myBooking || canManageAllBookings || (pending && canApprove);
                    return (
                      <div
                        key={bk.id}
                        className={`flex-1 min-w-0 rounded-lg px-3 py-1.5 flex items-center justify-between ${myBooking ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                        style={pending ? { backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.35) 0 4px, transparent 4px 9px)' } : undefined}
                        title={pending ? 'Pending authorization (extra hours)' : undefined}
                      >
                        {isStart ? (
                          <>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold font-manrope truncate">{pending && <Hourglass size={10} className="inline mr-1 -mt-0.5" />}{bk.userName}</p>
                              <p className={`text-[10px] font-manrope truncate ${myBooking ? 'text-blue-100' : 'text-gray-500'}`}>
                                {formatTime(bk.startHour)}-{formatTime(bk.endHour)}{bk.seriesId ? ' · multi-day' : ''}{pending ? ' · pending authorization' : ''}{bk.notes ? ` · ${bk.notes}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center shrink-0 ml-2">
                              {pending && canApprove && (
                                <button onClick={() => approveBooking(bk.id)} className="p-1 rounded hover:bg-black/10 transition-colors" title="Authorize this booking">
                                  <CheckCircle2 size={14} />
                                </button>
                              )}
                              {canCancel && (
                                <button
                                  onClick={() => confirmDelete('Cancel Booking?', `${myBooking ? 'Your' : bk.userName + "'s"} booking on ${bk.date} (${formatTime(bk.startHour)}-${formatTime(bk.endHour)}) will be removed.${bk.seriesId ? ' Only this day — the other days of the series stay.' : ''}`, () => removeBooking(bk.id), 'Cancel this day')}
                                  className="p-1 rounded hover:bg-black/10 transition-colors"
                                  title={bk.seriesId ? 'Cancel this day only' : myBooking ? 'Cancel booking' : pending ? 'Refuse this request' : 'Cancel (manager override)'}
                                >
                                  <X size={14} />
                                </button>
                              )}
                              {canCancel && bk.seriesId && (() => {
                                const days = bookings.filter(x => x.seriesId === bk.seriesId).map(x => x.date).sort();
                                return (
                                  <button
                                    onClick={() => confirmDelete('Cancel the whole series?', `All ${days.length} days (${formatDate(days[0])} → ${formatDate(days[days.length - 1])}, ${formatTime(bk.startHour)}-${formatTime(bk.endHour)}) of ${myBooking ? 'your' : bk.userName + "'s"} booking will be removed.`, () => removeBookingSeries(bk.seriesId!), `Cancel ${days.length} days`)}
                                    className="p-1 rounded hover:bg-black/10 transition-colors"
                                    title={`Cancel the whole series (${days.length} days)`}
                                  >
                                    <CalendarX2 size={14} />
                                  </button>
                                );
                              })()}
                            </div>
                          </>
                        ) : (
                          <div className={`text-[10px] font-manrope truncate ${myBooking ? 'text-blue-200' : 'text-gray-400'}`}>{capacity > 1 ? bk.userName.split(' ')[0] : '(continued)'}</div>
                        )}
                      </div>
                    );
                  })}
                  {(!isBooked || (capacity > 1 && slotBookings.length < capacity)) && (
                    <div className={`${isBooked ? 'w-24 shrink-0' : 'flex-1'} rounded-lg border border-dashed flex flex-col items-center justify-center ${working ? 'border-gray-200' : 'border-amber-200'}`}>
                      {bookable ? (
                        <button
                          onClick={() => openModalAt(slot)}
                          className={`text-[10px] font-manrope transition-colors text-center ${working ? 'text-gray-400 hover:text-[#102C53]' : 'text-amber-500 hover:text-amber-700'}`}
                        >
                          + Book{working ? '' : ' (extra)'}
                          {capacity > 1 && <span className="block text-[9px] opacity-80">{seatsLeft}/{capacity} seats free</span>}
                        </button>
                      ) : capacity > 1 && seatsLeft > 0 ? (
                        <span className="text-[9px] text-gray-300 font-manrope">{seatsLeft}/{capacity} free</span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>}

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

              {fixedSlots ? (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Slot</label>
                  <div className="grid grid-cols-2 gap-2">
                    {fixedSlots.map(s => {
                      const occupants = seatsTaken(bookings, selectedInstrument!, selectedDate, s.start, s.end);
                      const full = occupants.length >= capacity;
                      const ended = !canManageAllBookings && !isBookableTime(policy, selectedDate, s.start, s.end, todayStr, nowHour);
                      const blocked = (full && !canManageAllBookings) || ended;
                      const selected = Math.abs(s.start - bookStartHour) < EPS && Math.abs(s.end - bookEndHour) < EPS;
                      return (
                        <button
                          key={`${s.start}-${s.end}`}
                          type="button"
                          disabled={blocked}
                          onClick={() => { setBookStartHour(s.start); setBookEndHour(s.end); setBookError(''); }}
                          className={`px-3 py-2.5 rounded-xl text-sm font-manrope border-2 transition-all ${
                            selected ? 'border-[#102C53] bg-[#102C53]/5 font-semibold text-gray-900'
                              : blocked ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                          title={occupants.length ? occupants.map(o => o.userName).join(', ') : ended ? 'Already ended' : undefined}
                        >
                          {slotLabel(s)}
                          {capacity > 1 ? (
                            <span className={`block text-[10px] font-normal truncate ${full ? '' : 'text-gray-400'}`}>
                              {ended ? 'ended' : full ? 'Full' : `${occupants.length}/${capacity} seats`}{occupants.length > 0 && !full ? ` · ${occupants.map(o => o.userName.split(' ')[0]).join(', ')}` : ''}
                            </span>
                          ) : (
                            occupants[0] ? <span className="block text-[10px] font-normal truncate">{occupants[0].userName}</span>
                              : ended ? <span className="block text-[10px] font-normal">ended</span> : null
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 space-y-1">
                    {policy?.maxSlotsPerWeek && (
                      <p className={`text-[11px] font-manrope ${quotaUsed >= policy.maxSlotsPerWeek ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                        {quotaUsed} of {policy.maxSlotsPerWeek} slots used in the week of {formatDate(weekStart(selectedDate))}.
                      </p>
                    )}
                    {lastBookableDate && (
                      <p className="text-[11px] text-gray-400 font-manrope">Bookable up to {formatDate(lastBookableDate)} ({horizon} days ahead for {userGroupLabel[myGroup].toLowerCase()}).</p>
                    )}
                    {capacity > 1 && <p className="text-[11px] text-gray-400 font-manrope">{capacity} seats per slot.</p>}
                    {policy?.note && <p className="text-[11px] text-gray-500 font-manrope">{policy.note}</p>}
                  </div>
                </div>
              ) : (
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
              )}

              {!fixedSlots && isExtraHours(bookStartHour, bookEndHour, bookingSettings) && (
                <div className="bg-amber-50 text-amber-700 px-3 py-2 rounded-xl text-xs font-manrope flex items-center gap-1.5">
                  <Moon size={13} className="shrink-0" />
                  <span>This booking is outside working hours ({formatTime(bookingSettings.workStartHour)}–{formatTime(bookingSettings.workEndHour)}).
                  {!canManageAllBookings && bookingNeedsApproval(policy, bookStartHour, bookEndHour, bookingSettings) && <strong> It will be pending until the instrument responsible authorizes it.</strong>}</span>
                </div>
              )}

              {!fixedSlots && policy?.maxHoursPerDay ? (
                <p className={`text-[11px] font-manrope ${hoursUsed + (bookEndHour - bookStartHour) > policy.maxHoursPerDay + EPS ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                  Max {policy.maxHoursPerDay} h per day: {hoursUsed} h already booked on {formatDate(selectedDate)}, this booking adds {bookEndHour - bookStartHour} h.
                </p>
              ) : null}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Notes</label>
                <input
                  value={bookNotes}
                  onChange={e => setBookNotes(e.target.value)}
                  placeholder="e.g., IF imaging PHOENIX chips"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                />
              </div>

              {policy?.multiDay && (
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <label className="block text-xs font-medium text-gray-700 font-manrope">Repeat every day until <span className="text-gray-400 font-normal">(optional — same hours each day)</span></label>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={bookUntil}
                      min={addDaysStr(selectedDate, 1)}
                      max={lastBookableDate || addDaysStr(selectedDate, 31)}
                      onChange={e => setBookUntil(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-gray-600 font-manrope cursor-pointer">
                      <input type="checkbox" checked={skipWeekends} onChange={e => setSkipWeekends(e.target.checked)} className="rounded" /> Skip weekends
                    </label>
                    {bookUntil && <button onClick={() => setBookUntil('')} className="text-xs text-gray-400 hover:text-gray-600 font-manrope">clear</button>}
                  </div>
                  {isSeries && (
                    <p className={`text-[11px] font-manrope ${seriesConflictDay ? 'text-red-600' : 'text-gray-500'}`}>
                      {seriesDates.length} bookings, {formatDate(seriesDates[0])} → {formatDate(seriesDates[seriesDates.length - 1])}, {formatTime(bookStartHour)}–{formatTime(bookEndHour)} each day.
                      {seriesConflictDay ? ` ${formatDate(seriesConflictDay)} is already taken.` : ' Either every day is booked or none.'}
                    </p>
                  )}
                </div>
              )}

              {(bookError || hasConflict(bookStartHour, bookEndHour)) && (
                <div className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-manrope">
                  {bookError || (capacity > 1 ? `All ${capacity} seats are taken in this time range.` : 'Time conflict! This slot is already booked.')}
                </div>
              )}

              <button
                onClick={handleBook}
                disabled={booking || hasConflict(bookStartHour, bookEndHour) || bookEndHour <= bookStartHour || Boolean(seriesConflictDay)}
                className="w-full py-3 bg-[#102C53] text-white rounded-xl font-semibold text-sm font-manrope hover:bg-[#1a3d6e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {booking ? (isSeries ? 'Booking every day…' : 'Checking availability…') : isSeries ? `Book ${seriesDates.length} days` : !canManageAllBookings && bookingNeedsApproval(policy, bookStartHour, bookEndHour, bookingSettings) ? 'Request Booking' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}


/**
 * Month grid for one instrument: each day shows how full it is (green → red),
 * a dot when the user has a booking there, and greys out past days and days
 * beyond the user's booking horizon. Clicking a day selects it in the timeline.
 */
function MonthOverview({ month, onMonth, selectedDate, onSelect, todayStr, lastBookableDate, dayInfo }: {
  month: string; onMonth: (m: string) => void;
  selectedDate: string; onSelect: (ds: string) => void;
  todayStr: string; lastBookableDate: string;
  dayInfo: (ds: string) => { count: number; mine: boolean; ratio: number; pending: boolean };
}) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1, 12);
  const daysInMonth = new Date(y, m, 0).getDate();
  const leading = (first.getDay() + 6) % 7; // Monday-first
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(y, m - 1, i + 1, 12).toLocaleDateString('en-CA')),
  ];
  while (cells.length % 7) cells.push(null);
  const shift = (delta: number) => {
    const d = new Date(y, m - 1 + delta, 1, 12);
    onMonth(d.toLocaleDateString('en-CA').slice(0, 7));
  };
  const label = first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const fill = (ratio: number) => ratio <= 0 ? 'bg-emerald-400' : ratio < 0.5 ? 'bg-emerald-500' : ratio < 1 ? 'bg-amber-400' : 'bg-red-500';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => shift(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Previous month"><ChevronLeft size={16} /></button>
        <p className="text-sm font-semibold text-gray-900 font-manrope">{label}</p>
        <button onClick={() => shift(1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600" aria-label="Next month"><ChevronRight size={16} /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="text-[10px] text-gray-400 font-manrope py-1">{d}</div>)}
        {cells.map((ds, i) => {
          if (!ds) return <div key={`e${i}`} />;
          const info = dayInfo(ds);
          const past = ds < todayStr;
          const beyond = !!lastBookableDate && ds > lastBookableDate;
          const selected = ds === selectedDate;
          const today = ds === todayStr;
          return (
            <button
              key={ds}
              onClick={() => onSelect(ds)}
              className={`relative rounded-lg py-1.5 flex flex-col items-center gap-1 text-xs font-manrope transition-colors border ${
                selected ? 'border-[#102C53] bg-[#102C53]/5 font-semibold text-gray-900'
                  : past ? 'border-transparent text-gray-300 hover:bg-gray-50'
                    : beyond ? 'border-transparent text-gray-400 hover:bg-gray-50'
                      : 'border-transparent text-gray-700 hover:bg-gray-50'
              }`}
              title={`${ds}: ${info.count} booking${info.count === 1 ? '' : 's'}${info.mine ? ' (incl. yours)' : ''}${beyond ? ' — beyond your booking horizon' : ''}`}
            >
              <span className={today ? 'text-blue-600 font-bold' : ''}>{Number(ds.slice(8))}</span>
              <span className="h-1.5 w-full max-w-[28px] rounded-full bg-gray-100 overflow-hidden">
                {info.count > 0 && !past && <span className={`block h-full ${fill(info.ratio)}`} style={{ width: `${Math.max(15, Math.round(info.ratio * 100))}%` }} />}
                {info.count > 0 && past && <span className="block h-full bg-gray-300" style={{ width: `${Math.max(15, Math.round(info.ratio * 100))}%` }} />}
              </span>
              {info.mine && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500" aria-label="You have a booking" />}
              {info.pending && <span className="absolute top-1 left-1 text-[8px]" aria-label="Pending authorization">⏳</span>}
              {beyond && !past && <Lock size={8} className="absolute bottom-1 right-1 text-gray-300" />}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 font-manrope flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-emerald-500" /> free / light</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-amber-400" /> busy</span>
        <span className="flex items-center gap-1"><span className="w-3 h-1.5 rounded-full bg-red-500" /> full</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> your booking</span>
        {lastBookableDate && <span className="flex items-center gap-1"><Lock size={9} /> beyond your horizon</span>}
      </div>
    </div>
  );
}
