'use client';

import { useState, useMemo } from 'react';
import { Search, Download, Calendar, FlaskConical, Snowflake, ShoppingCart, LogIn, BookOpen } from 'lucide-react';
import { useLabContext } from './LabContext';
import { formatDateTime, formatTime } from '@/data/lab-data';

const categoryIcons: Record<string, typeof Calendar> = {
  booking: Calendar,
  reagent: FlaskConical,
  cryo: Snowflake,
  wishlist: ShoppingCart,
  auth: LogIn,
  manual: BookOpen,
};

const categoryColors: Record<string, string> = {
  booking: 'bg-blue-100 text-blue-600',
  reagent: 'bg-emerald-100 text-emerald-600',
  cryo: 'bg-cyan-100 text-cyan-600',
  wishlist: 'bg-amber-100 text-amber-600',
  auth: 'bg-purple-100 text-purple-600',
  manual: 'bg-gray-100 text-gray-600',
};

export default function LogPage({ showDatabase = false }: { showDatabase?: boolean }) {
  const { permissions, log, bookings, reagents, cryoVials, wishlist, instruments: mockInstruments } = useLabContext();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const activeTab = showDatabase ? 'database' : 'log';
  const [dbTable, setDbTable] = useState<'bookings' | 'reagents' | 'cryo' | 'wishlist'>('bookings');

  const categories = ['all', 'booking', 'reagent', 'cryo', 'wishlist', 'auth'];

  const filteredLog = useMemo(() => {
    return log.filter(l => {
      const matchCat = filterCategory === 'all' || l.category === filterCategory;
      const matchSearch = !search ||
        l.action.toLowerCase().includes(search.toLowerCase()) ||
        l.userName.toLowerCase().includes(search.toLowerCase()) ||
        l.details.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [log, filterCategory, search]);

  const exportCSV = (data: Record<string, unknown>[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => `"${String(row[h] ?? '')}"`).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const dbData: Record<string, Record<string, unknown>[]> = {
    bookings: bookings.map(b => ({
      id: b.id,
      instrument: mockInstruments.find(i => i.id === b.instrumentId)?.name || b.instrumentId,
      user: b.userName,
      date: b.date,
      time: `${formatTime(b.startHour)}-${formatTime(b.endHour)}`,
      notes: b.notes,
      created: formatDateTime(b.createdAt),
    })),
    reagents: reagents.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      stock: `${r.currentStock}/${r.maxStock}`,
      unit: r.unit,
      supplier: r.supplier,
      catalogNumber: r.catalogNumber,
      location: r.location,
      storageUnit: r.storageUnitId || '—',
      expiry: r.expiryDate,
    })),
    cryo: cryoVials.map(v => ({
      id: v.id,
      cellLine: v.cellLine,
      passage: v.passage,
      position: `${v.storageUnitId} R${v.rack} B${v.box} ${String.fromCharCode(65 + v.row)}${v.col + 1}`,
      storedBy: v.userName,
      date: v.date,
      notes: v.notes,
    })),
    wishlist: wishlist.map(w => ({
      id: w.id,
      name: w.name,
      type: w.type,
      supplier: w.supplier,
      catalogNumber: w.catalogNumber,
      cost: `€${w.estimatedCost}`,
      qty: w.quantity,
      urgency: w.urgency,
      status: w.status,
      requestedBy: w.requestedByName,
    })),
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-4">
      {activeTab === 'log' && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 font-manrope">Activity Log</h1>
            {permissions.canExportData && (
              <button
                onClick={() => exportCSV(log.map(l => ({ ...l })), 'activity_log')}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium font-manrope hover:bg-gray-200 transition-colors"
              >
                <Download size={14} /> Export
              </button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search activity..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none"
            />
          </div>

          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-manrope capitalize whitespace-nowrap transition-all ${
                  filterCategory === cat ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Log entries */}
          <div className="space-y-2">
            {filteredLog.length === 0 && (
              <div className="text-center py-12 text-gray-400 font-manrope text-sm">No activity found</div>
            )}
            {filteredLog.map(entry => {
              const Icon = categoryIcons[entry.category] || Calendar;
              const color = categoryColors[entry.category] || 'bg-gray-100 text-gray-600';
              return (
                <div key={entry.id} className="bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 font-manrope truncate">{entry.action}</p>
                    </div>
                    <p className="text-xs text-gray-500 font-manrope truncate">{entry.userName} &middot; {entry.details}</p>
                  </div>
                  <span className="text-[10px] text-gray-400 font-manrope whitespace-nowrap shrink-0">
                    {formatDateTime(entry.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'database' && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 font-manrope">Database</h1>
            <button
              onClick={() => exportCSV(dbData[dbTable], dbTable)}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-xs font-medium font-manrope hover:bg-gray-200 transition-colors"
            >
              <Download size={14} /> Export CSV
            </button>
          </div>

          {/* Table selector */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(['bookings', 'reagents', 'cryo', 'wishlist'] as const).map(t => (
              <button
                key={t}
                onClick={() => setDbTable(t)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-manrope capitalize whitespace-nowrap transition-all ${
                  dbTable === t ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t} ({dbData[t].length})
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              {dbData[dbTable].length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-manrope text-sm">No data</div>
              ) : (
                <table className="w-full text-xs font-manrope">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {Object.keys(dbData[dbTable][0]).map(key => (
                        <th key={key} className="px-3 py-2.5 text-left font-semibold text-gray-700 whitespace-nowrap">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dbData[dbTable].map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-3 py-2 text-gray-600 whitespace-nowrap max-w-[200px] truncate">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
