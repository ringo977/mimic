'use client';

import Link from 'next/link';

export default function FooterLinks() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-white/70 font-manrope">
      <a
        href="https://trasparenza.polimi.it/pagina771_accessibilit-e-catalogo-dei-dati-metadati-e-banche-dati.html"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-white transition-colors"
      >
        Accessibility
      </a>
      <span className="text-white/30">|</span>
      <Link href="/privacy" className="hover:text-white transition-colors">
        Privacy Policy
      </Link>
      <span className="text-white/30">|</span>
      <Link href="/cookie-policy" className="hover:text-white transition-colors">
        Cookie Policy
      </Link>
      <span className="text-white/30">|</span>
      <button
        onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}
        className="hover:text-white transition-colors cursor-pointer"
      >
        Privacy Settings
      </button>
    </div>
  );
}
