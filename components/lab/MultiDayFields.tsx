'use client';

import { SeriesDay, SeriesMode, BookingSettings, formatDate, formatTime, addDaysStr } from '@/data/lab-data';

/**
 * "Until" block of a booking form, for instruments with policy.multiDay
 * (Mech stimulators, pumps, the laptop). Shared by the Instruments form and
 * the Home / week-grid modal so both offer the same thing (beta round 4:
 * testers found "until" only on the Instruments page).
 *
 * Two shapes of series:
 *   continuous — first day from the chosen start to the end of the bookable
 *                day, whole days in between, last day until the chosen end
 *                (what a 3-day Mech run is);
 *   same       — the chosen hours repeated every day.
 */
export default function MultiDayFields({ from, until, onUntil, skipWeekends, onSkipWeekends, mode, onMode, days, conflictDay, maxUntil, startHour, endHour, settings }: {
  from: string;
  until: string;
  onUntil: (v: string) => void;
  skipWeekends: boolean;
  onSkipWeekends: (v: boolean) => void;
  mode: SeriesMode;
  onMode: (m: SeriesMode) => void;
  days: SeriesDay[];
  conflictDay?: string;
  /** Last selectable day (booking horizon), or '' when unlimited. */
  maxUntil: string;
  startHour: number;
  endHour: number;
  settings: BookingSettings;
}) {
  const isSeries = days.length > 1;
  const first = days[0], last = days[days.length - 1];
  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
      <label className="block text-xs font-medium text-gray-700 font-manrope">Several days in a row — until <span className="text-gray-400 font-normal">(optional)</span></label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          value={until}
          min={addDaysStr(from, 1)}
          max={maxUntil || addDaysStr(from, 31)}
          onChange={e => onUntil(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none"
        />
        <label className="flex items-center gap-1.5 text-xs text-gray-600 font-manrope cursor-pointer">
          <input type="checkbox" checked={skipWeekends} onChange={e => onSkipWeekends(e.target.checked)} className="rounded" /> Skip weekends
        </label>
        {until && <button type="button" onClick={() => onUntil('')} className="text-xs text-gray-400 hover:text-gray-600 font-manrope">clear</button>}
      </div>
      {until && (
        <div className="flex flex-col gap-1">
          <label className="flex items-start gap-2 text-xs text-gray-700 font-manrope cursor-pointer">
            <input type="radio" name="series-mode" checked={mode === 'continuous'} onChange={() => onMode('continuous')} className="mt-0.5" />
            <span><strong>Continuous</strong> — from {formatTime(startHour)} on the first day to {formatTime(endHour)} on the last day; the days in between are booked whole ({formatTime(settings.openStartHour)}–{formatTime(settings.openEndHour)}).</span>
          </label>
          <label className="flex items-start gap-2 text-xs text-gray-700 font-manrope cursor-pointer">
            <input type="radio" name="series-mode" checked={mode === 'same'} onChange={() => onMode('same')} className="mt-0.5" />
            <span><strong>Same hours every day</strong> — {formatTime(startHour)}–{formatTime(endHour)} on each day.</span>
          </label>
        </div>
      )}
      {isSeries && (
        <p className={`text-[11px] font-manrope ${conflictDay ? 'text-red-600' : 'text-gray-500'}`}>
          {days.length} bookings: {formatDate(first.date)} {formatTime(first.startHour)} → {formatDate(last.date)} {formatTime(last.endHour)}.
          {conflictDay ? ` ${formatDate(conflictDay)} is already taken.` : ' Either every day is booked or none.'}
        </p>
      )}
      {until && !isSeries && (
        <p className="text-[11px] text-amber-600 font-manrope">No extra day in this range (weekends are skipped) — pick a later date or untick &ldquo;Skip weekends&rdquo;.</p>
      )}
    </div>
  );
}
