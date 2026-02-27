import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy | MiMic Lab',
  description: 'Privacy policy for the MiMic Lab website at Politecnico di Milano.',
};

export default function PrivacyPage() {
  return (
    <>
      <section className="bg-polimi-blue-heritage text-white py-16">
        <div className="container-polimi">
          <h1 className="font-frank font-bold text-4xl md:text-5xl mb-4">Privacy Policy</h1>
          <p className="text-white/80 text-lg font-manrope">
            Information on the processing of personal data
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container-polimi max-w-4xl">
          <div className="prose prose-lg max-w-none font-manrope text-gray-700 space-y-8">

            <p className="text-sm text-gray-500">
              Last updated: January 2026
            </p>

            <div>
              <h2 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-4">
                Data Controller
              </h2>
              <p>
                Data Controller: <strong>Politecnico di Milano</strong> — General Director on behalf of the Rector pro-tempore.
              </p>
              <p>
                Contact:{' '}
                <a href="mailto:dirgen@polimi.it" className="text-polimi-bright-blue hover:underline">
                  dirgen@polimi.it
                </a>
              </p>
              <p>
                Data Protection Officer (DPO):{' '}
                <a href="mailto:privacy@polimi.it" className="text-polimi-bright-blue hover:underline">
                  privacy@polimi.it
                </a>
              </p>
            </div>

            <div>
              <h2 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-4">
                Introduction
              </h2>
              <p>
                Pursuant to Regulation (EU) 2016/679 (hereinafter &ldquo;Regulation&rdquo; or &ldquo;GDPR&rdquo;), this page describes how the personal data of users who visit the MiMic Lab website — Microfluidic and Biomimetic Microsystems Laboratory at Politecnico di Milano — are processed.
              </p>
              <p>
                This information does not apply to other websites, pages, or online services accessible through hyperlinks published on this site but referring to resources external to the MiMic Lab domain.
              </p>
            </div>

            <div>
              <h2 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-4">
                Place of data processing
              </h2>
              <p>
                The processing operations connected to the web services of this site take place at the University premises and are carried out by authorised personnel. Personal data provided by users are used solely for the purpose of executing the requested service and are disclosed to third parties only where necessary or required by law.
              </p>
            </div>

            <div>
              <h2 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-4">
                Purpose of processing
              </h2>
              <p>
                The personal data referred to in this policy are processed by Politecnico di Milano in carrying out its tasks of public interest pursuant to Art. 6(1)(e) of the GDPR, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Promoting access to the highest levels of study and their completion;</li>
                <li>Pursuing the highest quality of education and personal development;</li>
                <li>Fostering technological progress and the dissemination of knowledge;</li>
                <li>Encouraging relationships with public and private institutions, enterprises, and other productive forces.</li>
              </ul>
            </div>

            <div>
              <h2 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-4">
                Types of data processed
              </h2>

              <h3 className="font-frank font-semibold text-xl text-polimi-blue-heritage mb-3">
                Browsing data
              </h3>
              <p>
                The computer systems and software procedures used to operate this website acquire, during their normal operation, certain personal data whose transmission is implicit in the use of Internet communication protocols. This information is not collected to be associated with identified data subjects, but by its very nature could, through processing and association with data held by third parties, allow users to be identified.
              </p>
              <p>
                This category includes IP addresses, domain names of the computers used by users, URI addresses of resources requested, the time of the request, the method used to submit the request to the server, and other parameters relating to the user&apos;s operating system and computing environment.
              </p>
              <p>
                These data are used solely for the purpose of obtaining anonymous statistical information on the use of the site and to check its proper functioning.
              </p>

              <h3 className="font-frank font-semibold text-xl text-polimi-blue-heritage mb-3 mt-6">
                Data voluntarily provided by the user
              </h3>
              <p>
                The optional, explicit, and voluntary sending of emails to the addresses indicated on this site entails the subsequent acquisition of the sender&apos;s address, necessary to respond to requests, as well as any other personal data included in the communication.
              </p>
            </div>

            <div>
              <h2 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-4">
                Processing methods
              </h2>
              <p>
                Personal data are processed using automated tools for the time strictly necessary to achieve the purposes for which they were collected. Specific security measures are adopted to prevent data loss, unlawful or improper use, and unauthorized access, in compliance with Art. 32 of the GDPR.
              </p>
            </div>

            <div>
              <h2 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-4">
                Data retention period
              </h2>
              <p>
                The collected data will be retained for the periods established by current legislation or by University regulations.
              </p>
            </div>

            <div>
              <h2 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-4">
                Rights of data subjects
              </h2>
              <p>
                Data subjects have the right to:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  Request from the Data Controller, pursuant to Articles 16, 17, 18, 19, and 21 of the GDPR, access to their personal data and the rectification, erasure, or restriction of processing, or to object to their processing.
                </li>
                <li>
                  Lodge a complaint with a supervisory authority.
                </li>
              </ul>
              <p className="mt-4">
                To exercise your rights, please contact the Data Protection Officer at{' '}
                <a href="mailto:privacy@polimi.it" className="text-polimi-bright-blue hover:underline">
                  privacy@polimi.it
                </a>.
              </p>
            </div>

            <div>
              <h2 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-4">
                Links to other websites
              </h2>
              <p>
                Some pages of this site may contain links to other websites that are not managed by Politecnico di Milano. The University does not share personal data with such sites and is not responsible for their content, security, or privacy measures.
              </p>
            </div>

            <div>
              <h2 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-4">
                Cookies
              </h2>
              <p>
                For detailed information on how this site uses cookies, please refer to our{' '}
                <Link href="/cookie-policy" className="text-polimi-bright-blue hover:underline">
                  Cookie Policy
                </Link>.
              </p>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                For more information on Politecnico di Milano&apos;s privacy policies, please visit the{' '}
                <a
                  href="https://www.polimi.it/il-politecnico/comunicazione/privacy/sito-web-di-ateneo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-polimi-bright-blue hover:underline"
                >
                  University Privacy Page
                </a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
