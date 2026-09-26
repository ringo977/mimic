import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Cookie Policy | MiMic Lab',
  description: 'Cookie policy for the MiMic Lab website at Politecnico di Milano.',
};

export default function CookiePolicyPage() {
  return (
    <>
      <section className="bg-polimi-blue-heritage text-white py-16">
        <div className="container-polimi">
          <h1 className="font-frank font-bold text-4xl md:text-5xl mb-4">Cookie Policy</h1>
          <p className="text-white/80 text-lg font-manrope">
            Information on the use of cookies
          </p>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container-polimi max-w-4xl">
          <div className="prose prose-lg max-w-none font-manrope text-gray-700 space-y-8">

            <p className="text-sm text-gray-500">
              Last updated: September 2026
            </p>

            <div>
              <h2 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-4">
                What are cookies
              </h2>
              <p>
                Cookies are small text files that websites send to the user&apos;s device (computer, tablet, smartphone), where they are stored and then retransmitted to the same websites on subsequent visits. Cookies are used for various purposes, have different characteristics, and can be set by both the website being visited and by third parties.
              </p>
            </div>

            <div>
              <h2 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-4">
                Cookies used on this site
              </h2>
              <p>
                This MiMic Lab website is a static site hosted on Politecnico di Milano servers
                (<strong>www.mimic.polimi.it</strong>). The site itself does not set traditional
                cookies; it uses browser storage (localStorage and sessionStorage — treated like
                cookies under the ePrivacy rules) as described below.
              </p>

              <h3 className="font-frank font-semibold text-xl text-polimi-blue-heritage mb-3 mt-6">
                Strictly necessary storage
              </h3>
              <p>
                A single localStorage entry (<code>mimic-cookie-consent</code>) remembers your
                consent choices so we do not ask again on every visit. It contains no personal
                data and cannot be disabled, as it is required to honour your preferences.
              </p>

              <h3 className="font-frank font-semibold text-xl text-polimi-blue-heritage mb-3 mt-6">
                Analytics (first-party, opt-in)
              </h3>
              <p>
                Only if you enable &ldquo;Functional and Analytics&rdquo; in the cookie banner, the site
                counts page views using a <strong>first-party</strong> system: for each visited page it
                records the page path, the referring site (only on the first page of a visit), the
                device class (desktop / mobile / tablet), a random session identifier stored in
                sessionStorage (deleted when the tab is closed), and the timestamp.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>No IP address, no user agent, no cross-site identifier</strong> is stored.</li>
                <li>Data cannot be linked to your identity and is used only in aggregate form.</li>
                <li>Data is stored on <strong>Supabase</strong> (EU-hosted database acting as our service provider) and retained for a maximum of <strong>13 months</strong>, after which it is automatically deleted.</li>
                <li>No data is shared with advertising or profiling networks.</li>
              </ul>

              <h3 className="font-frank font-semibold text-xl text-polimi-blue-heritage mb-3 mt-6">
                Third-party services
              </h3>
              <p>
                Some pages integrate external services, which may process your IP address and set
                their own cookies <em>only when actually loaded</em>:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Google Maps</strong> (Contact page) — loaded <strong>only after you click
                  &ldquo;Load map&rdquo;</strong>; nothing is requested from Google before that.{' '}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-polimi-bright-blue hover:underline">Google Privacy Policy</a>
                </li>
                <li>
                  <strong>OpenStreetMap</strong> (Network page) — map tiles for the
                  collaborations map are fetched from the OpenStreetMap Foundation servers.{' '}
                  <a href="https://wiki.osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noopener noreferrer" className="text-polimi-bright-blue hover:underline">OSMF Privacy Policy</a>
                </li>
                <li>
                  <strong>Microsoft Forms</strong> — the application form for master students is an
                  external link to Microsoft&apos;s service.{' '}
                  <a href="https://privacy.microsoft.com/privacystatement" target="_blank" rel="noopener noreferrer" className="text-polimi-bright-blue hover:underline">Microsoft Privacy Statement</a>
                </li>
              </ul>

              <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-5">
                <p className="text-green-800 font-semibold mb-2">Note</p>
                <p className="text-green-700 text-sm">
                  This site <strong>does not use profiling cookies</strong> and <strong>does not collect
                  data for advertising purposes</strong>. The only analytics is the anonymous,
                  first-party page counter described above, active only with your consent.
                </p>
              </div>

              <p className="mt-4 text-sm">
                You can change your choice at any time via the <strong>&ldquo;Cookie settings&rdquo;</strong>{' '}
                link in the footer of every page.
              </p>
            </div>

            <div id="manage-cookies">
              <h2 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-4">
                How to manage cookies
              </h2>
              <p>
                You can manage your cookie preferences directly through your browser settings, including blocking the installation of cookies from third parties. You can also delete cookies that have been installed previously through your browser preferences.
              </p>
              <p>
                Please note that disabling strictly necessary cookies may impair the proper functioning of the website.
              </p>

              <h3 className="font-frank font-semibold text-xl text-polimi-blue-heritage mb-3 mt-6">
                Instructions for major browsers
              </h3>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <a
                    href="https://support.google.com/chrome/answer/95647"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-polimi-bright-blue hover:underline"
                  >
                    Google Chrome
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.mozilla.org/kb/cookies-information-websites-store-on-your-computer"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-polimi-bright-blue hover:underline"
                  >
                    Mozilla Firefox
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-polimi-bright-blue hover:underline"
                  >
                    Apple Safari
                  </a>
                </li>
                <li>
                  <a
                    href="https://support.microsoft.com/help/4027947/microsoft-edge-delete-cookies"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-polimi-bright-blue hover:underline"
                  >
                    Microsoft Edge
                  </a>
                </li>
              </ul>
            </div>

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

            <div className="pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                For more information, refer to our{' '}
                <Link href="/privacy" className="text-polimi-bright-blue hover:underline">
                  Privacy Policy
                </Link>
                {' '}or the{' '}
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
