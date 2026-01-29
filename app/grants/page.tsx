'use client';

import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '@/components/ui/Card';
import grantsData from '@/data/grants.json';

interface Project {
  id: number;
  acronym: string;
  title: string;
  program: string;
  call: string;
  role: string;
  period: string;
  website: string | null;
  abstract?: string;
  yearGranted?: string;
  totalGrant?: string;
  localGrant?: string;
}

export default function GrantsPage() {
  const [expandedProjects, setExpandedProjects] = useState<number[]>([]);

  const toggleProject = (id: number) => {
    setExpandedProjects(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  return (
    <div className="relative z-10 pt-32 pb-20">
      {/* Header */}
      <section className="bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white py-20">
        <div className="container-polimi">
          <h1 className="font-frank font-bold text-5xl md:text-6xl mb-6">
            Grants & Projects
          </h1>
          <p className="text-xl text-polimi-gray max-w-3xl">
            Funded research projects driving innovation in organ-on-chip technology and microfluidic systems.
          </p>
        </div>
      </section>

      {/* Current Projects */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-12 text-center">
            Current Projects
          </h2>

          <div className="max-w-5xl mx-auto space-y-6">
            {(grantsData.current as Project[]).map((project) => {
              const isExpanded = expandedProjects.includes(project.id);
              
              return (
                <Card key={project.id} className="hover:shadow-xl transition-shadow duration-300">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-frank font-bold text-3xl text-polimi-bright-blue mb-2">
                        {project.acronym}
                      </h3>
                      <p className="text-lg text-polimi-blue-heritage font-medium leading-relaxed">
                        {project.title}
                      </p>
                    </div>
                    <span className="text-polimi-bright-blue font-semibold text-sm whitespace-nowrap ml-4 mt-1">
                      {project.period}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-gray-200">
                    <span className="text-sm px-3 py-1 bg-polimi-blue-heritage/10 text-polimi-blue-heritage rounded-full font-medium">
                      {project.program}
                    </span>
                    <span className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                      {project.call}
                    </span>
                    <span className="text-sm px-3 py-1 bg-polimi-bright-blue/10 text-polimi-bright-blue rounded-full font-semibold">
                      Role: {project.role}
                    </span>
                  </div>

                  {/* Website */}
                  {project.website && (
                    <a
                      href={`https://${project.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-polimi-bright-blue hover:text-polimi-alpha-blue font-medium text-sm mb-4"
                    >
                      <ExternalLink size={16} />
                      {project.website}
                    </a>
                  )}

                  {/* Abstract */}
                  <div className="mt-4">
                    <button
                      onClick={() => toggleProject(project.id)}
                      className="flex items-center gap-2 text-polimi-blue-heritage hover:text-polimi-bright-blue font-semibold text-sm mb-3 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={18} />
                          Hide Abstract
                        </>
                      ) : (
                        <>
                          <ChevronDown size={18} />
                          Show Abstract
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-polimi-bright-blue">
                        <p className="text-gray-700 leading-relaxed text-justify">
                          {project.abstract}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Past Projects */}
      <section className="py-20 bg-gray-50">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-12 text-center">
            Past Projects
          </h2>

          <div className="max-w-5xl mx-auto space-y-6">
            {(grantsData.past as Project[]).map((project) => {
              const isExpanded = expandedProjects.includes(project.id);
              
              return (
                <Card key={project.id} className="hover:shadow-xl transition-shadow duration-300 bg-white">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-frank font-bold text-2xl text-gray-600 mb-2">
                        {project.acronym}
                      </h3>
                      <p className="text-base text-gray-700 font-medium leading-relaxed">
                        {project.title}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-gray-600 font-semibold text-sm whitespace-nowrap block">
                        {project.period}
                      </span>
                      {project.yearGranted && (
                        <span className="text-gray-500 text-xs block mt-1">
                          Granted: {project.yearGranted}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap gap-3 mb-4 pb-4 border-b border-gray-200">
                    <span className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">
                      {project.program}
                    </span>
                    <span className="text-sm px-3 py-1 bg-gray-50 text-gray-600 rounded-full">
                      {project.call}
                    </span>
                    <span className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-full font-semibold">
                      Role: {project.role}
                    </span>
                  </div>

                  {/* Funding Information */}
                  {(project.totalGrant || project.localGrant) && (
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 mb-4 border border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {project.totalGrant && project.totalGrant !== 'N/A' && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 font-semibold">Total Grant</p>
                            <p className="text-lg font-bold text-gray-700">{project.totalGrant}</p>
                          </div>
                        )}
                        {project.localGrant && project.localGrant !== 'N/A' && (
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1 font-semibold">Local Grant</p>
                            <p className="text-lg font-bold text-polimi-blue-heritage">{project.localGrant}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Website */}
                  {project.website && (
                    <a
                      href={`https://${project.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-polimi-bright-blue hover:text-polimi-alpha-blue font-medium text-sm mb-4"
                    >
                      <ExternalLink size={16} />
                      {project.website}
                    </a>
                  )}

                  {/* Abstract (if available) */}
                  {project.abstract && (
                    <div className="mt-4">
                      <button
                        onClick={() => toggleProject(project.id)}
                        className="flex items-center gap-2 text-polimi-blue-heritage hover:text-polimi-bright-blue font-semibold text-sm mb-3 transition-colors"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={18} />
                            Hide Description
                          </>
                        ) : (
                          <>
                            <ChevronDown size={18} />
                            Show Description
                          </>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="bg-gray-50 rounded-lg p-6 border-l-4 border-gray-400">
                          <p className="text-gray-700 leading-relaxed text-justify">
                            {project.abstract}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
