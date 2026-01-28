'use client';

import { motion } from 'framer-motion';
import { Mail, X, FileText } from 'lucide-react';
import { useState, useMemo } from 'react';
import Card from './ui/Card';
import publicationsData from '@/data/publications.json';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  email: string;
  bio: string;
  bioFull?: string;
  image: string;
}

interface TeamCardProps {
  member: TeamMember;
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

export default function TeamCard({ member }: TeamCardProps) {
  const [showModal, setShowModal] = useState(false);

  // Extract last name and first initial (e.g., "Dr. Cecilia Palma" -> "Palma, C.")
  const getAuthorPattern = (fullName: string): string => {
    const parts = fullName.split(' ').filter(part => 
      !part.match(/^(Dr\.|Prof\.|Ph\.D\.|PhD|MSc|BSc)$/i)
    );
    
    // Find first name (first part that starts with uppercase and is longer than 2 chars)
    let firstName = '';
    let lastName = '';
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].replace(/[.,]/g, '');
      if (part.length > 2 && part[0] === part[0].toUpperCase()) {
        if (!firstName) {
          firstName = part;
        } else {
          lastName = part;
        }
      }
    }
    
    // If only one name found, use it as last name
    if (!lastName && firstName) {
      lastName = firstName;
      firstName = '';
    }
    
    // Return pattern like "Palma, C." or just "Palma" if no first name
    if (firstName && lastName) {
      return `${lastName}, ${firstName[0]}.`;
    }
    return lastName;
  };

  // Filter publications by author pattern (exclude book chapters)
  const memberPublications = useMemo(() => {
    const authorPattern = getAuthorPattern(member.name);
    return (publicationsData.publications as Publication[]).filter(pub => 
      pub.type !== "Book Chapter" && pub.authors.some(author => author.includes(authorPattern))
    );
  }, [member.name]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
      >
        <Card className="text-center h-full flex flex-col">
          <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden bg-polimi-gray">
            <div 
              className="w-full h-full bg-cover bg-center"
              style={{ 
                backgroundImage: `url(${member.image})`,
                backgroundColor: '#E0DCDC'
              }}
            />
          </div>
          
          <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-1">
            {member.name}
          </h3>
          
          <p className="text-polimi-bright-blue font-semibold text-sm mb-3">
            {member.role}
          </p>
          
          <p className="text-gray-700 text-sm mb-3 line-clamp-2">
            {member.bio}
          </p>

          <div className="mt-auto pt-3 space-y-2">
            <button
              onClick={() => setShowModal(true)}
              className="text-polimi-bright-blue hover:text-polimi-alpha-blue text-sm font-medium hover:underline"
            >
              Read more
            </button>
            
            <div className="pt-2 border-t border-gray-200">
              <a 
                href={`mailto:${member.email}`} 
                className="inline-flex items-center text-polimi-bright-blue hover:text-polimi-alpha-blue text-sm font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                <Mail size={16} className="mr-2" />
                Contact
              </a>
            </div>
          </div>
        </Card>
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
                  style={{ backgroundImage: `url(${member.image})` }}
                />
              </div>
              <div>
                <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-2">
                  {member.name}
                </h2>
                <p className="text-polimi-bright-blue font-semibold text-lg mb-2">
                  {member.role}
                </p>
                <a 
                  href={`mailto:${member.email}`} 
                  className="inline-flex items-center text-polimi-bright-blue hover:text-polimi-alpha-blue text-sm"
                >
                  <Mail size={16} className="mr-2" />
                  {member.email}
                </a>
              </div>
            </div>
            
            {/* Bio */}
            {member.bioFull && (
              <div className="mb-8">
                <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-4">
                  About
                </h3>
                <div className="prose max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {member.bioFull}
                  </p>
                </div>
              </div>
            )}

            {/* Publications Section */}
            {memberPublications.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText size={24} className="text-polimi-bright-blue" />
                  <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage">
                    Publications @MiMic
                  </h3>
                  <span className="bg-polimi-bright-blue text-white px-3 py-1 rounded-full text-sm font-semibold">
                    {memberPublications.length}
                  </span>
                </div>
                
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                  {memberPublications.map((pub) => (
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
