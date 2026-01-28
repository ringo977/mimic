'use client';

import { motion } from 'framer-motion';
import { Mail, X, FileText } from 'lucide-react';
import { useState, useMemo } from 'react';
import publicationsData from '@/data/publications.json';

interface PI {
  name: string;
  role: string;
  email: string;
  bio: string;
  bioFull?: string;
  image: string;
}

interface PICardProps {
  pi: PI;
}

interface Publication {
  id: number;
  authors: string[];
  title: string;
  journal: string;
  year: number;
  volume?: string;
  pages?: string;
  doi?: string;
  type: string;
}

export default function PICard({ pi }: PICardProps) {
  const [showModal, setShowModal] = useState(false);

  // Extract last name from full name
  const getLastName = (fullName: string): string => {
    const parts = fullName.split(' ');
    return parts[parts.length - 1].replace(/[.,]/g, '');
  };

  // Filter publications by author last name (exclude book chapters)
  const piPublications = useMemo(() => {
    const lastName = getLastName(pi.name);
    return (publicationsData.publications as Publication[]).filter(pub => 
      pub.type !== "Book Chapter" && pub.authors.some(author => author.includes(lastName))
    );
  }, [pi.name]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-xl shadow-xl p-8"
      >
        <div className="flex flex-col items-center text-center gap-6">
          <div className="w-40 h-40 rounded-full overflow-hidden bg-polimi-gray flex-shrink-0">
            <div 
              className="w-full h-full bg-cover bg-center"
              style={{ 
                backgroundImage: `url(${pi.image})`,
                backgroundColor: '#E0DCDC' 
              }}
            />
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-2">
                {pi.name}
              </h3>
              <p className="text-polimi-bright-blue font-semibold text-base mb-3">
                {pi.role}
              </p>
            </div>
            
            <p className="text-gray-700 leading-relaxed text-sm line-clamp-3">
              {pi.bio}
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => setShowModal(true)}
                className="text-polimi-bright-blue hover:text-polimi-alpha-blue text-sm font-medium hover:underline"
              >
                Read more
              </button>
              
              <div className="pt-2">
                <a 
                  href={`mailto:${pi.email}`}
                  className="inline-flex items-center text-polimi-bright-blue hover:text-polimi-alpha-blue font-medium text-sm"
                >
                  <Mail size={16} className="mr-2" />
                  {pi.email}
                </a>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal for full bio and publications */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-4xl w-full max-h-[85vh] overflow-y-auto p-8 relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Close"
            >
              <X size={24} className="text-gray-600" />
            </button>

            {/* Header */}
            <div className="flex items-start space-x-6 mb-6 pr-12">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-polimi-gray flex-shrink-0">
                <div 
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${pi.image})` }}
                />
              </div>
              <div>
                <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-2">
                  {pi.name}
                </h2>
                <p className="text-polimi-bright-blue font-semibold text-lg mb-2">
                  {pi.role}
                </p>
                <a 
                  href={`mailto:${pi.email}`} 
                  className="inline-flex items-center text-polimi-bright-blue hover:text-polimi-alpha-blue text-sm"
                >
                  <Mail size={16} className="mr-2" />
                  {pi.email}
                </a>
              </div>
            </div>
            
            {/* Bio */}
            {pi.bioFull && (
              <div className="mb-8">
                <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-4">
                  About
                </h3>
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {pi.bioFull}
                  </p>
                </div>
              </div>
            )}

            {/* Publications Section */}
            {piPublications.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText size={24} className="text-polimi-bright-blue" />
                  <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage">
                    Publications
                  </h3>
                  <span className="bg-polimi-bright-blue text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {piPublications.length}
                  </span>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {piPublications.map((pub) => (
                    <div 
                      key={pub.id} 
                      className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
                    >
                      <p className="text-sm text-gray-600 mb-1">
                        {pub.authors.join(', ')}
                      </p>
                      <h4 className="font-semibold text-polimi-blue-heritage mb-2">
                        {pub.title}
                      </h4>
                      <p className="text-sm text-gray-700">
                        <span className="italic">{pub.journal}</span>
                        {pub.volume && ` ${pub.volume}`}
                        {pub.pages && `:${pub.pages}`}
                        {` (${pub.year})`}
                      </p>
                      {pub.doi && (
                        <a 
                          href={`https://doi.org/${pub.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-polimi-bright-blue hover:text-polimi-alpha-blue mt-1 inline-block"
                        >
                          DOI: {pub.doi}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
}
