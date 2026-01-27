'use client';

import { useState } from 'react';
import PublicationCard from '@/components/PublicationCard';
import publicationsData from '@/data/publications.json';

export default function PublicationsPage() {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Get unique years and types
  const years = ['all', ...Array.from(new Set(publicationsData.publications.map(p => p.year))).sort((a, b) => b - a)];
  const types = ['all', ...Array.from(new Set(publicationsData.publications.map(p => p.type)))];

  // Filter publications
  const filteredPublications = publicationsData.publications.filter(pub => {
    const yearMatch = selectedYear === 'all' || pub.year === selectedYear;
    const typeMatch = selectedType === 'all' || pub.type === selectedType;
    return yearMatch && typeMatch;
  });

  // Group by year
  const publicationsByYear = filteredPublications.reduce((acc, pub) => {
    if (!acc[pub.year]) acc[pub.year] = [];
    acc[pub.year].push(pub);
    return acc;
  }, {} as Record<number, typeof publicationsData.publications>);

  const sortedYears = Object.keys(publicationsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="relative z-10 pt-32 pb-20">
      {/* Header */}
      <section className="bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white py-20">
        <div className="container-polimi">
          <h1 className="font-frank font-bold text-5xl md:text-6xl mb-6">
            Publications
          </h1>
          <p className="text-xl text-polimi-gray max-w-3xl">
            Discover our latest research findings and contributions to the scientific community.
          </p>
        </div>
      </section>

      {/* Filters and Publications */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          {/* Filters */}
          <div className="bg-gray-50 rounded-xl p-6 mb-12">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Year Filter */}
              <div className="flex-1">
                <label className="block text-sm font-semibold text-polimi-blue-heritage mb-2">
                  Filter by Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-polimi-bright-blue focus:ring-2 focus:ring-polimi-bright-blue/20 outline-none transition-all"
                >
                  {years.map(year => (
                    <option key={year} value={year}>
                      {year === 'all' ? 'All Years' : year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type Filter */}
              <div className="flex-1">
                <label className="block text-sm font-semibold text-polimi-blue-heritage mb-2">
                  Filter by Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-polimi-bright-blue focus:ring-2 focus:ring-polimi-bright-blue/20 outline-none transition-all"
                >
                  {types.map(type => (
                    <option key={type} value={type}>
                      {type === 'all' ? 'All Types' : type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredPublications.length} publication{filteredPublications.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Publications by Year */}
          {sortedYears.map(year => (
            <div key={year} className="mb-16">
              <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-8 pb-3 border-b-2 border-polimi-bright-blue">
                {year}
              </h2>
              <div className="space-y-6">
                {publicationsByYear[Number(year)].map(pub => (
                  <PublicationCard key={pub.id} publication={pub} />
                ))}
              </div>
            </div>
          ))}

          {filteredPublications.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No publications found matching the selected filters.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gray-50">
        <div className="container-polimi">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            <div>
              <div className="text-4xl font-frank font-bold text-polimi-bright-blue mb-2">
                {publicationsData.publications.length}
              </div>
              <div className="text-gray-600">Total Publications</div>
            </div>
            <div>
              <div className="text-4xl font-frank font-bold text-polimi-bright-blue mb-2">
                {publicationsData.publications.filter(p => p.type === 'Journal Article').length}
              </div>
              <div className="text-gray-600">Journal Articles</div>
            </div>
            <div>
              <div className="text-4xl font-frank font-bold text-polimi-bright-blue mb-2">
                {publicationsData.publications.filter(p => p.type === 'Conference').length}
              </div>
              <div className="text-gray-600">Conference Papers</div>
            </div>
            <div>
              <div className="text-4xl font-frank font-bold text-polimi-bright-blue mb-2">
                {new Date().getFullYear() - Math.min(...publicationsData.publications.map(p => p.year))}+
              </div>
              <div className="text-gray-600">Years Active</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
