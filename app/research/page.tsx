import { Metadata } from 'next';
import Link from 'next/link';
import ResearchCard from '@/components/ResearchCard';
import researchData from '@/data/research.json';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Research | MiMic Lab',
  description: 'Explore our research projects in microfluidics, MiMic systems, and biomedical engineering.',
};

export default function ResearchPage() {
  return (
    <div className="relative z-10 pb-20">
      {/* Header */}
      <section className="bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white py-20">
        <div className="container-polimi">
          <h1 className="font-frank font-bold text-5xl md:text-6xl mb-6">
            Our Research
          </h1>
          <p className="text-xl text-polimi-gray max-w-3xl">
            Pioneering innovations in microfluidic technologies and MiMic systems 
            to advance biomedical research and drug discovery.
          </p>
        </div>
      </section>

      {/* Research Overview */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-6">
              Research Topics
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Our laboratory conducts cutting-edge research at the intersection of bioengineering, 
              microfabrication, and cell biology. We develop innovative MiMic platforms 
              that replicate human physiology for applications in drug testing, disease modeling, 
              and personalized medicine.
            </p>
          </div>

          {/* Research Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {researchData.projects.map((project) => (
              <ResearchCard
                key={project.id}
                title={project.title}
                description={project.description}
                tags={project.tags}
                image={project.image}
                video={(project as any).video}
                link={`/research/${project.slug}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Research Keywords */}
      <section className="py-20 bg-gray-50">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-8 text-center">
            Research Keywords
          </h2>
          
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {researchData.keywords.map((keyword, idx) => (
              <span 
                key={idx}
                className="px-4 py-2 bg-white border-2 border-polimi-bright-blue text-polimi-blue-heritage rounded-full font-medium hover:bg-polimi-bright-blue hover:text-white transition-colors cursor-pointer"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Technology & Facilities CTA */}
      <section className="py-20 bg-white">
        <div className="container-polimi text-center">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-6">
            Our Engineering Platforms
          </h2>
          <p className="text-lg text-gray-700 leading-relaxed max-w-3xl mx-auto mb-8">
            Discover the core technologies, fabrication methods, and state-of-the-art facilities 
            that enable our research in organ-on-chip and microphysiological systems.
          </p>
          <Link
            href="/technology-facilities"
            className="inline-flex items-center gap-2 px-8 py-3 bg-polimi-bright-blue text-white font-semibold rounded-lg hover:bg-polimi-blue-heritage transition-colors font-manrope"
          >
            See Technology &amp; Facilities
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
