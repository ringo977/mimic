import { Metadata } from 'next';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { GraduationCap, Briefcase, FileText, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Join Us | MiMic Lab',
  description: 'Career opportunities and open positions at the MiMic Lab, Politecnico di Milano.',
};

export default function JoinPage() {
  const opportunities = [
    {
      icon: <GraduationCap size={32} />,
      title: 'PhD Positions',
      description: 'We offer fully-funded PhD positions for talented students interested in microfluidics, MiMic systems, and biomedical engineering.',
      requirements: [
        "Master's degree in Bioengineering, Mechanical Engineering, or related field",
        'Strong background in microfabrication or cell biology',
        'Excellent English communication skills',
        'Passion for interdisciplinary research'
      ]
    },
    {
      icon: <Briefcase size={32} />,
      title: 'Postdoctoral Researchers',
      description: 'Postdoctoral positions available for experienced researchers to lead independent projects and mentor junior team members.',
      requirements: [
        'PhD in relevant field',
        'Track record of publications in peer-reviewed journals',
        'Expertise in microfluidics, biosensors, or tissue engineering',
        'Leadership and mentoring skills'
      ]
    },
    {
      icon: <FileText size={32} />,
      title: 'Master Thesis Projects',
      description: 'We welcome master students from Politecnico di Milano and international partner universities to conduct their thesis research in our lab.',
      requirements: [
        'Enrolled in relevant master program',
        'Interest in experimental research',
        'Commitment for 6-12 months',
        'Basic laboratory skills'
      ]
    },
    {
      icon: <Users size={32} />,
      title: 'Internships & Visiting Researchers',
      description: 'Short-term research opportunities for undergraduate students and visiting researchers to gain hands-on experience.',
      requirements: [
        'Undergraduate or graduate student',
        'Minimum 3-month commitment',
        'Strong motivation to learn',
        'Previous lab experience (preferred)'
      ]
    }
  ];

  return (
    <div className="relative z-10 pt-32 pb-20">
      {/* Header */}
      <section className="bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white py-20">
        <div className="container-polimi">
          <h1 className="font-frank font-bold text-5xl md:text-6xl mb-6">
            Join Our Team
          </h1>
          <p className="text-xl text-polimi-gray max-w-3xl">
            Be part of a dynamic research environment at the forefront of MiMic technology 
            and microfluidic innovation.
          </p>
        </div>
      </section>

      {/* Why Join Us */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-12 text-center">
            Why Join Our Lab?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-polimi-bright-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔬</span>
              </div>
              <h3 className="font-frank font-bold text-lg mb-2">Cutting-Edge Research</h3>
              <p className="text-gray-600 text-sm">
                Work on innovative projects with state-of-the-art equipment
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-polimi-bright-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🌍</span>
              </div>
              <h3 className="font-frank font-bold text-lg mb-2">International Network</h3>
              <p className="text-gray-600 text-sm">
                Collaborate with leading researchers worldwide
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-polimi-bright-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📚</span>
              </div>
              <h3 className="font-frank font-bold text-lg mb-2">Professional Growth</h3>
              <p className="text-gray-600 text-sm">
                Develop skills through training and conferences
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-polimi-bright-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🤝</span>
              </div>
              <h3 className="font-frank font-bold text-lg mb-2">Collaborative Environment</h3>
              <p className="text-gray-600 text-sm">
                Work in a supportive, interdisciplinary team
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Opportunities */}
      <section className="py-20 bg-gray-50">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-12 text-center">
            Open Opportunities
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {opportunities.map((opp, idx) => (
              <Card key={idx} className="h-full">
                <div className="text-polimi-bright-blue mb-4">
                  {opp.icon}
                </div>
                <h3 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-3">
                  {opp.title}
                </h3>
                <p className="text-gray-700 mb-4">
                  {opp.description}
                </p>
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="font-semibold text-sm text-polimi-blue-heritage mb-2">
                    Requirements:
                  </p>
                  <ul className="space-y-1">
                    {opp.requirements.map((req, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start">
                        <span className="text-polimi-bright-blue mr-2">•</span>
                        {req}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How to Apply */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-8 text-center">
              How to Apply
            </h2>

            <Card className="mb-8">
              <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-4">
                Application Process
              </h3>
              <ol className="space-y-4">
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-polimi-bright-blue text-white rounded-full flex items-center justify-center font-bold mr-4">
                    1
                  </span>
                  <div>
                    <p className="font-semibold mb-1">Review Open Positions</p>
                    <p className="text-gray-600 text-sm">
                      Check current opportunities that match your interests and qualifications
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-polimi-bright-blue text-white rounded-full flex items-center justify-center font-bold mr-4">
                    2
                  </span>
                  <div>
                    <p className="font-semibold mb-1">Prepare Your Application</p>
                    <p className="text-gray-600 text-sm">
                      Include CV, cover letter, transcripts, and relevant publications
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-polimi-bright-blue text-white rounded-full flex items-center justify-center font-bold mr-4">
                    3
                  </span>
                  <div>
                    <p className="font-semibold mb-1">Submit Application</p>
                    <p className="text-gray-600 text-sm">
                      Send your application materials to our lab email
                    </p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-polimi-bright-blue text-white rounded-full flex items-center justify-center font-bold mr-4">
                    4
                  </span>
                  <div>
                    <p className="font-semibold mb-1">Interview & Selection</p>
                    <p className="text-gray-600 text-sm">
                      Shortlisted candidates will be invited for an interview
                    </p>
                  </div>
                </li>
              </ol>
            </Card>

            <div className="text-center">
              <p className="text-gray-700 mb-6">
                For inquiries or to submit your application, please contact us at:
              </p>
              <a 
                href="mailto:careers@organchip.polimi.it"
                className="text-polimi-bright-blue hover:text-polimi-alpha-blue font-semibold text-lg"
              >
                careers@organchip.polimi.it
              </a>
              <div className="mt-8">
                <Button href="/contact" variant="primary">
                  Contact Us
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
