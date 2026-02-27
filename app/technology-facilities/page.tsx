import { Metadata } from 'next';
import { Cpu, Layers, Microscope, Droplets, Zap, Settings, Pipette, FlaskConical, Shield, ExternalLink } from 'lucide-react';
import FacilityGallery from '@/components/FacilityGallery';

export const metadata: Metadata = {
  title: 'Technology & Facilities | MiMic Lab',
  description: 'Our core technologies, engineering platforms, and research facilities at MiMic Lab, Politecnico di Milano.',
};

const technologies = [
  {
    id: 'ooc-engineering',
    icon: <Layers size={32} />,
    title: 'Organ-on-Chip Engineering',
    description:
      'We design and fabricate custom microfluidic devices that recapitulate the architecture and biomechanics of human organs. Our platforms integrate multiple tissue compartments, semi-permeable membranes, and perfusion channels to model complex organ-level functions in vitro.',
  },
  {
    id: 'mechanical-stimulation',
    icon: <Zap size={32} />,
    title: 'Mechanical Stimulation Systems',
    description:
      'Proprietary actuation systems deliver precisely controlled cyclic stretch, compression, and shear stress to on-chip tissues. Pneumatic and electromagnetic actuators reproduce physiological loading regimes — from cardiac contraction to joint articulation — with real-time feedback control.',
  },
  {
    id: 'microfabrication',
    icon: <Pipette size={32} />,
    title: 'Microfabrication & Soft Lithography',
    description:
      'In-house soft lithography capabilities allow rapid iteration from design to functional device within days. SU-8 master fabrication, PDMS casting, plasma bonding, and surface functionalization are routinely performed to create application-specific chip geometries.',
  },
  {
    id: 'sensing',
    icon: <Cpu size={32} />,
    title: 'Integrated Sensing & Readout',
    description:
      'On-chip and off-chip sensing modules provide real-time monitoring of key biological parameters. Embedded electrodes measure trans-epithelial electrical resistance (TEER), while optical windows enable live fluorescence imaging and oxygen sensing.',
  },
  {
    id: 'perfusion',
    icon: <Droplets size={32} />,
    title: 'Microfluidic Perfusion & Vascularization',
    description:
      'Advanced microfluidic networks enable controlled perfusion of culture chambers, supporting long-term cell viability and nutrient exchange. Self-assembled microvascular networks allow the study of angiogenesis, vascular barrier function, and immune cell trafficking.',
  },
  {
    id: 'automation',
    icon: <Settings size={32} />,
    title: 'Smart Control & Automation',
    description:
      'Custom-designed electronic control units manage pneumatic actuation, flow rates, and environmental conditions. Multi-channel programmable platforms ensure reproducibility and enable parallel experiments with independent parameter control.',
  },
];

export default function TechnologyFacilitiesPage() {
  return (
    <div className="relative z-10 pb-20">
      {/* Header */}
      <section className="bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white py-20">
        <div className="container-polimi">
          <h1 className="font-frank font-bold text-5xl md:text-6xl mb-6">
            Technology &amp; Facilities
          </h1>
          <p className="text-xl text-polimi-gray max-w-3xl">
            The engineering platforms, core technologies, and state-of-the-art facilities 
            that power our research in organ-on-chip and microphysiological systems.
          </p>
        </div>
      </section>

      {/* Core Technologies */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-6">
              Core Technologies
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Our multidisciplinary team combines expertise in microfabrication, bioengineering, 
              electronics, and cell biology to develop integrated platforms that push the boundaries 
              of in vitro modeling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {technologies.map((tech) => (
              <div
                key={tech.id}
                id={tech.id}
                className="group bg-gray-50 rounded-2xl p-8 hover:shadow-lg hover:bg-white border border-transparent hover:border-gray-200 transition-all duration-300 scroll-mt-24"
              >
                <div className="w-14 h-14 bg-polimi-bright-blue/10 text-polimi-bright-blue rounded-xl flex items-center justify-center mb-5 group-hover:bg-polimi-bright-blue group-hover:text-white transition-colors">
                  {tech.icon}
                </div>
                <h3 className="font-frank font-bold text-lg text-polimi-blue-heritage mb-3">
                  {tech.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {tech.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow / Pipeline placeholder */}
      <section className="py-20 bg-gray-50">
        <div className="container-polimi">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-6">
              From Design to Discovery
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Our end-to-end workflow takes a biological question from concept to functional 
              organ-on-chip model, integrating design, fabrication, cell culture, and data analysis.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {[
              { step: '01', title: 'Design', desc: 'Computational modeling and CAD design of microfluidic architectures tailored to the target organ.' },
              { step: '02', title: 'Fabricate', desc: 'Cleanroom photolithography and soft lithography to produce high-fidelity microfluidic devices.' },
              { step: '03', title: 'Culture', desc: 'Cell seeding, tissue maturation, and mechanical conditioning under physiological conditions.' },
              { step: '04', title: 'Analyze', desc: 'Real-time monitoring, imaging, molecular assays, and data-driven insights from on-chip experiments.' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 bg-polimi-blue-heritage text-white rounded-full flex items-center justify-center mx-auto mb-4 font-frank font-bold text-xl">
                  {item.step}
                </div>
                <h3 className="font-frank font-bold text-lg text-polimi-blue-heritage mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IP & Technology Transfer */}
      <section id="ip" className="py-20 bg-white scroll-mt-24">
        <div className="container-polimi">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-6">
              IP &amp; Technology Transfer
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Translating research into impact through patents, licensing, and spin-off creation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 bg-polimi-bright-blue/10 text-polimi-bright-blue rounded-xl flex items-center justify-center mx-auto mb-5">
                <Shield size={32} />
              </div>
              <div className="text-4xl font-frank font-bold text-polimi-bright-blue mb-2">7</div>
              <div className="text-gray-600 font-manrope text-sm">Patents Filed</div>
              <p className="text-gray-500 text-xs mt-3 leading-relaxed">
                Covering organ-on-chip device designs, actuation systems, and integrated sensing methods.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 bg-polimi-bright-blue/10 text-polimi-bright-blue rounded-xl flex items-center justify-center mx-auto mb-5">
                <ExternalLink size={32} />
              </div>
              <div className="text-4xl font-frank font-bold text-polimi-bright-blue mb-2">3</div>
              <div className="text-gray-600 font-manrope text-sm">Technologies Transferred</div>
              <p className="text-gray-500 text-xs mt-3 leading-relaxed">
                Licensing agreements and technology translation enabling commercial development of lab innovations.
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 bg-polimi-bright-blue/10 text-polimi-bright-blue rounded-xl flex items-center justify-center mx-auto mb-5">
                <Layers size={32} />
              </div>
              <div className="text-4xl font-frank font-bold text-polimi-bright-blue mb-2">1</div>
              <div className="text-gray-600 font-manrope text-sm">Spin-off Company</div>
              <p className="text-gray-500 text-xs mt-3 leading-relaxed">
                <a href="https://www.biomimx.com" target="_blank" rel="noopener noreferrer" className="text-polimi-bright-blue hover:underline font-semibold">BiomimX S.r.l.</a> — spin-off of Politecnico di Milano (2017), commercializing the patented uBeat platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section id="facilities" className="py-20 bg-gray-50">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-4 text-center">
            Research Facilities
          </h2>
          <p className="text-lg text-gray-600 text-center mb-14 max-w-3xl mx-auto">
            State-of-the-art laboratories and equipment supporting every stage of our research, 
            from device fabrication to biological analysis.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-gray-50 rounded-xl p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-polimi-bright-blue/10 text-polimi-bright-blue rounded-lg flex items-center justify-center">
                  <Cpu size={20} />
                </div>
                <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage">
                  Microfabrication Lab
                </h3>
              </div>
              <p className="text-gray-700 leading-relaxed text-sm">
                Full access to <strong>PoliFab</strong>, the Micro- and Nano-Fabrication facility of Politecnico di Milano, 
                with cleanroom-grade photolithography, etching, and deposition capabilities. 
                MiMic also operates a dedicated in-house facility for soft lithography, 
                PDMS device fabrication, and rapid prototyping.
              </p>
              <div className="mt-auto pt-5">
                <FacilityGallery
                  alt="Microfabrication Lab"
                  images={[
                    '/images/technology/facilities/microfab1.jpg',
                    '/images/technology/facilities/microfab2.jpg',
                    '/images/technology/facilities/microfab3.jpg',
                    '/images/technology/facilities/microfab4.jpg',
                  ]}
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-polimi-bright-blue/10 text-polimi-bright-blue rounded-lg flex items-center justify-center">
                  <FlaskConical size={20} />
                </div>
                <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage">
                  Cell Culture Facilities
                </h3>
              </div>
              <p className="text-gray-700 leading-relaxed text-sm">
                Dedicated cell culture rooms with incubators, biosafety cabinets, 
                and equipment for maintaining various cell lines and primary cultures.
              </p>
              <div className="mt-auto pt-5">
                <FacilityGallery
                  alt="Cell Culture Facilities"
                  images={[
                    '/images/technology/facilities/cell_culture1.jpg',
                    '/images/technology/facilities/cell_culture2.jpg',
                    '/images/technology/facilities/cell_culture3.jpeg',
                    '/images/technology/facilities/cell_culture4.jpeg',
                  ]}
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-polimi-bright-blue/10 text-polimi-bright-blue rounded-lg flex items-center justify-center">
                  <Microscope size={20} />
                </div>
                <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage">
                  Imaging Suite
                </h3>
              </div>
              <p className="text-gray-700 leading-relaxed text-sm">
                Advanced microscopy systems including confocal spinning disk with super-resolution, 
                widefield fluorescence, and live-cell imaging platforms for real-time monitoring 
                of organ-on-chip experiments.
              </p>
              <div className="mt-auto pt-5">
                <FacilityGallery
                  alt="Imaging Suite"
                  images={[
                    '/images/technology/facilities/imaging1.jpeg',
                    '/images/technology/facilities/imaging2.jpeg',
                    '/images/technology/facilities/imaging3.jpeg',
                  ]}
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-polimi-bright-blue/10 text-polimi-bright-blue rounded-lg flex items-center justify-center">
                  <Pipette size={20} />
                </div>
                <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage">
                  Analytical Laboratory
                </h3>
              </div>
              <p className="text-gray-700 leading-relaxed text-sm">
                Comprehensive analytical equipment for biochemical assays, molecular biology, 
                and characterization of biological samples. Key instruments include RT-qPCR, 
                digital PCR, FACS sorter, and a plate reader with integrated cell incubation system.
              </p>
              <div className="mt-auto pt-5">
                <FacilityGallery
                  alt="Analytical Laboratory"
                  images={[
                    '/images/technology/facilities/analysis1.jpeg',
                    '/images/technology/facilities/analysis2.jpeg',
                  ]}
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
