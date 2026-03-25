import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import researchData from '@/data/research.json';
import publicationsData from '@/data/publications.json';
import fs from 'fs';
import path from 'path';
import { siteBasePath } from '@/lib/site-base-path';

// Generate static paths for all research topics
export function generateStaticParams() {
  return researchData.projects.map((p) => ({ slug: p.slug }));
}

// Dynamic metadata
export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const project = researchData.projects.find((p) => p.slug === params.slug);
  return {
    title: project ? `${project.title} | Research | MiMic Lab` : 'Research | MiMic Lab',
    description: project?.description || '',
  };
}

export default function ResearchTopicPage({ params }: { params: { slug: string } }) {
  const project = researchData.projects.find((p) => p.slug === params.slug);

  if (!project) {
    return (
      <div className="relative z-10 pb-20">
        <section className="bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white py-20">
          <div className="container-polimi">
            <h1 className="font-frank font-bold text-5xl mb-6">Topic Not Found</h1>
          </div>
        </section>
        <div className="container-polimi py-20 text-center">
          <p className="text-gray-600 mb-8">The research topic you are looking for does not exist.</p>
          <Link href="/research" className="text-polimi-bright-blue hover:underline font-semibold">
            Back to Research
          </Link>
        </div>
      </div>
    );
  }

  // Match publications by keywords
  const keywords = project.pubKeywords || [];
  const relatedPubs = publicationsData.publications.filter((pub) => {
    const titleLower = pub.title.toLowerCase();
    return keywords.some((kw) => titleLower.includes(kw.toLowerCase()));
  });

  return (
    <div className="relative z-10 pb-20">
      {/* Header */}
      <section className="bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white py-20">
        <div className="container-polimi">
          <Link
            href="/research"
            className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-manrope mb-6 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Research Topics
          </Link>
          <h1 className="font-frank font-bold text-5xl md:text-6xl mb-6">
            {project.title}
          </h1>
          <p className="text-xl text-polimi-gray max-w-3xl">
            {project.description}
          </p>
          {project.tags && (
            <div className="flex flex-wrap gap-2 mt-6">
              {project.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-3 py-1 bg-white/15 text-white rounded-full font-medium backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sections */}
      <section className="py-16 bg-white">
        <div className="container-polimi">
          <div className="max-w-5xl mx-auto space-y-20">
            {project.sections.map((section, idx) => (
              <div
                key={idx}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-10 items-center ${
                  idx % 2 === 1 ? 'lg:direction-rtl' : ''
                }`}
              >
                {/* Text — always first on mobile, alternates on desktop */}
                <div className={idx % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-10 h-10 rounded-full bg-polimi-bright-blue/10 text-polimi-bright-blue flex items-center justify-center font-frank font-bold text-sm">
                      {idx + 1}
                    </span>
                    <h2 className="font-frank font-bold text-2xl md:text-3xl text-polimi-blue-heritage">
                      {section.title}
                    </h2>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-[15px]">
                    {section.text}
                  </p>
                </div>

                {/* Image or Video */}
                <div className={idx % 2 === 1 ? 'lg:order-1' : ''}>
                  {(() => {
                    const prefix = siteBasePath;
                    const sectionAny = section as Record<string, string>;
                    const videoPath = sectionAny.video || '';
                    const videoFile = videoPath ? path.join(process.cwd(), 'public', videoPath) : '';
                    const hasVideo = videoFile && fs.existsSync(videoFile);
                    const imgFile = section.image ? path.join(process.cwd(), 'public', section.image) : '';
                    const hasImage = imgFile && fs.existsSync(imgFile);

                    if (hasVideo) {
                      return (
                        <div className="aspect-square rounded-2xl overflow-hidden shadow-lg bg-black">
                          <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          >
                            <source src={`${prefix}${videoPath}`} type="video/mp4" />
                          </video>
                        </div>
                      );
                    }
                    if (hasImage) {
                      return (
                        <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg">
                          <img
                            src={`${prefix}${section.image}`}
                            alt={section.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      );
                    }
                    return (
                      <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-polimi-blue-heritage/5 to-polimi-bright-blue/10 border-2 border-dashed border-polimi-bright-blue/20 flex items-center justify-center">
                        <div className="text-center p-6">
                          <div className="text-4xl mb-2">🔬</div>
                          <p className="text-polimi-blue-heritage/40 font-manrope text-xs">
                            {section.title} — image coming soon
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Publications */}
      {relatedPubs.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="container-polimi">
            <div className="max-w-5xl mx-auto">
              <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-8">
                Related Publications
              </h2>
              <div className="space-y-4">
                {relatedPubs.map((pub) => (
                  <div
                    key={pub.id}
                    className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-manrope font-semibold text-[15px] text-polimi-blue-heritage mb-2 leading-snug">
                      {pub.title}
                    </h3>
                    <p className="text-xs text-gray-500 font-manrope mb-1">
                      {pub.authors.slice(0, 5).join(', ')}
                      {pub.authors.length > 5 ? ` et al.` : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs font-manrope">
                      <span className="text-gray-600 italic">{pub.journal}</span>
                      <span className="text-gray-400">{pub.year}</span>
                      {pub.doi && (
                        <a
                          href={`https://doi.org/${pub.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-polimi-bright-blue hover:underline"
                        >
                          DOI
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center mt-8">
                <Link
                  href="/publications"
                  className="text-polimi-bright-blue hover:text-polimi-alpha-blue font-semibold font-manrope text-sm"
                >
                  View All Publications →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 bg-white">
        <div className="container-polimi text-center">
          <p className="text-gray-600 font-manrope mb-4">Interested in collaborating on this topic?</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-polimi-bright-blue hover:bg-polimi-blue-heritage text-white px-8 py-4 rounded-lg font-manrope font-semibold transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Get in Touch
          </Link>
        </div>
      </section>
    </div>
  );
}
