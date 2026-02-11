'use client';

import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with localStorage
const LabApp = dynamic(() => import('@/components/lab/LabApp'), { ssr: false });

export default function LabPage() {
  return <LabApp />;
}
