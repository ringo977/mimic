import { Metadata } from 'next';
import PublicationsPageClient from './PublicationsPageClient';

// Server wrapper so the route can export metadata (see NewsPage).
export const metadata: Metadata = {
  title: 'Publications | MiMic Lab',
  description: 'Peer-reviewed journal articles and book chapters by the MiMic Lab on microfluidics, organ-on-chip and microphysiological systems, with citation export.',
};

export default function PublicationsPage() {
  return <PublicationsPageClient />;
}
