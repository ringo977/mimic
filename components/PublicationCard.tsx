'use client';

import { motion } from 'framer-motion';
import { ExternalLink, FileText } from 'lucide-react';
import Card from './ui/Card';
import CiteButton from './CiteButton';
import { Publication } from '@/lib/citations';

interface PublicationCardProps {
  publication: Publication;
}

const typeBadgeColors: Record<string, string> = {
  'Journal Article': 'bg-blue-100 text-blue-800',
  'Conference': 'bg-green-100 text-green-800',
  'Book Chapter': 'bg-purple-100 text-purple-800',
};

export default function PublicationCard({ publication }: PublicationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <div className="flex items-start justify-between mb-3">
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${typeBadgeColors[publication.type] || 'bg-gray-100 text-gray-800'}`}>
            {publication.type}
          </span>
          <span className="text-polimi-blue-heritage font-frank font-bold text-lg">
            {publication.year}
          </span>
        </div>

        <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-3 leading-tight">
          {publication.title}
        </h3>

        <p className="text-gray-600 text-sm mb-2">
          {publication.authors.join(', ')}
        </p>

        <p className="text-gray-700 font-medium text-sm mb-4 italic">
          {publication.journal}
          {publication.volume && `, ${publication.volume}`}
          {publication.pages && `, ${publication.pages}`}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            {publication.doi && (
              <a
                href={`https://doi.org/${publication.doi}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-polimi-bright-blue hover:text-polimi-alpha-blue text-sm font-medium transition-colors"
              >
                <ExternalLink size={16} className="mr-1" />
                DOI
              </a>
            )}
            {publication.pdf && (
              <a
                href={publication.pdf}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-polimi-bright-blue hover:text-polimi-alpha-blue text-sm font-medium transition-colors"
              >
                <FileText size={16} className="mr-1" />
                PDF
              </a>
            )}
          </div>
          <CiteButton publication={publication} />
        </div>
      </Card>
    </motion.div>
  );
}
