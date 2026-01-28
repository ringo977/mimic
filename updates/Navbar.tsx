'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import Image from 'next/image';

const navigationItems = [
  { name: 'Home', href: '/' },
  { name: 'Team', href: '/team' },
  { name: 'Research', href: '/research' },
  { name: 'Publications', href: '/publications' },
  { name: 'Collaborations', href: '/collaborations' },
  { name: 'News', href: '/news' },
  { name: 'Join Us', href: '/join' },
  { name: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Detect scroll per cambiare l'opacità del background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-polimi-blue-heritage/95 backdrop-blur-md shadow-lg' 
          : 'bg-polimi-blue-heritage'
      }`}
    >
      <div className="max-w-screen-2xl mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo + Lab Name */}
          <Link href="/" className="flex items-center space-x-4 group">
            {/* Logo PoliMi Placeholder - sostituire con il logo reale */}
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
              <span className="text-polimi-blue-heritage font-bold text-sm">POLIMI</span>
            </div>
            
            <div className="hidden md:block">
              <div className="text-white font-serif font-semibold text-lg leading-tight">
                Organ-on-Chip Lab
              </div>
              <div className="text-polimi-bright-blue text-xs font-light">
                DEIB · Politecnico di Milano
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="
                  px-4 py-2 text-sm font-medium text-white
                  hover:text-polimi-bright-blue hover:bg-white/10
                  rounded-md transition-colors duration-200
                "
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            className="lg:hidden p-2 text-white hover:bg-white/10 rounded-md transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-white/10">
          <div className="px-6 py-4 space-y-1 bg-polimi-blue-heritage">
            {navigationItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="
                  block px-4 py-3 text-base font-medium text-white
                  hover:text-polimi-bright-blue hover:bg-white/10
                  rounded-md transition-colors duration-200
                "
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
