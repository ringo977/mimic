'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/team', label: 'Team' },
  { href: '/research', label: 'Research' },
  { href: '/publications', label: 'Publications' },
  { href: '/collaborations', label: 'Collaborations' },
  { href: '/news', label: 'News' },
  { href: '/join', label: 'Join Us' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-polimi-blue-heritage/95 backdrop-blur-md shadow-lg' : 'bg-polimi-blue-heritage'
      }`}
      role="banner"
    >
      <nav 
        className="max-w-screen-2xl mx-auto px-6 lg:px-78"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-between h-20">
          {/* Logo and Lab Name - Area di rispetto 2x cap-height */}
          <Link 
            href="/" 
            className="flex items-center space-x-4 hover:opacity-90 transition-opacity"
            aria-label="Homepage MiMic Laboratory"
          >
            <div className="flex items-center">
              {/* Logo Placeholder - sostituire con logo PoliMi ufficiale */}
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-polimi-blue-heritage font-bold text-sm font-manrope">
                  POLIMI
                </span>
              </div>
              <div className="ml-4">
                <div className="text-white font-semibold text-lg leading-tight font-manrope">
                  MiMic Laboratory
                </div>
                <div className="text-polimi-bright-blue text-xs font-light font-manrope">
                  DEIB · Politecnico di Milano
                </div>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-white hover:text-polimi-bright-blue hover:bg-white/10 px-4 py-2 rounded-md transition-all duration-200 font-manrope font-medium text-sm"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden text-white hover:text-polimi-bright-blue transition-colors p-2"
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
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
                  className="text-white hover:text-polimi-bright-blue hover:bg-white/10 px-4 py-3 rounded-md transition-all duration-200 font-manrope font-medium"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
