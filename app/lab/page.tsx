'use client';

import dynamic from 'next/dynamic';

const LabApp = dynamic(() => import('@/components/lab/LabApp'), { ssr: false });

export default function LabPage() {
  return (
    <>
      <LabApp />
    </>
  );
}
