import { Metadata } from 'next';
import TeamCard from '@/components/TeamCard';
import teamData from '@/data/team.json';

export const metadata: Metadata = {
  title: 'Team | MiMic Lab',
  description: 'Meet our team of researchers and scientists at the MiMic Lab, Politecnico di Milano.',
};

export default function TeamPage() {
  return (
    <div className="relative z-10 pt-32 pb-20">
      {/* Header */}
      <section className="bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white py-20">
        <div className="container-polimi">
          <h1 className="font-frank font-bold text-5xl md:text-6xl mb-6">
            Our Team
          </h1>
          <p className="text-xl text-polimi-gray max-w-3xl">
            Meet the brilliant minds driving innovation in MiMic technology and microfluidic systems research.
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
              <div key={index} className="bg-white rounded-xl shadow-xl p-8">
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="w-40 h-40 rounded-full overflow-hidden bg-polimi-gray flex-shrink-0">
                    <div 
                      className="w-full h-full bg-cover bg-center"
                      style={{ 
                        backgroundImage: `url(${pi.image})`,
                        backgroundColor: '#E0DCDC' 
                      }}
                    />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-2">
                      {pi.name}
                    </h3>
                    <p className="text-polimi-bright-blue font-semibold text-base mb-4">
                      {pi.role}
                    </p>
                    <p className="text-gray-700 mb-4 leading-relaxed text-sm">
                      {pi.bio}
                    </p>
                    <a 
                      href={`mailto:${pi.email}`}
                      className="text-polimi-bright-blue hover:text-polimi-alpha-blue font-medium text-sm"
                    >
                      {pi.email}
                    </a>
                  </div>
                </div>
              </div>
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

      {/* Alumni Section */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-8 text-center">
            Alumni
          </h2>
          <p className="text-center text-gray-600 max-w-2xl mx-auto">
            Our former team members have gone on to pursue successful careers in academia, industry, and research institutions worldwide.
          </p>
        </div>
      </section>
    </div>
  );
}
