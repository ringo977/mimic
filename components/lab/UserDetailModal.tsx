'use client';

import React from 'react';
import { X, Mail, Hash, CalendarDays, UserCheck, Award, FolderKanban, CheckCircle2, Circle, GraduationCap } from 'lucide-react';
import { LabUser, Project, Certification, rolePermissions, generateAbbreviation, formatDate, SUPERVISED_ROLES } from '@/data/lab-data';

// Person card shown when clicking a name. Used by the admin Users tab
// (showSensitive: person code) and by the members' directory (without it).
export default function UserDetailModal({ user: u, users, projects, certifications, showSensitive, onClose, footer }: {
  user: LabUser;
  users: LabUser[];
  projects: Project[];
  certifications: Certification[];
  showSensitive?: boolean;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  const supervisor = users.find(x => x.id === u.supervisorId);
  const supervises = users.filter(x => x.supervisorId === u.id && x.status !== 'alumni');
  const isAlumni = u.status === 'alumni';
  const myProjects = u.projects.map(id => projects.find(p => p.id === id)?.name || id);
  const myCerts = u.certifications.map(id => certifications.find(c => c.id === id)?.name || id);
  const period = u.startDate || u.endDate
    ? `${u.startDate ? formatDate(u.startDate) : '…'} – ${isAlumni ? (u.endDate ? formatDate(u.endDate) : '…') : 'present'}`
    : null;

  const trainings = [
    { label: 'Microfabrication training', done: !!u.trainingMicrofabDone, date: u.trainingMicrofabDate },
    { label: 'Biological training', done: !!u.trainingBioDone, date: u.trainingBioDate },
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
                <p key={t.label} className={`flex items-center gap-2 text-xs ${t.done ? 'text-green-700' : 'text-gray-400'}`}>
                  {t.done ? <CheckCircle2 size={14} className="shrink-0" /> : <Circle size={14} className="shrink-0" />}
                  {t.label}{t.done && t.date ? ` — completed ${formatDate(t.date)}` : t.done ? ' — completed' : ' — not completed'}
                </p>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1"><Award size={11} /> Certifications ({myCerts.length})</p>
            {myCerts.length === 0 ? <p className="text-xs text-gray-400">None</p> : (
              <div className="flex flex-wrap gap-1.5">
                {myCerts.map(c => <span key={c} className="px-2 py-0.5 rounded-lg bg-green-50 text-green-700 text-[11px] font-medium">{c}</span>)}
              </div>
            )}
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
