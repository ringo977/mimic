'use client';

import { FlaskConical } from 'lucide-react';

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto flex items-start sm:items-center justify-center py-6 sm:py-0" style={{ background: 'linear-gradient(135deg, #102C53 0%, #1a3d6e 50%, #0d2240 100%)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-40 h-40 rounded-full bg-white/5 blur-xl" />
        <div className="absolute bottom-20 right-20 w-60 h-60 rounded-full bg-[#4DC9FF]/10 blur-2xl" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 rounded-full bg-white/5 blur-lg" />
      </div>
      <div className="relative w-full max-w-md mx-4 my-auto">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-3 sm:mb-4">
            <FlaskConical className="w-8 h-8 text-[#4DC9FF]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-manrope">MiMic Lab Manager</h1>
          <p className="text-white/60 mt-2 font-manrope">Organ-on-Chip Laboratory</p>
        </div>
        {children}
        <p className="text-center text-white/30 text-xs mt-6 font-manrope">
          MiMic Lab &middot; DEIB &middot; Politecnico di Milano
        </p>
      </div>
    </div>
  );
}
