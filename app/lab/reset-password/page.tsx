'use client';

import dynamic from 'next/dynamic';

const LabPasswordResetPage = dynamic(() => import('@/components/lab/LabPasswordResetPage'), { ssr: false });

export default function LabResetPasswordPage() {
  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <LabPasswordResetPage />
    </>
  );
}
