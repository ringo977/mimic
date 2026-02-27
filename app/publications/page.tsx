'use client';

import { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import PublicationCard from '@/components/PublicationCard';
import publicationsData from '@/data/publications.json';
import teamData from '@/data/team.json';
import { exportAllBibTeX, exportAllRIS, Publication } from '@/lib/citations';

export default function PublicationsPage() {
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedAuthor, setSelectedAuthor] = useState<string>('all');

  // Get unique years and types
  const years = ['all', ...Array.from(new Set(publicationsData.publications.map(p => p.year))).sort((a, b) => b - a)];
  const types = ['all', ...Array.from(new Set(publicationsData.publications.map(p => p.type)))];

  // Build author filter from team members only (match last name + first initial)
  const teamAuthors = useMemo(() => {
    const teamKeys = new Set(
      [...teamData.pis, ...teamData.members].map(m => {
        const clean = m.name.replace(/^(Prof\.|Dr\.)\s*/i, '').trim();
        const parts = clean.split(/\s+/);
        const lastName = parts[parts.length - 1].toLowerCase();
        const firstInitial = parts[0][0].toLowerCase();
        return `${lastName}|${firstInitial}`;
      })
    );
    const pubAuthors = new Set(
      publicationsData.publications.flatMap(p => p.authors)
    );
    return Array.from(pubAuthors)
      .filter(a => {
        const [last, rest] = a.split(',').map(s => s.trim());
        if (!last || !rest) return false;
        const initial = rest[0].toLowerCase();
        return teamKeys.has(`${last.toLowerCase()}|${initial}`);
      })
      .sort((a, b) => a.localeCompare(b));
  }, []);

  // Filter publications
  const filteredPublications = publicationsData.publications.filter(pub => {
    const yearMatch = selectedYear === 'all' || pub.year === selectedYear;
    const typeMatch = selectedType === 'all' || pub.type === selectedType;
    const authorMatch = selectedAuthor === 'all' || pub.authors.includes(selectedAuthor);
    return yearMatch && typeMatch && authorMatch;
  });

  // Group by year
  const publicationsByYear = filteredPublications.reduce((acc, pub) => {
    if (!acc[pub.year]) acc[pub.year] = [];
    acc[pub.year].push(pub);
    return acc;
  }, {} as Record<number, typeof publicationsData.publications>);

  const sortedYears = Object.keys(publicationsByYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="relative z-10 pb-20">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Year Filter */}
              <div>
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
              <div>
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

              {/* Author Filter */}
              <div>
                <label className="block text-sm font-semibold text-polimi-blue-heritage mb-2">
                  Filter by Author
                </label>
                <select
                  value={selectedAuthor}
                  onChange={(e) => setSelectedAuthor(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-polimi-bright-blue focus:ring-2 focus:ring-polimi-bright-blue/20 outline-none transition-all"
                >
                  <option value="all">All Authors</option>
                  {teamAuthors.map(author => (
                    <option key={author} value={author}>
                      {author}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="text-sm text-gray-600">
                Showing {filteredPublications.length} publication{filteredPublications.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportAllBibTeX(filteredPublications as Publication[])}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-polimi-bright-blue hover:text-polimi-alpha-blue border border-polimi-bright-blue/30 hover:border-polimi-bright-blue rounded-md px-3 py-1.5 transition-colors hover:bg-polimi-bright-blue/5"
                >
                  <Download size={13} />
                  Export all (BibTeX)
                </button>
                <button
                  onClick={() => exportAllRIS(filteredPublications as Publication[])}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-polimi-bright-blue hover:text-polimi-alpha-blue border border-polimi-bright-blue/30 hover:border-polimi-bright-blue rounded-md px-3 py-1.5 transition-colors hover:bg-polimi-bright-blue/5"
                >
                  <Download size={13} />
                  Export all (RIS)
                </button>
              </div>
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
                {publicationsData.publications.filter(p => p.type === 'Book Chapter').length}
              </div>
              <div className="text-gray-600">Book Chapters</div>
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
