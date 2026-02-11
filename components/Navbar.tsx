'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X, FlaskConical } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/team', label: 'Team' },
  { href: '/research', label: 'Research' },
  { href: '/grants', label: 'Grants' },
  { href: '/collaborations', label: 'Collaborations' },
  { href: '/publications', label: 'Publications' },
  { href: '/news', label: 'News' },
  { href: '/join', label: 'Join Us' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Top Bar - Logo Poli (only mobile) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center h-12 px-4">
          <img
            src="/mimic/images/logos/Logotipo_POLIMI_Blu.png"
            alt="Politecnico di Milano"
            className="w-auto h-auto"
            style={{ maxWidth: '50%', maxHeight: '32px' }}
          />
        </div>
      </div>

      {/* Main Header - Frosting Effect */}
      <header 
        className="fixed top-0 lg:top-0 top-12 left-0 right-0 z-40 bg-white/90 backdrop-blur-md shadow-sm"
        role="banner"
        style={{
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
      >
        <nav 
          className="max-w-screen-2xl mx-auto px-6 lg:px-78"
          aria-label="Main navigation"
        >
          <div className="flex items-center justify-between h-20">
            {/* Logo (Desktop: combo PoliMi+MiMic, Mobile: MiMic solo) */}
            <div className="flex items-center">
              {/* Desktop: Logo combo PoliMi + MiMic */}
              <Link 
                href="/" 
                className="hidden lg:flex items-center hover:opacity-80 transition-opacity"
                aria-label="Homepage MiMic Laboratory"
              >
                <img
                  src="/mimic/images/logos/Logo_POLIMI_Bandiera_blu_trasp.png"
                  alt="MiMic Laboratory - Politecnico di Milano"
                  className="h-14 w-auto"
                />
              </Link>

              {/* Mobile: Logo MiMic solo */}
              <Link 
                href="/" 
                className="lg:hidden flex items-center hover:opacity-80 transition-opacity"
                aria-label="Homepage MiMic Laboratory"
              >
                <img
                  src="/mimic/images/logos/LogoMiMicLab_solo_blu_trasp.png"
                  alt="MiMic Lab"
                  className="h-10 w-auto"
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-polimi-blue-heritage hover:text-polimi-bright-blue hover:bg-polimi-bright-blue/10 px-4 py-2 rounded-md transition-all duration-200 font-manrope font-medium text-sm"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/lab"
                className="flex items-center gap-1.5 ml-2 px-4 py-2 bg-polimi-blue-heritage text-white rounded-lg hover:bg-polimi-blue-heritage/90 transition-all duration-200 font-manrope font-medium text-sm"
              >
                <FlaskConical size={15} />
                Lab Login
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden text-polimi-blue-heritage hover:text-polimi-bright-blue transition-colors p-2"
              aria-label="Toggle menu"
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {isOpen && (
            <div className="lg:hidden pb-6 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col space-y-2">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-polimi-blue-heritage hover:text-polimi-bright-blue hover:bg-polimi-bright-blue/10 px-4 py-3 rounded-md transition-all duration-200 font-manrope font-medium"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/lab"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 mx-4 mt-2 px-4 py-3 bg-polimi-blue-heritage text-white rounded-lg font-manrope font-medium text-center justify-center"
                >
                  <FlaskConical size={16} />
                  Lab Login
                </Link>
              </div>
            </div>
          )}
        </nav>
      </header>
    </>
  );
}
