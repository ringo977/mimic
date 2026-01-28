'use client';

import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import Card from '@/components/ui/Card';
import collaborationsData from '@/data/collaborations.json';

interface Project {
  id: number;
  acronym: string;
  title: string;
  program: string;
  call: string;
  role: string;
  period: string;
  website: string | null;
  abstract: string;
}

export default function CollaborationsPage() {
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
            Collaborations
          </h1>
          <p className="text-xl text-polimi-gray max-w-3xl">
            Building bridges across continents to advance MiMic technology through 
            international partnerships and collaborative research.
          </p>
        </div>
      </section>

      {/* Intro */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-6">
              Global Research Network
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Our lab collaborates with leading research institutions, universities, and industry partners 
              worldwide. These partnerships enable knowledge exchange, resource sharing, and joint research 
              initiatives that drive innovation in microfluidics and MiMic technologies.
            </p>
          </div>
        </div>
      </section>

      {/* Academic Partners */}
      <section className="py-20 bg-gray-50">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-12 text-center">
            Academic Partners
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collaborationsData.academic.map((partner) => (
              <Card key={partner.id} className="text-center">
                <div className="w-full h-32 bg-polimi-gray rounded-lg mb-6 flex items-center justify-center">
                  <div 
                    className="max-w-full max-h-full p-4"
                    style={{ 
                      backgroundImage: `url(${partner.logo})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      width: '100%',
                      height: '100%'
                    }}
                  />
                </div>
                <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-2">
                  {partner.name}
                </h3>
                <p className="text-polimi-bright-blue text-sm font-medium mb-3">
                  {partner.location}
                </p>
                <p className="text-gray-700 text-sm">
                  {partner.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Industry Partners */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-12 text-center">
            Industry Partners
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collaborationsData.industry.map((partner) => (
              <Card key={partner.id} className="text-center">
                <div className="w-full h-32 bg-polimi-gray rounded-lg mb-6 flex items-center justify-center">
                  <div 
                    className="max-w-full max-h-full p-4"
                    style={{ 
                      backgroundImage: `url(${partner.logo})`,
                      backgroundSize: 'contain',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center',
                      width: '100%',
                      height: '100%'
                    }}
                  />
                </div>
                <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-2">
                  {partner.name}
                </h3>
                <p className="text-polimi-bright-blue text-sm font-medium mb-3">
                  {partner.sector}
                </p>
                <p className="text-gray-700 text-sm">
                  {partner.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Collaborative Projects */}
      <section className="py-20 bg-gray-50">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-12 text-center">
            Major Collaborative Projects
          </h2>

          <div className="max-w-5xl mx-auto space-y-6">
            {(collaborationsData.projects as Project[]).map((project) => {
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

      {/* CTA */}
      <section className="py-20 bg-white">
        <div className="container-polimi text-center">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-6">
            Interested in Collaborating?
          </h2>
          <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
            We welcome new collaboration opportunities with academic institutions, 
            research centers, and industry partners.
          </p>
          <a 
            href="/contact"
            className="inline-block bg-polimi-bright-blue hover:bg-polimi-alpha-blue text-white px-8 py-4 rounded-lg font-manrope font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Get in Touch
          </a>
        </div>
      </section>
    </div>
  );
}
