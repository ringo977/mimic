import { Metadata } from 'next';
import ResearchCard from '@/components/ResearchCard';
import researchData from '@/data/research.json';

export const metadata: Metadata = {
  title: 'Research | MiMic Lab',
  description: 'Explore our research projects in microfluidics, MiMic systems, and biomedical engineering.',
};

export default function ResearchPage() {
  return (
    <div className="relative z-10 pt-32 pb-20">
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
              Research Focus
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
                link={`/research/${project.id}`}
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

      {/* Facilities */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-12 text-center">
            Research Facilities
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-gray-50 rounded-xl p-8">
              <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-4">
                Microfabrication Lab
              </h3>
              <p className="text-gray-700">
                State-of-the-art cleanroom facilities equipped with photolithography, 
                soft lithography, and 3D printing capabilities for device fabrication.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-8">
              <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-4">
                Cell Culture Facilities
              </h3>
              <p className="text-gray-700">
                Dedicated cell culture rooms with incubators, biosafety cabinets, 
                and equipment for maintaining various cell lines and primary cultures.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-8">
              <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-4">
                Imaging Suite
              </h3>
              <p className="text-gray-700">
                Advanced microscopy systems including confocal, fluorescence, and 
                live-cell imaging platforms for real-time monitoring.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-8">
              <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-4">
                Analytical Laboratory
              </h3>
              <p className="text-gray-700">
                Comprehensive analytical equipment for biochemical assays, 
                molecular biology, and characterization of biological samples.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
