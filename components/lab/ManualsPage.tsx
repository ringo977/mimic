'use client';

import { useState, useMemo } from 'react';
import { Search, FileText, BookOpen, AlertTriangle, ExternalLink } from 'lucide-react';
import { useLabContext } from './LabContext';
import { formatDate } from '@/data/lab-data';

const categoryLabels = {
  protocol: { label: 'Protocols', icon: BookOpen, color: 'bg-blue-100 text-blue-700' },
  manual: { label: 'Manuals', icon: FileText, color: 'bg-emerald-100 text-emerald-700' },
  sds: { label: 'Safety Data Sheets', icon: AlertTriangle, color: 'bg-amber-100 text-amber-700' },
};

export default function ManualsPage() {
  const { manuals: mockManuals } = useLabContext();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'protocol' | 'manual' | 'sds'>('all');

  const filtered = useMemo(() => {
    return mockManuals.filter(m => {
      const matchCat = selectedCategory === 'all' || m.category === selectedCategory;
      const matchSearch = !search || m.title.toLowerCase().includes(search.toLowerCase()) || m.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [search, selectedCategory]);

  const categoryCounts = {
    all: mockManuals.length,
    protocol: mockManuals.filter(m => m.category === 'protocol').length,
    manual: mockManuals.filter(m => m.category === 'manual').length,
    sds: mockManuals.filter(m => m.category === 'sds').length,
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-4">
      <h1 className="text-lg font-bold text-gray-900 font-manrope">Manuals, Protocols & SDS</h1>

      {/* Category Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(categoryLabels) as [keyof typeof categoryLabels, typeof categoryLabels[keyof typeof categoryLabels]][]).map(([key, val]) => {
          const Icon = val.icon;
          return (
            <button
              key={key}
              onClick={() => setSelectedCategory(selectedCategory === key ? 'all' : key)}
              className={`p-4 rounded-xl border-2 text-center transition-all ${
                selectedCategory === key ? 'border-[#102C53] bg-[#102C53]/5' : 'border-gray-100 bg-white hover:border-gray-300'
              }`}
            >
              <Icon className="w-6 h-6 mx-auto mb-1.5 text-[#102C53]" />
              <p className="text-xs font-semibold text-gray-900 font-manrope">{val.label}</p>
              <p className="text-lg font-bold text-[#102C53] font-manrope">{categoryCounts[key]}</p>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-manrope focus:ring-2 focus:ring-[#4DC9FF] focus:border-transparent outline-none"
        />
      </div>

      {/* Category filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'protocol', 'manual', 'sds'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium font-manrope capitalize whitespace-nowrap transition-all ${
              selectedCategory === cat ? 'bg-[#102C53] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat === 'all' ? 'All' : categoryLabels[cat].label} ({categoryCounts[cat]})
          </button>
        ))}
      </div>

      {/* Document List */}
      <div className="space-y-2.5">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 font-manrope text-sm">No documents found</div>
        )}
        {filtered.map(doc => {
          const catInfo = categoryLabels[doc.category];
          const Icon = catInfo.icon;
          return (
            <div key={doc.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${catInfo.color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-gray-900 font-manrope">{doc.title}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${catInfo.color}`}>
                      {catInfo.label.replace(/s$/, '')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-manrope mt-1">{doc.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 font-manrope">
                    <span>Updated: {formatDate(doc.lastUpdated)}</span>
                    <span>By: {doc.uploadedBy}</span>
                    {doc.instrument && <span className="text-blue-500">Instrument: {doc.instrument}</span>}
                  </div>
                </div>
                <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#102C53] transition-colors shrink-0" title="View document">
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
