import { MetadataRoute } from 'next';

const BASE_URL = 'https://www.mimic.polimi.it';

export const dynamic = 'force-static';

// /lab is kept out of search results with <meta name="robots" noindex>
// (app/lab/layout.tsx) rather than a Disallow rule: a Disallow would stop
// crawlers from ever reading that noindex, and the URL — linked from the
// navbar on every page — could still be indexed without content.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
