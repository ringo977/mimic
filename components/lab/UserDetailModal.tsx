'use client';

import React, { useEffect, useState } from 'react';
import { X, Mail, Hash, CalendarDays, UserCheck, Award, FolderKanban, CheckCircle2, Circle, GraduationCap, Plus, Minus } from 'lucide-react';
import { LabUser, Project, Certification, Instrument, rolePermissions, generateAbbreviation, formatDate, todayStr, SUPERVISED_ROLES, TrainingKind, canGrantTraining, canGrantCertification, isPiOrAdmin } from '@/data/lab-data';
import { useDialogA11y } from '@/components/ui/useDialogA11y';
import { fetchSignupCode } from '@/lib/supabase-users';

// Person card shown when clicking a name. Used by the admin Users tab
// (showSensitive: person code) and by the members' directory (without it).
export default function UserDetailModal({ user: u, users, projects, certifications, showSensitive, onClose, footer, grant }: {
  user: LabUser;
  users: LabUser[];
  projects: Project[];
  certifications: Certification[];
  showSensitive?: boolean;
  onClose: () => void;
  footer?: React.ReactNode;
  /**
   * Lets the viewer grant trainings / certifications from this card:
   * microfab training by any MiMic PhD and up, biological training by Lab
   * Manager and up, certifications by the responsible of an instrument they
   * unlock (PI / Admin: everything). Server: protect_lab_user_fields v3.
   */
  grant?: { actor: LabUser; instruments: Instrument[]; onUpdate: (u: LabUser) => void };
}) {
  const supervisor = users.find(x => x.id === u.supervisorId);
  const supervises = users.filter(x => x.supervisorId === u.id && x.status !== 'alumni');
  // Registration code of a member who has not created their login yet.
  // RLS returns it only to admins and to the member's supervisor.
  const [signupCode, setSignupCode] = useState<string | null>(null);
  useEffect(() => { let on = true; fetchSignupCode(u.id).then(c => { if (on) setSignupCode(c); }); return () => { on = false; }; }, [u.id]);
  const isAlumni = u.status === 'alumni';
  const myProjects = u.projects.map(id => projects.find(p => p.id === id)?.name || id);
  const myCerts = u.certifications.map(id => ({
    id, name: certifications.find(c => c.id === id)?.name || id, at: u.certifiedAt?.[id],
  }));
  const period = u.startDate || u.endDate
    ? `${u.startDate ? formatDate(u.startDate) : '…'} – ${isAlumni ? (u.endDate ? formatDate(u.endDate) : '…') : 'present'}`
    : null;

  const trainings: { kind: TrainingKind; label: string; done: boolean; date?: string }[] = [
    { kind: 'microfab', label: 'Microfabrication training', done: !!u.trainingMicrofabDone, date: u.trainingMicrofabDate },
    { kind: 'bio', label: 'Biological training', done: !!u.trainingBioDone, date: u.trainingBioDate },
  ];
  // Granting: never on yourself (unless PI / Admin), never on alumni.
  const granting = grant && !isAlumni && (grant.actor.id !== u.id || isPiOrAdmin(grant.actor)) ? grant : null;
  const mayGrantTraining = (kind: TrainingKind) => !!granting && canGrantTraining(granting.actor, kind);
  const setTraining = (kind: TrainingKind, done: boolean) => {
    if (!granting) return;
    const today = todayStr();
    granting.onUpdate(kind === 'microfab'
      ? { ...u, trainingMicrofabDone: done, trainingMicrofabDate: done ? today : undefined }
      : { ...u, trainingBioDone: done, trainingBioDate: done ? today : undefined });
  };
  const grantableCerts = granting ? certifications.filter(c => canGrantCertification(granting.actor, c.id, granting.instruments)) : [];
  const toggleCert = (certId: string) => {
    if (!granting) return;
    const has = u.certifications.includes(certId);
    const certifiedAt = { ...(u.certifiedAt || {}) };
    if (has) delete certifiedAt[certId]; else certifiedAt[certId] = todayStr();
    granting.onUpdate({ ...u, certifications: has ? u.certifications.filter(c => c !== certId) : [...u.certifications, certId], certifiedAt });
  };

  const panelRef = useDialogA11y(true, onClose);
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={u.name} tabIndex={-1} className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto outline-none" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl text-white text-sm font-bold font-manrope ${isAlumni ? 'bg-gray-400' : 'bg-[#102C53]'}`}>
              {u.abbreviation || generateAbbreviation(u.name)}
            </span>
            <div>
              <h2 className="text-base font-bold text-gray-900 font-manrope leading-tight">{u.name}</h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-semibold font-manrope">{rolePermissions[u.role].label}</span>
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium font-manrope">{u.affiliation}</span>
                {u.isAdmin && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold font-manrope">★ Admin</span>}
                {isAlumni && <span className="px-2 py-0.5 rounded-full bg-gray-700 text-white text-[10px] font-semibold font-manrope uppercase">Alumni</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0"><X size={18} /></button>
        </div>

        <div className="space-y-3 text-sm font-manrope">
          <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
            <p className="text-gray-700 flex items-center gap-2"><Mail size={14} className="text-gray-400 shrink-0" /><a href={`mailto:${u.email}`} className="hover:underline truncate">{u.email}</a></p>
            {showSensitive && u.personCode && <p className="text-gray-700 flex items-center gap-2"><Hash size={14} className="text-gray-400 shrink-0" />Person code: <span className="font-mono">{u.personCode}</span></p>}
            {signupCode && !isAlumni && (
              <p className="text-amber-800 bg-amber-50 rounded-lg px-2.5 py-1.5 flex items-center gap-2">
                <Hash size={14} className="text-amber-500 shrink-0" />
                <span>No login yet. Registration code for &ldquo;Create account&rdquo;: <span className="font-mono font-bold tracking-widest">{signupCode}</span></span>
              </p>
            )}
            {period && <p className="text-gray-700 flex items-center gap-2"><CalendarDays size={14} className="text-gray-400 shrink-0" />{period}</p>}
            {SUPERVISED_ROLES.includes(u.role) && (
              <p className="text-gray-700 flex items-center gap-2"><UserCheck size={14} className="text-gray-400 shrink-0" />
                Supervisor: {supervisor ? supervisor.name : <span className="text-amber-600">not assigned</span>}
              </p>
            )}
            {supervises.length > 0 && (
              <p className="text-gray-700 flex items-start gap-2"><GraduationCap size={14} className="text-gray-400 shrink-0 mt-0.5" />
                <span>Supervises: {supervises.map(x => x.name).join(', ')}</span>
              </p>
            )}
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Trainings</p>
            <div className="space-y-1">
              {trainings.map(t => (
                <div key={t.label} className="flex items-center gap-2">
                  <p className={`flex-1 flex items-center gap-2 text-xs ${t.done ? 'text-green-700' : 'text-gray-400'}`}>
                    {t.done ? <CheckCircle2 size={14} className="shrink-0" /> : <Circle size={14} className="shrink-0" />}
                    {t.label}{t.done && t.date ? ` — completed ${formatDate(t.date)}` : t.done ? ' — completed' : ' — not completed'}
                  </p>
                  {mayGrantTraining(t.kind) && (
                    <button onClick={() => setTraining(t.kind, !t.done)} className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold font-manrope ${t.done ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600' : 'bg-green-600 text-white hover:bg-green-700'}`}>
                      {t.done ? 'Revoke' : 'Mark completed'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Award size={11} /> Certifications ({myCerts.length})</p>
            {myCerts.length === 0 && grantableCerts.length === 0 ? <p className="text-xs text-gray-400">None</p> : (
              <div className="flex flex-wrap gap-1.5">
                {myCerts.map(c => {
                  const revocable = grantableCerts.some(g => g.id === c.id);
                  return (
                    <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-green-50 text-green-700 text-[11px] font-medium">
                      {c.name}{c.at ? <span className="font-normal text-green-600/70"> · {formatDate(c.at)}</span> : null}
                      {revocable && <button onClick={() => toggleCert(c.id)} title="Revoke this certification" aria-label={`Revoke ${c.name}`} className="ml-0.5 p-0.5 rounded hover:bg-red-100 hover:text-red-600"><Minus size={11} /></button>}
                    </span>
                  );
                })}
                {grantableCerts.filter(c => !u.certifications.includes(c.id)).map(c => (
                  <button key={c.id} onClick={() => toggleCert(c.id)} title="Grant this certification (dated today)" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-100 text-gray-600 text-[11px] font-medium hover:bg-green-600 hover:text-white transition-colors">
                    <Plus size={11} /> {c.name}
                  </button>
                ))}
              </div>
            )}
            {granting && grantableCerts.length > 0 && <p className="text-[10px] text-gray-400 mt-1">You can grant the certifications of the instruments you are responsible for{isPiOrAdmin(granting.actor) ? ' (all of them, as PI / Admin)' : ''}.</p>}
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><FolderKanban size={11} /> Projects ({myProjects.length})</p>
            {myProjects.length === 0 ? <p className="text-xs text-gray-400">None</p> : (
              <div className="flex flex-wrap gap-1.5">
                {myProjects.map(p => <span key={p} className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-medium">{p}</span>)}
              </div>
            )}
          </div>

          {footer}
        </div>
      </div>
    </div>
  );
}
