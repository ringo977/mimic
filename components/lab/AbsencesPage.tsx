'use client';

import { useState, useMemo } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Clock, CalendarOff, Sun, Laptop, Thermometer, Plane, CheckCircle2, XCircle, AlertTriangle, Trash2, ClipboardList } from 'lucide-react';
import { useLabContext } from './LabContext';
import {
  Absence, AbsenceType, absenceTypeMeta, evaluateAbsenceRequest, isActiveAbsence,
  workingDaysCovered, workingDaysOfNotice, addDaysStr, isWorkingDay,
  formatDate, formatTime, buildBookingSlots, generateAbbreviation,
} from '@/data/lab-data';

const TYPE_ICONS: Record<AbsenceType, typeof Clock> = {
  hours: Clock, day_off: CalendarOff, vacation: Sun, smart_working: Laptop, sick: Thermometer, trip: Plane,
};

const TYPE_ORDER: AbsenceType[] = ['hours', 'day_off', 'vacation', 'smart_working', 'sick', 'trip'];

function todayStr(): string { return new Date().toLocaleDateString('en-CA'); }

function StatusBadge({ status }: { status: Absence['status'] }) {
  const map: Record<Absence['status'], { label: string; cls: string }> = {
    pending:       { label: 'Awaiting approval', cls: 'bg-amber-50 text-amber-700' },
    auto_approved: { label: 'Auto-approved',     cls: 'bg-green-50 text-green-700' },
    approved:      { label: 'Approved',          cls: 'bg-green-50 text-green-700' },
    rejected:      { label: 'Rejected',          cls: 'bg-red-50 text-red-600' },
    cancelled:     { label: 'Cancelled',         cls: 'bg-gray-100 text-gray-500' },
  };
  const m = map[status];
  return <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold font-manrope whitespace-nowrap ${m.cls}`}>{m.label}</span>;
}

function absenceRangeLabel(a: Absence): string {
  const range = a.startDate === a.endDate ? formatDate(a.startDate) : `${formatDate(a.startDate)} → ${formatDate(a.endDate)}`;
  return a.type === 'hours' && a.startHour !== undefined && a.endHour !== undefined
    ? `${range}, ${formatTime(a.startHour)}–${formatTime(a.endHour)}`
    : range;
}

export default function AbsencesPage() {
  const { user, users, absences, absenceSettings, updateAbsence, canApproveAbsences } = useLabContext();
  const [showForm, setShowForm] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [rejecting, setRejecting] = useState<{ id: string; note: string } | null>(null);
  const today = todayStr();

  const pending = useMemo(() => absences.filter(a => a.status === 'pending').sort((a, b) => a.startDate.localeCompare(b.startDate)), [absences]);
  const mine = useMemo(() => absences.filter(a => a.userId === user.id).sort((a, b) => b.startDate.localeCompare(a.startDate)), [absences, user.id]);

  // ---- Month grid ----
  const monthStart = useMemo(() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + monthOffset); d.setHours(12, 0, 0, 0); return d; }, [monthOffset]);
  const monthLabel = monthStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const monthKey = monthStart.toLocaleDateString('en-CA').slice(0, 7);
  const weeks = useMemo(() => {
    const first = new Date(monthStart);
    const back = (first.getDay() + 6) % 7; // Monday-based
    first.setDate(first.getDate() - back);
    const out: string[][] = [];
    const cur = new Date(first);
    do {
      const week: string[] = [];
      for (let i = 0; i < 7; i++) { week.push(cur.toLocaleDateString('en-CA')); cur.setDate(cur.getDate() + 1); }
      out.push(week);
    } while (cur.getMonth() === monthStart.getMonth());
    return out;
  }, [monthStart]);

  const visibleAbsences = useMemo(() => absences.filter(isActiveAbsence), [absences]);
  const absencesOn = (dateStr: string) => visibleAbsences.filter(a => a.startDate <= dateStr && a.endDate >= dateStr);
  const inBlackout = (dateStr: string) => absenceSettings.blackoutPeriods.find(b => dateStr >= b.start && dateStr <= b.end);

  const swUsedThisMonth = useMemo(() => {
    let n = 0;
    visibleAbsences.filter(a => a.userId === user.id && a.type === 'smart_working').forEach(a => {
      for (let cur = a.startDate; cur <= a.endDate; cur = addDaysStr(cur, 1)) {
        if (cur.slice(0, 7) === today.slice(0, 7) && isWorkingDay(cur)) n++;
      }
    });
    return n;
  }, [visibleAbsences, user.id, today]);

  const decide = (a: Absence, status: 'approved' | 'rejected', note?: string) => {
    updateAbsence({ ...a, status, decidedBy: user.name, decidedAt: new Date().toISOString(), decisionNote: note || undefined });
    setRejecting(null);
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 font-manrope">Absences &amp; Presence</h1>
          <p className="text-xs text-gray-500 font-manrope">Smart working used this month: <strong>{swUsedThisMonth}/{absenceSettings.swMonthlyCap}</strong> days</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#102C53] text-white rounded-xl text-sm font-semibold font-manrope hover:bg-[#1a3d6e] transition-colors">
          <Plus size={15} /> Request absence
        </button>
      </div>

      {/* Approvals (supervisors only) */}
      {canApproveAbsences && pending.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-amber-200">
          <h2 className="text-sm font-semibold text-gray-900 font-manrope flex items-center gap-2 mb-3">
            <ClipboardList size={16} className="text-amber-500" />
            Awaiting your approval ({pending.length})
          </h2>
          <div className="space-y-2.5">
            {pending.map(a => {
              const Icon = TYPE_ICONS[a.type];
              return (
                <div key={a.id} className="border border-gray-100 rounded-xl p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: absenceTypeMeta[a.type].color }}><Icon size={14} /></span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 font-manrope">{a.userName} · {absenceTypeMeta[a.type].label}</p>
                      <p className="text-xs text-gray-500 font-manrope">{absenceRangeLabel(a)} ({workingDaysCovered(a.startDate, a.endDate)} working day{workingDaysCovered(a.startDate, a.endDate) !== 1 ? 's' : ''}, requested {formatDate(a.requestedAt.split('T')[0])})</p>
                    </div>
                    {rejecting?.id !== a.id && (
                      <div className="flex gap-1.5">
                        <button onClick={() => decide(a, 'approved')} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold font-manrope hover:bg-green-700"><CheckCircle2 size={13} /> Approve</button>
                        <button onClick={() => setRejecting({ id: a.id, note: '' })} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold font-manrope hover:bg-red-100"><XCircle size={13} /> Reject</button>
                      </div>
                    )}
                  </div>
                  {a.flags && <p className="text-[11px] text-amber-700 font-manrope mt-2 flex items-start gap-1.5"><AlertTriangle size={12} className="shrink-0 mt-0.5" />{a.flags}</p>}
                  {a.handover && <p className="text-[11px] text-gray-600 font-manrope mt-1"><strong>Handover:</strong> {a.handover}</p>}
                  {a.notes && <p className="text-[11px] text-gray-500 font-manrope mt-1">{a.notes}</p>}
                  {rejecting?.id === a.id && (
                    <div className="flex gap-2 mt-2">
                      <input autoFocus value={rejecting.note} onChange={e => setRejecting({ id: a.id, note: e.target.value })} placeholder="Reason (optional)…"
                        className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-manrope outline-none focus:ring-2 focus:ring-[#4DC9FF]" />
                      <button onClick={() => decide(a, 'rejected', rejecting.note)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold font-manrope hover:bg-red-700">Confirm reject</button>
                      <button onClick={() => setRejecting(null)} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold font-manrope hover:bg-gray-200">Back</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Team month view */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900 font-manrope">Who&rsquo;s out — {monthLabel}</h2>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setMonthOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronLeft size={16} /></button>
            <button onClick={() => setMonthOffset(0)} className={`px-3 py-1.5 rounded-lg text-xs font-medium font-manrope ${monthOffset === 0 ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Today</button>
            <button onClick={() => setMonthOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden border border-gray-100">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className="bg-gray-50 py-1.5 text-center text-[10px] font-semibold text-gray-400 font-manrope uppercase">{d}</div>
          ))}
          {weeks.flat().map(ds => {
            const inMonth = ds.slice(0, 7) === monthKey;
            const isToday = ds === today;
            const weekend = !isWorkingDay(ds);
            const dayAbs = inMonth ? absencesOn(ds) : [];
            const blackout = inMonth ? inBlackout(ds) : undefined;
            return (
              <div key={ds} className={`min-h-[72px] p-1 ${!inMonth ? 'bg-gray-50/60' : weekend ? 'bg-gray-50' : blackout ? 'bg-red-50/60' : 'bg-white'}`}
                title={blackout ? `Restricted period${blackout.label ? `: ${blackout.label}` : ''}` : undefined}>
                <p className={`text-[10px] font-semibold font-manrope mb-0.5 ${isToday ? 'inline-flex items-center justify-center w-4.5 h-4.5 px-1 rounded-full bg-[#102C53] text-white' : inMonth ? 'text-gray-500' : 'text-gray-300'}`}>{Number(ds.slice(8))}</p>
                <div className="space-y-0.5">
                  {dayAbs.map(a => {
                    const isPending = a.status === 'pending';
                    const u = users.find(x => x.id === a.userId);
                    return (
                      <div key={a.id}
                        title={`${a.userName} — ${absenceTypeMeta[a.type].label}${a.type === 'hours' && a.startHour !== undefined ? ` ${formatTime(a.startHour)}–${formatTime(a.endHour || 0)}` : ''}${isPending ? ' (awaiting approval)' : ''}`}
                        className={`px-1 py-0.5 rounded text-[9px] font-bold font-manrope text-white truncate leading-tight ${isPending ? 'opacity-50 border border-dashed border-white' : ''}`}
                        style={{ backgroundColor: absenceTypeMeta[a.type].color }}>
                        {u?.abbreviation || generateAbbreviation(a.userName)} · {absenceTypeMeta[a.type].short}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-500 font-manrope flex-wrap">
          {TYPE_ORDER.map(t => (
            <span key={t} className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: absenceTypeMeta[t].color }} /> {absenceTypeMeta[t].label}</span>
          ))}
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-red-50 border border-red-200" /> Restricted period</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-gray-200 opacity-50" /> Faded = awaiting approval</span>
        </div>
      </div>

      {/* My requests */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-900 font-manrope mb-3">My requests</h2>
        {mine.length === 0 ? (
          <p className="text-sm text-gray-400 font-manrope py-4 text-center">No absence requests yet.</p>
        ) : (
          <div className="space-y-2">
            {mine.map(a => {
              const Icon = TYPE_ICONS[a.type];
              const canCancel = isActiveAbsence(a) && a.endDate >= today;
              return (
                <div key={a.id} className="flex flex-wrap items-center gap-2.5 border border-gray-100 rounded-xl px-3 py-2">
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0" style={{ backgroundColor: absenceTypeMeta[a.type].color }}><Icon size={14} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 font-manrope">{absenceTypeMeta[a.type].label}</p>
                    <p className="text-[11px] text-gray-500 font-manrope">{absenceRangeLabel(a)}</p>
                    {a.status === 'pending' && a.flags && <p className="text-[10px] text-amber-600 font-manrope mt-0.5">{a.flags}</p>}
                    {a.status === 'rejected' && <p className="text-[10px] text-red-500 font-manrope mt-0.5">Rejected by {a.decidedBy}{a.decisionNote ? `: ${a.decisionNote}` : ''}</p>}
                    {a.status === 'approved' && a.decidedBy && <p className="text-[10px] text-gray-400 font-manrope mt-0.5">Approved by {a.decidedBy}</p>}
                  </div>
                  <StatusBadge status={a.status} />
                  {canCancel && (
                    <button onClick={() => updateAbsence({ ...a, status: 'cancelled' })} title="Cancel request"
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"><Trash2 size={13} /></button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && <RequestModal onClose={() => setShowForm(false)} />}
    </div>
  );
}

// ============================================================
// Request form
// ============================================================
function RequestModal({ onClose }: { onClose: () => void }) {
  const { user, absences, absenceSettings, addAbsence, bookingSettings } = useLabContext();
  const today = todayStr();
  const [type, setType] = useState<AbsenceType>('day_off');
  const [startDate, setStartDate] = useState(addDaysStr(today, 1));
  const [endDate, setEndDate] = useState(addDaysStr(today, 1));
  const [startHour, setStartHour] = useState(bookingSettings.workStartHour);
  const [endHour, setEndHour] = useState(bookingSettings.workStartHour + 2);
  const [notes, setNotes] = useState('');
  const [handover, setHandover] = useState('');
  const [error, setError] = useState('');
  const slots = useMemo(() => buildBookingSlots(bookingSettings), [bookingSettings]);

  const singleDay = type === 'hours';
  const effEnd = singleDay ? startDate : endDate < startDate ? startDate : endDate;
  const days = workingDaysCovered(startDate, effEnd);
  const needsHandover = days > absenceSettings.autoApproveMaxDays && absenceTypeMeta[type].fullDay && type !== 'sick' && type !== 'smart_working';

  const evalRes = useMemo(
    () => evaluateAbsenceRequest({ userId: user.id, type, startDate, endDate: effEnd }, absences, absenceSettings, today),
    [user.id, type, startDate, effEnd, absences, absenceSettings, today],
  );

  const pickType = (t: AbsenceType) => {
    setType(t); setError('');
    if (t === 'vacation') setEndDate(addDaysStr(startDate, 4));
    else if (t !== 'sick' && startDate < today) { setStartDate(addDaysStr(today, 1)); setEndDate(addDaysStr(today, 1)); }
  };

  const submit = () => {
    setError('');
    if (!startDate) { setError('Pick a date.'); return; }
    if (type !== 'sick' && startDate < today) { setError('Only sick leave can be recorded retroactively.'); return; }
    if (!singleDay && effEnd < startDate) { setError('End date must be on or after the start date.'); return; }
    if (singleDay && endHour <= startHour) { setError('End time must be after start time.'); return; }
    if (needsHandover && !handover.trim()) { setError('Absences longer than 2 days require a handover (who covers cultures, bookings, deadlines).'); return; }
    addAbsence({
      userId: user.id, userName: user.name, type,
      startDate, endDate: effEnd,
      startHour: singleDay ? startHour : undefined,
      endHour: singleDay ? endHour : undefined,
      notes: notes.trim() || undefined,
      handover: handover.trim() || undefined,
      status: evalRes.status,
      flags: evalRes.reasons.length ? evalRes.reasons.join(' ') : undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 font-manrope">Request absence</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-1.5">
            {TYPE_ORDER.map(t => {
              const Icon = TYPE_ICONS[t];
              const active = type === t;
              return (
                <button key={t} onClick={() => pickType(t)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-[10px] font-semibold font-manrope transition-all ${active ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                  style={active ? { backgroundColor: absenceTypeMeta[t].color } : undefined}>
                  <Icon size={16} />
                  {absenceTypeMeta[t].label.split(' (')[0]}
                </button>
              );
            })}
          </div>

          <div className={`grid ${singleDay ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">{singleDay ? 'Date' : 'From'}</label>
              <input type="date" value={startDate} min={type === 'sick' ? undefined : today}
                onChange={e => { setStartDate(e.target.value); if (endDate < e.target.value) setEndDate(e.target.value); }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
            </div>
            {!singleDay && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">To (included)</label>
                <input type="date" value={effEnd} min={startDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
              </div>
            )}
          </div>

          {singleDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">From</label>
                <select value={startHour} onChange={e => { const v = Number(e.target.value); setStartHour(v); if (endHour <= v) setEndHour(v + 0.5); }}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope outline-none">
                  {slots.map(h => <option key={h} value={h}>{formatTime(h)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">To</label>
                <select value={endHour} onChange={e => setEndHour(Number(e.target.value))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope outline-none">
                  {[...slots.filter(h => h > startHour), bookingSettings.openEndHour].map(h => <option key={h} value={h}>{formatTime(h)}</option>)}
                </select>
              </div>
            </div>
          )}

          {!singleDay && days > 0 && (
            <p className="text-[11px] text-gray-500 font-manrope -mt-1">{days} working day{days !== 1 ? 's' : ''} · notice: {workingDaysOfNotice(today, startDate)} working day{workingDaysOfNotice(today, startDate) !== 1 ? 's' : ''}</p>
          )}

          {needsHandover && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Handover — who covers what <span className="text-red-500">*</span></label>
              <textarea value={handover} onChange={e => setHandover(e.target.value)} rows={2}
                placeholder="Cell cultures, active bookings, deadlines during the absence…"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none resize-none" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1 font-manrope">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] outline-none" />
          </div>

          {evalRes.status === 'auto_approved' ? (
            <div className="bg-green-50 text-green-700 px-3 py-2.5 rounded-xl text-xs font-manrope flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0" /> This request will be <strong>approved automatically</strong>.
            </div>
          ) : (
            <div className="bg-amber-50 text-amber-700 px-3 py-2.5 rounded-xl text-xs font-manrope">
              <p className="flex items-center gap-2 font-semibold mb-1"><AlertTriangle size={14} className="shrink-0" /> Needs supervisor approval:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {evalRes.reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          )}

          {error && <div className="bg-red-50 text-red-600 px-3 py-2 rounded-xl text-xs font-manrope">{error}</div>}

          <button onClick={submit} className="w-full py-3 bg-[#102C53] text-white rounded-xl font-semibold text-sm font-manrope hover:bg-[#1a3d6e] transition-colors">
            Submit request
          </button>
        </div>
      </div>
    </div>
  );
}
