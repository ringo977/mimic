'use client';

import { Calendar, FlaskConical, Snowflake, ShoppingCart, BookOpen, AlertTriangle, Clock, Award } from 'lucide-react';
import { useLabContext } from './LabContext';
import { rolePermissions, formatTime } from '@/data/lab-data';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.substring(0, 3).toUpperCase();
  return parts[0][0].toUpperCase() + parts[parts.length - 1].substring(0, 2).toUpperCase();
}

interface Props {
  onNavigate: (page: string) => void;
}

export default function DashboardPage({ onNavigate }: Props) {
  const { user, permissions, bookings, reagents, cryoVials, wishlist, instruments: mockInstruments } = useLabContext();

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
            {getInitials(user.name)}
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
