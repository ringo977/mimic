import Link from 'next/link';

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
            {/* Logo Placeholder - sostituire con logo PoliMi white version */}
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-4">
              <span className="text-polimi-blue-heritage font-bold text-xs font-manrope">
                POLIMI
              </span>
            </div>
            <h3 className="font-semibold text-base mb-2 font-manrope">
              MiMic Laboratory
            </h3>
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
        
        {/* Copyright Bar */}
        <div className="border-t border-white/10 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-white/70 space-y-2 md:space-y-0 font-manrope">
            <p>© {currentYear} Politecnico di Milano</p>
            <div className="flex space-x-4">
              <Link 
                href="/privacy" 
                className="hover:text-white transition-colors"
              >
                Privacy Policy
              </Link>
              <span>|</span>
              <Link 
                href="/cookies" 
                className="hover:text-white transition-colors"
              >
                Cookie Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
