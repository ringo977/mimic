import Link from 'next/link';
import Hero from '@/components/Hero';
import ResearchCard from '@/components/ResearchCard';
import NewsCard from '@/components/NewsCard';
import Button from '@/components/ui/Button';
import researchData from '@/data/research.json';
import newsData from '@/data/news.json';
import { BookOpen, Cpu, Award, ExternalLink } from 'lucide-react';

// Show first 3 research topics on homepage
const researchAreas = researchData.projects.slice(0, 3);

const latestNews = newsData.news.slice(0, 3);

export default function HomePage() {
  return (
    <div className="relative z-10">
      {/* Hero Section */}
      <Hero />

      {/* About Section */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <h2 className="font-frank font-bold text-4xl md:text-5xl text-polimi-blue-heritage mb-6">
                About Our Lab
              </h2>
              <p className="text-lg text-gray-700 leading-relaxed mb-4">
                The MiMic Lab at the Department of Electronics, Information and Bioengineering (DEIB) 
                of Politecnico di Milano focuses on developing cutting-edge microfluidic technologies and 
                organ-on-chip systems.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed mb-8">
                Our interdisciplinary team combines expertise in bioengineering, microfabrication, and cell biology 
                to create innovative platforms for drug discovery, disease modeling, and personalized medicine.
              </p>
              <Link
                href="/team"
                className="hidden lg:inline-flex items-center gap-2 bg-polimi-bright-blue hover:bg-polimi-blue-heritage text-white px-8 py-4 rounded-lg font-manrope font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Meet Our Team
              </Link>
            </div>

            {/* Team Photo */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
              <img
                src={`${process.env.NODE_ENV === 'production' ? '/mimic' : ''}/images/home/team-photo.png`}
                alt="MiMic Lab Team at EUROoCS 2024 Annual Meeting"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-4">
                <p className="text-white/90 text-xs font-manrope">EUROoCS Annual Meeting 2024, Politecnico di Milano</p>
              </div>
            </div>

            {/* Meet Our Team button — mobile only, after photo */}
            <div className="lg:hidden flex justify-center col-span-full">
              <Link
                href="/team"
                className="inline-flex items-center gap-2 bg-polimi-bright-blue hover:bg-polimi-blue-heritage text-white px-8 py-4 rounded-lg font-manrope font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Meet Our Team
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Lab Highlights */}
      <section className="py-20 bg-gray-50">
        <div className="container-polimi">
          <div className="text-center mb-12">
            <h2 className="font-frank font-bold text-4xl md:text-5xl text-polimi-blue-heritage mb-4">
              Lab Highlights
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              A curated selection of peer-reviewed results, core platforms, and leadership roles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Card 1: Featured Publications */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-polimi-bright-blue/10 text-polimi-bright-blue rounded-lg flex items-center justify-center">
                  <BookOpen size={22} />
                </div>
                <h3 className="font-frank font-bold text-lg text-polimi-blue-heritage">
                  Featured Publications
                </h3>
              </div>
              <p className="text-xs text-gray-500 mb-5 font-manrope">
                Selected peer-reviewed papers showcasing key lab contributions.
              </p>
              <ul className="space-y-4 flex-1 mb-8">
                <li className="text-sm leading-relaxed pl-4 border-l-2 border-polimi-bright-blue">
                  <a href="https://doi.org/10.1182/blood.2025031558" target="_blank" rel="noopener noreferrer" className="group">
                    <span className="font-semibold text-polimi-blue-heritage group-hover:text-polimi-bright-blue transition-colors">VWF deficiency impairs angiogenesis via Angpt-2</span>
                    <span className="block text-xs text-gray-500 mt-0.5">Blood (2026)</span>
                  </a>
                </li>
                <li className="text-sm leading-relaxed pl-4 border-l-2 border-polimi-bright-blue">
                  <a href="https://doi.org/10.1002/advs.202500374" target="_blank" rel="noopener noreferrer" className="group">
                    <span className="font-semibold text-polimi-blue-heritage group-hover:text-polimi-bright-blue transition-colors">Compartmentalized Joint-on-Chip model</span>
                    <span className="block text-xs text-gray-500 mt-0.5">Advanced Science (2025)</span>
                  </a>
                </li>
                <li className="text-sm leading-relaxed pl-4 border-l-2 border-polimi-bright-blue">
                  <a href="https://doi.org/10.1038/s41551-024-01318-z" target="_blank" rel="noopener noreferrer" className="group">
                    <span className="font-semibold text-polimi-blue-heritage group-hover:text-polimi-bright-blue transition-colors">Gut-on-a-chip with human faecal samples + peristalsis</span>
                    <span className="block text-xs text-gray-500 mt-0.5">Nature Biomedical Engineering (2025)</span>
                  </a>
                </li>
              </ul>
              <Link
                href="/publications"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-polimi-bright-blue border-2 border-polimi-bright-blue rounded-lg hover:bg-polimi-bright-blue hover:text-white transition-colors font-manrope mt-auto"
              >
                All publications &rarr;
              </Link>
            </div>

            {/* Card 2: Core Capabilities */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-polimi-bright-blue/10 text-polimi-bright-blue rounded-lg flex items-center justify-center">
                  <Cpu size={22} />
                </div>
                <h3 className="font-frank font-bold text-lg text-polimi-blue-heritage">
                  Core Capabilities
                </h3>
              </div>
              <p className="text-xs text-gray-500 mb-5 font-manrope">
                From microfluidic platforms to human-relevant models and technology transfer.
              </p>
              <ul className="space-y-4 flex-1 mb-8">
                <li className="text-sm leading-relaxed pl-4 border-l-2 border-polimi-bright-blue">
                  <Link href="/technology-facilities#microfabrication" className="group">
                    <span className="font-semibold text-polimi-blue-heritage group-hover:text-polimi-bright-blue transition-colors">Microfabrication &amp; soft lithography</span>
                    <span className="block text-xs text-gray-500 mt-0.5">Rapid iteration of microfluidic chips</span>
                  </Link>
                </li>
                <li className="text-sm leading-relaxed pl-4 border-l-2 border-polimi-bright-blue">
                  <Link href="/research" className="group">
                    <span className="font-semibold text-polimi-blue-heritage group-hover:text-polimi-bright-blue transition-colors">Human-relevant biological models</span>
                    <span className="block text-xs text-gray-500 mt-0.5">Disease-focused models built on patient-derived / human systems</span>
                  </Link>
                </li>
                <li className="text-sm leading-relaxed pl-4 border-l-2 border-polimi-bright-blue">
                  <Link href="/technology-facilities#ip" className="group">
                    <span className="font-semibold text-polimi-blue-heritage group-hover:text-polimi-bright-blue transition-colors">IP &amp; technology transfer</span>
                    <span className="block text-xs text-gray-500 mt-0.5">7 patents filed, 3 transferred (licensing/translation)</span>
                  </Link>
                </li>
              </ul>
              <Link
                href="/technology-facilities"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-polimi-bright-blue border-2 border-polimi-bright-blue rounded-lg hover:bg-polimi-bright-blue hover:text-white transition-colors font-manrope mt-auto"
              >
                Platforms &amp; capabilities &rarr;
              </Link>
            </div>

            {/* Card 3: Leadership & Awards */}
            <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-polimi-bright-blue/10 text-polimi-bright-blue rounded-lg flex items-center justify-center">
                  <Award size={22} />
                </div>
                <h3 className="font-frank font-bold text-lg text-polimi-blue-heritage">
                  Leadership &amp; Awards
                </h3>
              </div>
              <p className="text-xs text-gray-500 mb-5 font-manrope">
                Leadership roles and translational impact across the European OoC/MPS ecosystem.
              </p>
              <ul className="space-y-4 flex-1 mb-8">
                <li className="text-sm leading-relaxed pl-4 border-l-2 border-polimi-bright-blue">
                  <a href="https://euroocs.eu/board/marco-rasponi/" target="_blank" rel="noopener noreferrer" className="group">
                    <span className="font-semibold text-polimi-blue-heritage group-hover:text-polimi-bright-blue transition-colors">Marco Rasponi</span>
                    <span className="block text-xs text-gray-500 mt-0.5">Chair, EUROoCS</span>
                  </a>
                </li>
                <li className="text-sm leading-relaxed pl-4 border-l-2 border-polimi-bright-blue">
                  <a href="https://iamps.eu/" target="_blank" rel="noopener noreferrer" className="group">
                    <span className="font-semibold text-polimi-blue-heritage group-hover:text-polimi-bright-blue transition-colors">Paola Occhetta</span>
                    <span className="block text-xs text-gray-500 mt-0.5">Vice President (Regulatory Adoption &amp; Partnerships), IAMPS</span>
                  </a>
                </li>
                <li className="text-sm leading-relaxed pl-4 border-l-2 border-polimi-bright-blue">
                  <a href="https://www.polimi.it/en/research/technology-transfer/spin-off/biomimx" target="_blank" rel="noopener noreferrer" className="group">
                    <span className="font-semibold text-polimi-blue-heritage group-hover:text-polimi-bright-blue transition-colors">BiomimX</span>
                    <span className="block text-xs text-gray-500 mt-0.5">Politecnico di Milano spin-off (2017) — organs-on-chip platforms</span>
                  </a>
                </li>
              </ul>
              <Link
                href="/news"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-semibold text-polimi-bright-blue border-2 border-polimi-bright-blue rounded-lg hover:bg-polimi-bright-blue hover:text-white transition-colors font-manrope mt-auto"
              >
                More updates &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Research Areas */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <div className="text-center mb-12">
            <h2 className="font-frank font-bold text-4xl md:text-5xl text-polimi-blue-heritage mb-4">
              Research Topics
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Explore our main research focus areas and ongoing projects
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {researchAreas.map((area) => (
              <ResearchCard
                key={area.id}
                title={area.title}
                description={area.description}
                tags={area.tags}
                image={area.image}
                video={(area as any).video}
                link={`/research/${area.slug}`}
              />
            ))}
          </div>

          <div className="text-center mt-12">
            <Button href="/research" variant="primary">
              View All Research Topics
            </Button>
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="py-20 bg-gray-50">
        <div className="container-polimi">
          <div className="text-center mb-12">
            <h2 className="font-frank font-bold text-4xl md:text-5xl text-polimi-blue-heritage mb-4">
              Latest News
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Stay updated with our latest achievements and upcoming events
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {latestNews.map((news) => (
              <NewsCard key={news.id} news={news} />
            ))}
          </div>

          <div className="text-center mt-12">
            <Button href="/news" variant="primary">
              View All News
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white">
        <div className="container-polimi text-center">
          <h2 className="font-frank font-bold text-4xl md:text-5xl mb-6">
            Get in Touch
          </h2>
          <p className="text-xl text-polimi-gray mb-8 max-w-2xl mx-auto">
            Interested in learning more about what we do, collaborating with us, or joining our team?
          </p>
          <Button href="/contact" variant="primary">
            Contact Us
          </Button>
        </div>
      </section>
    </div>
  );
}
