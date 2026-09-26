'use client';

import { useState } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

/**
 * Consent-gated Google Maps embed. The iframe used to load on page open,
 * setting Google cookies without consent — now nothing is requested from
 * Google until the visitor explicitly clicks "Load map".
 */
export default function ClickToLoadMap({ src, title }: { src: string; title: string }) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <iframe
        src={src}
        width="100%"
        height="100%"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={title}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gray-100 text-center px-6">
      <div className="w-14 h-14 bg-polimi-bright-blue/10 rounded-full flex items-center justify-center">
        <MapPin className="text-polimi-bright-blue" size={28} />
      </div>
      <p className="text-sm text-gray-600 font-manrope max-w-md">
        The interactive map is provided by <strong>Google Maps</strong>. Loading it will
        connect to Google servers, which may set cookies and process your IP address
        according to{' '}
        <a
          href="https://policies.google.com/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-polimi-bright-blue hover:underline"
        >
          Google&apos;s privacy policy
        </a>.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => setLoaded(true)}
          className="px-5 py-2.5 bg-polimi-blue-heritage text-white rounded-lg text-sm font-semibold font-manrope hover:bg-[#0d2340] transition-colors"
        >
          Load map
        </button>
        <a
          href="https://maps.google.com/?q=Politecnico+di+Milano,+Via+Camillo+Golgi+39,+20133+Milano"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 border border-gray-300 text-polimi-blue-heritage rounded-lg text-sm font-semibold font-manrope hover:bg-gray-50 transition-colors"
        >
          Open in Google Maps <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
}
