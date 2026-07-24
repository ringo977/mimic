import { MetadataRoute } from 'next';

const BASE_URL = 'https://mimic.polimi.it';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/lab/',
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
