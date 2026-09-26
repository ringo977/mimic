import { Metadata } from 'next';
import GrantsPageClient from './GrantsPageClient';

// Server wrapper so the route can export metadata (see NewsPage).
export const metadata: Metadata = {
  title: 'Grants & Projects | MiMic Lab',
  description: 'Current and past funded research projects of the MiMic Lab: European, national and industrial grants in organ-on-chip technology and microfluidics.',
};

export default function GrantsPage() {
  return <GrantsPageClient />;
}
