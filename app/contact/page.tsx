import { Metadata } from 'next';
import Card from '@/components/ui/Card';
import { MapPin, Mail, GraduationCap, Briefcase, FileText, Users, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact | MiMic Lab',
  description: 'Join the MiMic Lab at Politecnico di Milano. Postdoc, PhD, master thesis, and visiting researcher opportunities.',
};

export default function ContactPage() {
  return (
    <div className="relative z-10 pb-20">
      {/* Header */}
      <section className="bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white py-20">
        <div className="container-polimi">
          <h1 className="font-frank font-bold text-5xl md:text-6xl mb-6">
            Join Our Team
          </h1>
          <p className="text-xl text-polimi-gray max-w-3xl">
            We are always looking for talented and motivated researchers to join our interdisciplinary team at Politecnico di Milano.
          </p>
        </div>
      </section>

      {/* Why Join */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto mb-14">
            {[
              { emoji: '🔬', title: 'Cutting-Edge Research', text: 'State-of-the-art equipment and innovative projects' },
              { emoji: '🌍', title: 'International Network', text: 'Collaborate with leading researchers worldwide' },
              { emoji: '📚', title: 'Professional Growth', text: 'Training, conferences, and career development' },
              { emoji: '🤝', title: 'Collaborative Team', text: 'Supportive, interdisciplinary environment' },
            ].map((item, idx) => (
              <div key={idx} className="text-center">
                <div className="w-14 h-14 bg-polimi-bright-blue/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">{item.emoji}</span>
                </div>
                <h3 className="font-frank font-bold text-sm mb-1">{item.title}</h3>
                <p className="text-gray-500 text-xs leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Opportunities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">
            {/* Postdoctoral Researchers */}
            <Card className="h-full">
              <div className="text-polimi-bright-blue mb-3">
                <Briefcase size={28} />
              </div>
              <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-2">
                Postdoctoral Researchers
              </h3>
              <p className="text-gray-700 text-sm mb-4">
                Postdoctoral positions available for experienced researchers to lead independent projects and mentor junior team members.
              </p>
              <div className="border-t border-gray-200 pt-3 mt-auto">
                <p className="font-semibold text-xs text-polimi-blue-heritage mb-1.5">Requirements:</p>
                <ul className="space-y-0.5">
                  {[
                    'PhD in relevant field',
                    'Track record of publications in peer-reviewed journals',
                    'Expertise in microfluidics, biosensors, or tissue engineering',
                    'Leadership and mentoring skills',
                  ].map((req, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start">
                      <span className="text-polimi-bright-blue mr-1.5">•</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* PhD Positions */}
            <Card className="h-full">
              <div className="text-polimi-bright-blue mb-3">
                <GraduationCap size={28} />
              </div>
              <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-2">
                PhD Students
              </h3>
              <p className="text-gray-700 text-sm mb-4">
                We regularly offer PhD positions within the Bioengineering doctoral program at Politecnico di Milano.
                Research activities cover microfluidics, organ-on-chip systems, mechanobiology, and advanced in vitro modeling.
              </p>
              <div className="border-t border-gray-200 pt-3 mt-auto">
                <p className="font-semibold text-xs text-polimi-blue-heritage mb-1.5">Typical profile:</p>
                <ul className="space-y-0.5">
                  {[
                    "Master's degree in Bioengineering, Mechanical Engineering, or related field",
                    'Strong background in microfabrication or cell biology',
                    'Excellent English communication skills',
                    'Passion for interdisciplinary research',
                  ].map((req, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start">
                      <span className="text-polimi-bright-blue mr-1.5">•</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* Master Thesis */}
            <Card className="h-full">
              <div className="text-polimi-bright-blue mb-3">
                <FileText size={28} />
              </div>
              <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-2">
                Master Thesis Projects
              </h3>
              <p className="text-gray-700 text-sm mb-4">
                We welcome master students to conduct their thesis research in our lab.
                For general inquiries, contact us at{' '}
                <a href="mailto:mimic@polimi.it" className="text-polimi-bright-blue hover:text-polimi-alpha-blue font-medium">
                  mimic@polimi.it
                </a>.
                If you are a Politecnico di Milano student, we invite you to fill out our{' '}
                <a
                  href="https://forms.office.com/e/Pce7BCygER"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-polimi-bright-blue hover:text-polimi-alpha-blue font-medium inline-flex items-center gap-0.5"
                >
                  application form <ExternalLink size={12} className="inline" />
                </a>.
              </p>
              <div className="border-t border-gray-200 pt-3 mt-auto">
                <p className="font-semibold text-xs text-polimi-blue-heritage mb-1.5">Requirements:</p>
                <ul className="space-y-0.5">
                  {[
                    'Enrolled in a relevant master program',
                    'Interest in experimental research',
                    'Commitment for 6–12 months',
                    'Basic laboratory skills',
                  ].map((req, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start">
                      <span className="text-polimi-bright-blue mr-1.5">•</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* Internships & Visiting */}
            <Card className="h-full">
              <div className="text-polimi-bright-blue mb-3">
                <Users size={28} />
              </div>
              <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-2">
                Internships &amp; Visiting Researchers
              </h3>
              <p className="text-gray-700 text-sm mb-4">
                We occasionally host interns and visiting researchers for short-term research stays.
                These opportunities are evaluated on a case-by-case basis depending on lab capacity and alignment with ongoing projects.
              </p>
              <div className="border-t border-gray-200 pt-3 mt-auto">
                <p className="font-semibold text-xs text-polimi-blue-heritage mb-1.5">Typical profile:</p>
                <ul className="space-y-0.5">
                  {[
                    'Undergraduate or graduate student / postdoc',
                    'Minimum 3-month commitment',
                    'Strong motivation and clear research interest',
                    'Previous lab experience (preferred)',
                  ].map((req, i) => (
                    <li key={i} className="text-xs text-gray-600 flex items-start">
                      <span className="text-polimi-bright-blue mr-1.5">•</span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* How to Apply */}
      <section className="py-20 bg-gray-50">
        <div className="container-polimi">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {/* Postdoc, PhD & International */}
            <Card>
              <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-4">
                How to Apply — Postdoc, PhD &amp; International
              </h3>
              <ol className="space-y-3">
                {[
                  { step: '1', title: 'Prepare Your Application', text: 'Include CV, cover letter, transcripts, and relevant publications' },
                  { step: '2', title: 'Submit Application', text: 'Send your application materials to the email below' },
                  { step: '3', title: 'Interview & Selection', text: 'Shortlisted candidates will be invited for an interview' },
                ].map((s) => (
                  <li key={s.step} className="flex items-start">
                    <span className="flex-shrink-0 w-7 h-7 bg-polimi-bright-blue text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">
                      {s.step}
                    </span>
                    <div>
                      <p className="font-semibold text-sm mb-0.5">{s.title}</p>
                      <p className="text-gray-600 text-xs">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-5 pt-4 border-t border-gray-200 text-center">
                <p className="text-gray-600 text-sm mb-2">Send your application to:</p>
                <a
                  href="mailto:mimic@polimi.it"
                  className="text-polimi-bright-blue hover:text-polimi-alpha-blue font-semibold"
                >
                  mimic@polimi.it
                </a>
              </div>
            </Card>

            {/* PoliMi Master Students */}
            <Card>
              <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-4">
                How to Apply — PoliMi Master Students
              </h3>
              <ol className="space-y-3">
                {[
                  { step: '1', title: 'Fill Out the Application Form', text: 'Complete our online form with your details and research interests' },
                  { step: '2', title: 'We Review Your Profile', text: 'We will evaluate your application and match you with available projects' },
                  { step: '3', title: 'Meet the Team', text: 'Selected candidates will be invited for an introductory meeting' },
                ].map((s) => (
                  <li key={s.step} className="flex items-start">
                    <span className="flex-shrink-0 w-7 h-7 bg-polimi-bright-blue text-white rounded-full flex items-center justify-center font-bold text-sm mr-3">
                      {s.step}
                    </span>
                    <div>
                      <p className="font-semibold text-sm mb-0.5">{s.title}</p>
                      <p className="text-gray-600 text-xs">{s.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="mt-5 pt-4 border-t border-gray-200 text-center">
                <a
                  href="https://forms.office.com/e/Pce7BCygER"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-polimi-bright-blue hover:bg-polimi-blue-heritage text-white px-6 py-3 rounded-lg font-manrope font-semibold transition-colors text-sm"
                >
                  Open Application Form
                  <ExternalLink size={16} />
                </a>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Info & Map */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-8 text-center">
            Find Us
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-10">
            <Card>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-polimi-bright-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MapPin className="text-polimi-bright-blue" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-polimi-blue-heritage mb-2">
                    Lab Address
                  </h3>
                  <p className="text-gray-700 text-sm">
                    MiMic Lab<br />
                    Department of Electronics, Information and Bioengineering<br />
                    Politecnico di Milano<br />
                    Building 21<br />
                    Via Camillo Golgi 39<br />
                    20133 Milano, Italy
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-polimi-bright-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Mail className="text-polimi-bright-blue" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-polimi-blue-heritage mb-2">
                    Email
                  </h3>
                  <p className="text-gray-700 text-sm">
                    <a href="mailto:mimic@polimi.it" className="text-polimi-bright-blue hover:text-polimi-alpha-blue font-medium">
                      mimic@polimi.it
                    </a>
                  </p>
                </div>
              </div>
            </Card>
          </div>
          
          <div className="w-full h-96 bg-polimi-gray rounded-xl overflow-hidden max-w-5xl mx-auto">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2798.2476913984845!2d9.229909215794556!3d45.47855597910111!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x4786c6dec456e6c1%3A0x61c9a5a817c3c6b0!2sPolitecnico%20di%20Milano!5e0!3m2!1sen!2sit!4v1234567890"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Politecnico di Milano Location"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
