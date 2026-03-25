'use client';

import { motion } from 'framer-motion';
import { Mail, X, FileText, ExternalLink, Linkedin } from 'lucide-react';
import { useState, useMemo } from 'react';
import publicationsData from '@/data/publications.json';
import { siteBasePath } from '@/lib/site-base-path';

interface PI {
  name: string;
  role: string;
  email: string;
  bio: string;
  bioFull?: string;
  image: string;
  scopusId?: string;
  orcid?: string;
  linkedin?: string;
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
  const prefix = siteBasePath;

  // Extract last name and first initial (e.g., "Prof. Marco Rasponi" -> "Rasponi, M.")
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
    
    // Return pattern like "Rasponi, M." or just "Rasponi" if no first name
    if (firstName && lastName) {
      return `${lastName}, ${firstName[0]}.`;
    }
    return lastName;
  };

  // Filter publications by author pattern (exclude book chapters)
  const piPublications = useMemo(() => {
    const authorPattern = getAuthorPattern(pi.name);
    return (publicationsData.publications as Publication[]).filter(pub => 
      pub.type !== "Book Chapter" && pub.authors.some(author => author.includes(authorPattern))
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
                backgroundImage: `url(${prefix}${pi.image})`,
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
              
              <div className="flex items-center justify-center gap-4 pt-2">
                <a 
                  href={`mailto:${pi.email}`}
                  className="inline-flex items-center text-polimi-bright-blue hover:text-polimi-alpha-blue font-medium text-sm"
                >
                  <Mail size={16} className="mr-2" />
                  {pi.email}
                </a>
                {pi.linkedin && (
                  <a
                    href={pi.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#0A66C2] hover:text-[#004182] transition-colors"
                    title="LinkedIn Profile"
                  >
                    <Linkedin size={18} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal for full bio and publications */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center p-4 pt-20 overflow-y-auto"
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
                  style={{ backgroundImage: `url(${prefix}${pi.image})` }}
                />
              </div>
              <div>
                <h2 className="font-frank font-bold text-3xl text-polimi-blue-heritage mb-2">
                  {pi.name}
                </h2>
                <p className="text-polimi-bright-blue font-semibold text-lg mb-2">
                  {pi.role}
                </p>
                <div className="flex items-center gap-4">
                  <a 
                    href={`mailto:${pi.email}`} 
                    className="inline-flex items-center text-polimi-bright-blue hover:text-polimi-alpha-blue text-sm"
                  >
                    <Mail size={16} className="mr-2" />
                    {pi.email}
                  </a>
                  {pi.linkedin && (
                    <a
                      href={pi.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[#0A66C2] hover:text-[#004182] text-sm font-medium transition-colors"
                      title="LinkedIn Profile"
                    >
                      <Linkedin size={16} />
                      LinkedIn
                    </a>
                  )}
                </div>
                {/* Scopus & ORCID links */}
                {(pi.scopusId || pi.orcid) && (
                  <div className="flex items-center gap-3 mt-2">
                    {pi.scopusId && (
                      <a
                        href={`https://www.scopus.com/authid/detail.uri?authorId=${pi.scopusId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#E9711C]/10 text-[#E9711C] hover:bg-[#E9711C]/20 transition-colors"
                        title="Scopus Profile"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm3.14 17.474c-1.209.635-2.588.956-4.093.956-1.633 0-3.052-.398-4.21-1.186l.524-2.06c1.088.777 2.365 1.17 3.797 1.17.84 0 1.51-.175 2.003-.524.493-.35.74-.82.74-1.41 0-.553-.206-1.005-.618-1.356-.412-.35-1.124-.706-2.136-1.068-1.303-.467-2.264-1.02-2.884-1.658-.62-.638-.93-1.434-.93-2.388 0-1.12.42-2.017 1.258-2.69.84-.673 1.945-1.01 3.318-1.01 1.392 0 2.585.318 3.578.953l-.504 1.962c-.936-.6-2.002-.9-3.196-.9-.707 0-1.27.163-1.688.49-.42.326-.63.757-.63 1.293 0 .524.186.952.558 1.283.372.332 1.05.67 2.033 1.016 1.36.486 2.356 1.05 2.987 1.693.632.643.947 1.453.947 2.43 0 1.14-.432 2.053-1.296 2.737z"/></svg>
                        Scopus
                      </a>
                    )}
                    {pi.orcid && (
                      <a
                        href={`https://orcid.org/${pi.orcid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-[#A6CE39]/15 text-[#6B8E23] hover:bg-[#A6CE39]/25 transition-colors"
                        title="ORCID Profile"
                      >
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zM7.369 4.378c.525 0 .947.431.947.947s-.422.947-.947.947a.95.95 0 01-.947-.947c0-.525.422-.947.947-.947zm-.722 3.038h1.444v10.041H6.647V7.416zm3.562 0h3.9c3.712 0 5.344 2.653 5.344 5.025 0 2.578-2.016 5.025-5.325 5.025h-3.919V7.416zm1.444 1.303v7.444h2.297c3.272 0 4.022-2.484 4.022-3.722 0-1.547-.853-3.722-3.853-3.722h-2.466z"/></svg>
                        ORCID
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Bio */}
            <div className="mb-8">
              <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-4">
                About
              </h3>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {pi.bioFull || pi.bio}
                </p>
              </div>
            </div>

            {/* Publications Section */}
            {piPublications.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText size={24} className="text-polimi-bright-blue" />
                  <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage">
                    Publications @MiMic
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
