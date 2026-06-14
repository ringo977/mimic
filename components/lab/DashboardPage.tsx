'use client';

import { useState, useMemo } from 'react';
import { Calendar, FlaskConical, Snowflake, ShoppingCart, BookOpen, AlertTriangle, Clock, Award, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLabContext } from './LabContext';
import { rolePermissions, formatTime, formatDate, isWorkingHour } from '@/data/lab-data';
import type { Booking, Instrument, LabUser, BookingSettings } from '@/data/lab-data';

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

function WeeklyCalendar({ bookings, instruments, user, bookingSettings, onNavigate }: {
  bookings: Booking[]; instruments: Instrument[]; user: LabUser; bookingSettings: BookingSettings; onNavigate: (page: string) => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeInstruments, setActiveInstruments] = useState<Set<string>>(new Set()); // empty = all
  const [preset, setPreset] = useState<RangePreset>('open');

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
              return (
                <div key={ds} className={`flex-1 relative border-l border-gray-100 ${isToday ? 'bg-[#102C53]/[0.02]' : ''}`} style={{ height: gridHeight }}>
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
                    const color = colorOf.get(ev.instrumentId) || '#64748b';
                    const start = Math.max(ev.startHour, rangeStart);
                    const end = Math.min(ev.endHour, rangeEnd);
                    if (end <= start) return null;
                    const top = (start - rangeStart) * HOUR_PX;
                    const height = Math.max((end - start) * HOUR_PX - 2, 15);
                    const widthPct = 100 / lanes;
                    const compact = height < 30;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => onNavigate('instruments')}
                        title={`${inst?.name || ev.instrumentId} · ${ev.userName} · ${formatTime(ev.startHour)}–${formatTime(ev.endHour)}${ev.notes ? ' · ' + ev.notes : ''}`}
                        className="absolute rounded-md px-1.5 py-0.5 text-left overflow-hidden text-white shadow-sm hover:shadow-md hover:brightness-105 transition-all z-10"
                        style={{
                          top,
                          height,
                          left: `calc(${lane * widthPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                          backgroundColor: color,
                          boxShadow: isMine ? `inset 0 0 0 2px rgba(255,255,255,0.9)` : undefined,
                        }}
                      >
                        <p className="text-[10px] font-semibold leading-tight truncate">{formatTime(ev.startHour)} {inst?.icon} {inst?.name || ev.instrumentId}</p>
                        {!compact && <p className="text-[9px] leading-tight truncate opacity-90">{isMine ? 'You' : ev.userName}</p>}
                      </button>
                    );
                  })}
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
      </div>
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
      <WeeklyCalendar bookings={bookings} instruments={mockInstruments} user={user} bookingSettings={bookingSettings} onNavigate={onNavigate} />

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
