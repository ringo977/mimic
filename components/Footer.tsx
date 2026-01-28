import Link from 'next/link';
import Image from 'next/image';

const quickLinks = [
  { href: '/', label: 'Home' },
  { href: '/research', label: 'Research' },
  { href: '/team', label: 'Team' },
  { href: '/publications', label: 'Publications' },
  { href: '/contact', label: 'Contact' },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer 
      className="bg-polimi-blue-heritage text-white relative z-10" 
      role="contentinfo"
      aria-label="Site footer"
    >
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-78 pt-16 pb-8">
        {/* Grid 3 colonne */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-12">
          
          {/* Colonna 1: Lab Info */}
          <div>
            {/* Logo MiMic + PoliMi */}
            <div className="mb-4">
              <Image
                src="/images/logos/Logo_POLIMI_Bandiera_blu_trasp.png"
                alt="MiMic Laboratory - Politecnico di Milano"
                width={200}
                height={50}
                className="h-12 w-auto brightness-0 invert"
              />
            </div>
            <p className="text-sm text-white/80 leading-relaxed font-manrope">
              Developing advanced microfluidic platforms and microphysiological systems 
              for drug screening and disease modeling at DEIB, Politecnico di Milano.
            </p>
          </div>
          
          {/* Colonna 2: Quick Links */}
          <div>
            <h4 className="font-semibold text-sm text-polimi-bright-blue mb-4 font-manrope">
              Quick Links
            </h4>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link 
                    href={link.href}
                    className="text-sm text-white/90 hover:text-polimi-bright-blue transition-colors font-manrope"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Colonna 3: Contatti */}
          <div>
            <h4 className="font-semibold text-sm text-polimi-bright-blue mb-4 font-manrope">
              Contatti
            </h4>
            <address className="not-italic text-sm text-white/90 space-y-2 font-manrope">
              <p>Via Golgi 39</p>
              <p>20133 Milano, Italia</p>
              <p>
                <a 
                  href="mailto:lab@deib.polimi.it"
                  className="hover:text-polimi-bright-blue transition-colors"
                >
                  lab@deib.polimi.it
                </a>
              </p>
            </address>
          </div>
        </div>
        
        {/* Copyright Bar - Stringa funzionale */}
        <div className="border-t border-white/10 pt-6">
          <div className="flex flex-col space-y-3">
            {/* Dati fiscali */}
            <div className="text-xs text-white/70 font-manrope">
              <p>
                © {currentYear} Politecnico di Milano · Via Ampère, 2 - 20133 Milano · 
                Tel. +39 02 2399 2111 · C.F. 80057930150 · P.IVA 04376620151
              </p>
            </div>
            
            {/* Link funzionali */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-white/70 font-manrope">
              <Link 
                href="/accessibilita" 
                className="hover:text-white transition-colors"
              >
                Accessibilità
              </Link>
              <span className="text-white/30">|</span>
              <Link 
                href="/privacy" 
                className="hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <span className="text-white/30">|</span>
              <Link 
                href="/cookies" 
                className="hover:text-white transition-colors"
              >
                Cookie Policy
              </Link>
              <span className="text-white/30">|</span>
              <Link 
                href="https://www.polimi.it/amministrazione-trasparente" 
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors"
              >
                Amministrazione Trasparente
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
