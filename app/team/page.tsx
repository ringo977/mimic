import { Metadata } from 'next';
import TeamCard from '@/components/TeamCard';
import PICard from '@/components/PICard';
import teamData from '@/data/team.json';
import { SITE_URL } from '@/lib/site-contacts';

// schema.org Person entries for the principal investigators.
const piJsonLd = {
  '@context': 'https://schema.org',
  '@graph': teamData.pis.map((pi) => ({
    '@type': 'Person',
    name: pi.name.replace(/^Prof\.\s*/i, ''),
    honorificPrefix: 'Prof.',
    jobTitle: pi.role,
    email: pi.email,
    image: `${SITE_URL}${pi.image}`,
    worksFor: { '@id': `${SITE_URL}/#organization` },
    affiliation: { '@type': 'CollegeOrUniversity', name: 'Politecnico di Milano', url: 'https://www.polimi.it/' },
    sameAs: [
      pi.orcid ? `https://orcid.org/${pi.orcid}` : null,
      pi.scopusId ? `https://www.scopus.com/authid/detail.uri?authorId=${pi.scopusId}` : null,
      pi.linkedin || null,
    ].filter(Boolean),
  })),
};

export const metadata: Metadata = {
  title: 'Team | MiMic Lab',
  description: 'Meet our team of researchers and scientists at the MiMic Lab, Politecnico di Milano.',
};

export default function TeamPage() {
  return (
    <div className="relative z-10 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(piJsonLd) }} />
      {/* Header */}
      <section className="bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white py-20">
        <div className="container-polimi">
          <h1 className="font-frank font-bold text-5xl md:text-6xl mb-6">
            Our Team
          </h1>
          <p className="text-xl text-polimi-gray max-w-3xl">
            Meet the people driving innovation in organ-on-chip technology and microfluidic systems research.
          </p>
        </div>
      </section>

      {/* Principal Investigators */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-12 text-center">
            Principal Investigators
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {teamData.pis.map((pi, index) => (
              <PICard key={index} pi={pi} />
            ))}
          </div>
        </div>
      </section>

      {/* Team Members */}
      <section className="py-20 bg-gray-50">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-12 text-center">
            Team Members
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {teamData.members.map((member) => (
              <TeamCard key={member.id} member={member} />
            ))}
          </div>
        </div>
      </section>

      {/* Alumni — rendered only when data/team.json lists someone */}
      {teamData.alumni.length > 0 && (
        <section className="py-20 bg-white">
          <div className="container-polimi">
            <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-8 text-center">
              Alumni
            </h2>
            <p className="text-center text-gray-600 max-w-2xl mx-auto mb-12">
              Our former team members have gone on to pursue careers in academia, industry, and research institutions worldwide.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {teamData.alumni.map((member, idx) => (
                <TeamCard key={idx} member={member} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
