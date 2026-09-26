import { Metadata } from 'next';
import Link from 'next/link';
import { siteBasePath } from '@/lib/site-base-path';

// /join duplicated /contact (same opportunities, a different application
// e-mail) and nothing linked to it. It is kept only as a redirect so old
// links and search results keep working. Static export: no server-side
// redirects are possible, hence the meta refresh + canonical to /contact/.
export const metadata: Metadata = {
  title: 'Join Us | MiMic Lab',
  robots: { index: false, follow: true },
  alternates: { canonical: '/contact/' },
};

export default function JoinRedirectPage() {
  const target = `${siteBasePath}/contact/`;
  return (
    <>
      <meta httpEquiv="refresh" content={`0;url=${target}`} />
      <div className="relative z-10 container-polimi py-32 text-center">
        <p className="text-gray-700">
          This page has moved.{' '}
          <Link href="/contact" className="text-polimi-bright-blue hover:text-polimi-alpha-blue font-semibold">
            Continue to Contact &amp; Join Us
          </Link>
          .
        </p>
      </div>
    </>
  );
}
