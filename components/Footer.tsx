import Link from 'next/link';
import FooterLinks from './FooterLinks';
import { siteBasePath } from '@/lib/site-base-path';

const quickLinks = [
  { href: '/', label: 'Home' },
  { href: '/team', label: 'Team' },
  { href: '/research', label: 'Research' },
  { href: '/technology-facilities', label: 'Technology' },
  { href: '/publications', label: 'Publications' },
  { href: '/grants', label: 'Grants' },
  { href: '/news', label: 'News' },
  { href: '/network', label: 'Network' },
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
        {/* Grid 4 colonne - Layout secondo brand identity */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12 mb-12">
          
          {/* Colonna 1: Logo */}
          <div className="lg:col-span-5">
            <div className="mb-6">
              <img
                src={`${siteBasePath}/images/logos/LogoMiMicLab_trasp_footer_vertical.png`}
                alt="MiMic Laboratory - Politecnico di Milano"
                className="max-w-full h-auto"
                style={{ maxHeight: '240px' }}
              />
            </div>
            <p className="text-sm text-white/80 leading-relaxed font-manrope">
              Developing advanced microfluidic platforms and microphysiological systems 
              for drug screening and disease modeling at DEIB, Politecnico di Milano.
            </p>
          </div>
          
          {/* Colonna 2: Quick Links (hidden on mobile) */}
          <div className="hidden md:block lg:col-span-3">
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
          
          {/* Colonna 3: Contact */}
          <div className="lg:col-span-4">
            <h4 className="font-semibold text-sm text-polimi-bright-blue mb-4 font-manrope">
              Contact
            </h4>
            <address className="not-italic text-sm text-white/90 space-y-2 font-manrope">
              <p>MiMic Lab</p>
              <p>Department of Electronics, Information and Bioengineering</p>
              <p>Politecnico di Milano</p>
              <p>Building 21</p>
              <p>Via Camillo Golgi 39</p>
              <p>20133 Milano, Italy</p>
              <p>
                <a 
                  href="mailto:mimic@polimi.it"
                  className="hover:text-polimi-bright-blue transition-colors"
                >
                  mimic@polimi.it
                </a>
              </p>
            </address>
            <div className="mt-4">
              <a
                href="https://www.linkedin.com/company/mimiclab"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-white/90 hover:text-polimi-bright-blue transition-colors font-manrope"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                Follow us on LinkedIn
              </a>
            </div>
          </div>
        </div>
        
        {/* Copyright Bar */}
        <div className="border-t border-white/10 pt-6">
          <div className="flex flex-col space-y-3">
            <div className="text-xs text-white/70 font-manrope">
              <p>
                © {currentYear} Politecnico di Milano, Piazza Leonardo da Vinci 32, 20133 Milano | P.IVA 04376620151 - C.F. 80057930150
              </p>
            </div>
            <FooterLinks />
          </div>
        </div>
      </div>
    </footer>
  );
}
