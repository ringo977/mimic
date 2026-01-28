'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Microscope, Users, BookOpen, Award } from 'lucide-react';
import GridBackground from '@/components/GridBackground';

/**
 * Homepage Component
 * 
 * Esempio completo di homepage con brand identity PoliMi
 * Pronto da usare - basta copiare in app/page.tsx
 */

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <GridBackground opacity={0.06} />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 lg:px-12">
        <div className="max-w-screen-2xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Hero Text */}
            <div className="space-y-6">
              <div className="inline-block">
                <span className="px-4 py-2 bg-polimi-bright-blue/10 text-polimi-bright-blue rounded-full text-sm font-medium">
                  Organ-on-Chip Research Laboratory
                </span>
              </div>
              
              <h1 className="font-serif font-bold text-5xl lg:text-6xl text-polimi-blue-heritage leading-tight">
                Engineering Human Biology on a Chip
              </h1>
              
              <p className="text-lg text-gray-700 leading-relaxed">
                We develop advanced microfluidic platforms that recapitulate human organ 
                physiology and disease at the microscale, enabling more predictive drug 
                screening and personalized medicine approaches.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link 
                  href="/research"
                  className="
                    inline-flex items-center gap-2 px-6 py-3 
                    bg-polimi-bright-blue text-white rounded-lg
                    hover:bg-polimi-alpha-blue transition-colors
                    font-medium shadow-polimi
                  "
                >
                  Explore Our Research
                  <ArrowRight className="w-5 h-5" />
                </Link>
                
                <Link 
                  href="/team"
                  className="
                    inline-flex items-center gap-2 px-6 py-3 
                    border-2 border-polimi-blue-heritage text-polimi-blue-heritage rounded-lg
                    hover:bg-polimi-blue-heritage hover:text-white transition-colors
                    font-medium
                  "
                >
                  Meet the Team
                </Link>
              </div>
            </div>
            
            {/* Hero Image */}
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-polimi-bright-blue/20 to-polimi-alpha-blue/20 overflow-hidden">
                {/* Placeholder - sostituire con immagine reale */}
                <div className="w-full h-full flex items-center justify-center">
                  <Microscope className="w-32 h-32 text-polimi-bright-blue/30" />
                </div>
              </div>
              
              {/* Floating Stats Cards */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-polimi-lg p-6 border border-gray-100">
                <div className="text-3xl font-bold text-polimi-blue-heritage font-serif">15+</div>
                <div className="text-sm text-gray-600">Team Members</div>
              </div>
              
              <div className="absolute -top-6 -right-6 bg-white rounded-xl shadow-polimi-lg p-6 border border-gray-100">
                <div className="text-3xl font-bold text-polimi-bright-blue font-serif">100+</div>
                <div className="text-sm text-gray-600">Publications</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Research Areas */}
      <section className="py-20 px-6 lg:px-12 bg-gray-50/50">
        <div className="max-w-screen-2xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif font-bold text-4xl text-polimi-blue-heritage mb-4">
              Research Focus
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our multidisciplinary team combines expertise in microfluidics, bioengineering, 
              and cell biology to advance organ-on-chip technology
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {researchAreas.map((area, index) => (
              <div 
                key={index}
                className="
                  bg-white rounded-xl p-6 shadow-polimi hover:shadow-polimi-lg
                  transition-all duration-300 hover:-translate-y-1
                  border border-gray-100
                "
              >
                <div className="w-12 h-12 rounded-lg bg-polimi-bright-blue/10 flex items-center justify-center mb-4">
                  <area.icon className="w-6 h-6 text-polimi-bright-blue" />
                </div>
                <h3 className="font-serif font-semibold text-xl text-polimi-blue-heritage mb-2">
                  {area.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {area.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section className="py-20 px-6 lg:px-12">
        <div className="max-w-screen-2xl mx-auto">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-serif font-bold text-4xl text-polimi-blue-heritage mb-2">
                Latest News
              </h2>
              <p className="text-gray-600">Stay updated with our recent activities</p>
            </div>
            <Link 
              href="/news"
              className="text-polimi-bright-blue hover:text-polimi-alpha-blue font-medium flex items-center gap-2"
            >
              View All News
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {latestNews.map((news, index) => (
              <article 
                key={index}
                className="
                  bg-white rounded-xl overflow-hidden shadow-polimi hover:shadow-polimi-lg
                  transition-all duration-300 hover:-translate-y-1
                  border border-gray-100
                "
              >
                <div className="aspect-video bg-gradient-to-br from-polimi-binary-cyan/20 to-polimi-space-blue/20" />
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-3 py-1 bg-polimi-bright-blue/10 text-polimi-bright-blue text-xs font-medium rounded-full">
                      {news.tag}
                    </span>
                    <span className="text-sm text-gray-500">{news.date}</span>
                  </div>
                  <h3 className="font-serif font-semibold text-xl text-polimi-blue-heritage mb-2">
                    {news.title}
                  </h3>
                  <p className="text-gray-600 text-sm">
                    {news.excerpt}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 lg:px-12 bg-polimi-blue-heritage">
        <div className="max-w-screen-2xl mx-auto text-center">
          <h2 className="font-serif font-bold text-4xl text-white mb-4">
            Join Our Team
          </h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">
            We are always looking for talented and motivated researchers to join our lab. 
            Explore current opportunities for PhD, PostDoc, and Master thesis positions.
          </p>
          <Link 
            href="/join"
            className="
              inline-flex items-center gap-2 px-8 py-4 
              bg-polimi-bright-blue text-white rounded-lg
              hover:bg-polimi-alpha-blue transition-colors
              font-medium text-lg shadow-polimi-lg
            "
          >
            View Open Positions
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 px-6 lg:px-12 bg-gray-50/50 border-y border-gray-200">
        <div className="max-w-screen-2xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="text-4xl font-bold text-polimi-bright-blue font-serif mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

// Data
const researchAreas = [
  {
    icon: Microscope,
    title: 'Cardiac Models',
    description: 'Developing heart-on-chip platforms with integrated electromechanical stimulation for drug screening and disease modeling.'
  },
  {
    icon: Users,
    title: 'Multi-Organ Systems',
    description: 'Creating interconnected organ-on-chip platforms to study systemic drug effects and organ-organ interactions.'
  },
  {
    icon: BookOpen,
    title: 'Gut-Microbiome',
    description: 'Modeling host-microbe interactions in intestinal organ-on-chip systems for inflammatory disease research.'
  },
  {
    icon: Award,
    title: 'Biosensor Integration',
    description: 'Developing real-time monitoring systems with integrated electrochemical and optical biosensors.'
  }
];

const latestNews = [
  {
    tag: 'Publication',
    date: 'January 2025',
    title: 'New Paper in Lab on a Chip',
    excerpt: 'Our latest work on cardiac organ-on-chip with electromechanical stimulation published in Lab on a Chip.'
  },
  {
    tag: 'Award',
    date: 'December 2024',
    title: 'Best Paper Award at IEEE EMBC',
    excerpt: 'Our work on biosensor integration received the Best Paper Award at IEEE EMBC 2024 in Sydney.'
  },
  {
    tag: 'Event',
    date: 'November 2024',
    title: 'Hosting International Workshop',
    excerpt: 'Join us for a workshop on advances in organ-on-chip technology with leading experts from Europe and US.'
  }
];

const stats = [
  { value: '15+', label: 'Team Members' },
  { value: '100+', label: 'Publications' },
  { value: '20+', label: 'Active Projects' },
  { value: '30+', label: 'Collaborations' }
];
