import { MetadataRoute } from 'next';
import researchData from '@/data/research.json';

// Canonical production URL (Polimi FTPS channel).
const BASE_URL = 'https://mimic.polimi.it';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '', priority: 1, changeFrequency: 'weekly' },
    { path: 'news', priority: 0.9, changeFrequency: 'weekly' },
    { path: 'publications', priority: 0.9, changeFrequency: 'monthly' },
    { path: 'research', priority: 0.9, changeFrequency: 'monthly' },
    { path: 'team', priority: 0.8, changeFrequency: 'monthly' },
    { path: 'grants', priority: 0.7, changeFrequency: 'monthly' },
    { path: 'network', priority: 0.7, changeFrequency: 'monthly' },
    { path: 'technology-facilities', priority: 0.7, changeFrequency: 'monthly' },
    { path: 'join', priority: 0.6, changeFrequency: 'monthly' },
    { path: 'contact', priority: 0.5, changeFrequency: 'yearly' },
    { path: 'privacy', priority: 0.2, changeFrequency: 'yearly' },
    { path: 'cookie-policy', priority: 0.2, changeFrequency: 'yearly' },
  ];

  const researchRoutes = researchData.projects.map((project) => ({
    url: `${BASE_URL}/research/${project.slug}/`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  return [
    ...staticRoutes.map(({ path, priority, changeFrequency }) => ({
      url: path ? `${BASE_URL}/${path}/` : `${BASE_URL}/`,
      lastModified: now,
      changeFrequency,
      priority,
    })),
    ...researchRoutes,
  ];
}
