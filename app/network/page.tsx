import { Metadata } from 'next';
import networkData from '@/data/network.json';
import { ExternalLink, ArrowRight } from 'lucide-react';
import dynamic from 'next/dynamic';

const NetworkMap = dynamic(() => import('@/components/NetworkMap'), { ssr: false });

export const metadata: Metadata = {
  title: 'Network | MiMic Lab',
  description: 'Our network of EU-funded projects, scientific societies, spin-offs, and international collaborators.',
};

const basePath = process.env.NODE_ENV === 'production' ? '/mimic' : '';

export default function NetworkPage() {
  return (
    <div className="relative z-10 pb-20">
      {/* Header */}
      <section className="bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white py-20">
        <div className="container-polimi">
          <h1 className="font-frank font-bold text-5xl md:text-6xl mb-6">
            Network
          </h1>
          <p className="text-xl text-polimi-gray max-w-3xl">
            EU-funded research projects, scientific societies, and a growing network 
            of international collaborators advancing organ-on-chip technology.
          </p>
        </div>
      </section>

      {/* Interactive Map */}
      <section className="py-16 bg-white">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-4 text-center">
            Our Global Network
          </h2>
          <p className="text-gray-600 text-center mb-10 max-w-2xl mx-auto">
            Collaborations spanning Europe and beyond — hover over markers to explore our partners.
          </p>
          <NetworkMap collaborators={networkData.collaborators as any} />
        </div>
      </section>

      {/* EU Projects */}
      <section className="py-20 bg-gray-50">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-4 text-center">
            Research Projects
          </h2>
          <p className="text-gray-600 text-center mb-14 max-w-2xl mx-auto">
            EU-funded consortia coordinated by the MiMic Lab, developing breakthrough 
            organ-on-chip technologies for precision medicine and drug discovery.
          </p>

          <div className="space-y-8">
            {networkData.projects.map((project) => (
              <div 
                key={project.id} 
                className={`bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden ${(project as any).comingSoon ? 'opacity-80' : ''}`}
              >
                <div className="flex flex-col md:flex-row">
                  {/* Logo area */}
                  <div className="md:w-64 lg:w-80 flex-shrink-0 bg-gray-50 flex items-center justify-center p-8">
                    {project.logo ? (
                      <img
                        src={`${basePath}${project.logo}`}
                        alt={project.name}
                        className="max-w-full max-h-32 object-contain"
                      />
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-3xl font-frank font-bold text-polimi-blue-heritage">
                          {project.name}
                        </span>
                        {(project as any).comingSoon && (
                          <span className="mt-2 text-xs font-manrope font-semibold bg-polimi-bright-blue/20 text-polimi-blue-heritage px-3 py-1 rounded-full">
                            Starting 2026
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content area */}
                  <div className="flex-1 p-8">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage">
                        {project.name}
                      </h3>
                      <span className="text-xs font-manrope font-semibold bg-polimi-bright-blue/10 text-polimi-bright-blue px-3 py-1 rounded-full">
                        {project.program}
                      </span>
                      <span className="text-xs font-manrope text-gray-500">
                        {project.period} · {project.role}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 italic mb-3">
                      {project.fullTitle}
                    </p>
                    <p className="text-gray-700 text-sm leading-relaxed mb-4">
                      {project.description}
                    </p>
                    <div className="flex flex-wrap gap-4">
                      {project.website && (
                        <a
                          href={project.website.startsWith('http') ? project.website : `https://${project.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-polimi-bright-blue hover:text-polimi-blue-heritage text-sm font-medium transition-colors"
                        >
                          <ExternalLink size={14} />
                          Project website
                        </a>
                      )}
                      {project.cordisUrl && (
                        <a
                          href={project.cordisUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-polimi-bright-blue hover:text-polimi-blue-heritage text-sm font-medium transition-colors"
                        >
                          <ExternalLink size={14} />
                          CORDIS Fact Sheet
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <a
              href="/grants"
              className="inline-flex items-center gap-2 text-polimi-bright-blue hover:text-polimi-blue-heritage font-manrope font-semibold transition-colors"
            >
              View all grants and funded projects
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* Scientific Societies + Spinoff */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-4 text-center">
            Societies & Spin-off
          </h2>
          <p className="text-gray-600 text-center mb-14 max-w-2xl mx-auto">
            Scientific communities shaping the organ-on-chip field and the MiMic Lab&apos;s own technology venture.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Societies */}
            {networkData.societies.map((soc) => (
              <div key={soc.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-8 flex flex-col items-center text-center">
                {soc.logo && (
                  <div className="w-full h-24 flex items-center justify-center mb-6">
                    <img
                      src={`${basePath}${soc.logo}`}
                      alt={soc.name}
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                )}
                <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-1">
                  {soc.name}
                </h3>
                <p className="text-polimi-bright-blue text-sm font-medium mb-3">
                  {soc.fullName}
                </p>
                <p className="text-gray-700 text-sm leading-relaxed flex-grow mb-4">
                  {soc.description}
                </p>
                {soc.website && (
                  <a
                    href={soc.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-polimi-bright-blue hover:text-polimi-blue-heritage text-sm font-medium transition-colors"
                  >
                    <ExternalLink size={14} />
                    Visit website
                  </a>
                )}
              </div>
            ))}

            {/* Spinoff */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow p-8 flex flex-col items-center text-center">
              {networkData.spinoff.logo && (
                <div className="w-full h-24 flex items-center justify-center mb-6">
                  <img
                    src={`${basePath}${networkData.spinoff.logo}`}
                    alt={networkData.spinoff.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              )}
              <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-1">
                {networkData.spinoff.name}
              </h3>
              <p className="text-polimi-bright-blue text-sm font-medium mb-3">
                {networkData.spinoff.fullName}
              </p>
              <p className="text-gray-700 text-sm leading-relaxed flex-grow mb-4">
                {networkData.spinoff.description}
              </p>
              {networkData.spinoff.website && (
                <a
                  href={networkData.spinoff.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-polimi-bright-blue hover:text-polimi-blue-heritage text-sm font-medium transition-colors"
                >
                  <ExternalLink size={14} />
                  Visit website
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Collaborators */}
      <section className="py-20 bg-gray-50">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-4 text-center">
            Collaborators
          </h2>
          <p className="text-gray-600 text-center mb-14 max-w-2xl mx-auto">
            Research groups, hospitals, and companies we work with on joint projects and bilateral collaborations.
          </p>

          <div className="max-w-4xl mx-auto">
            <ul className="divide-y divide-gray-100">
              {networkData.collaborators.map((collab, idx) => (
                <li key={idx} className="py-4 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <a
                      href={collab.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-manrope font-semibold text-polimi-blue-heritage hover:text-polimi-bright-blue transition-colors"
                    >
                      {collab.name}
                    </a>
                    <span className="text-gray-500 text-sm ml-2">
                      @ {collab.affiliation}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {(collab as any).project && (
                      <span className="text-xs font-manrope font-semibold bg-polimi-bright-blue/10 text-polimi-bright-blue px-2.5 py-0.5 rounded-full">
                        {(collab as any).project}
                      </span>
                    )}
                    <span className="text-gray-400 text-sm">
                      {collab.location}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
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
            className="inline-block bg-polimi-bright-blue hover:bg-polimi-blue-heritage text-white px-8 py-4 rounded-lg font-manrope font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Get in Touch
          </a>
        </div>
      </section>
    </div>
  );
}
