import { Metadata } from 'next';
import NewsPageClient from './NewsPageClient';

// Server wrapper: the interactive list lives in NewsPageClient so this
// route can export its own metadata (a 'use client' page cannot).
export const metadata: Metadata = {
  title: 'News & Events | MiMic Lab',
  description: 'Latest news, publications, awards, conferences and outreach activities of the MiMic Lab, Politecnico di Milano.',
};

export default function NewsPage() {
  return <NewsPageClient />;
}
