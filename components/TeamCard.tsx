'use client';

import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';
import { useState } from 'react';
import Card from './ui/Card';

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

export default function TeamCard({ member }: TeamCardProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        onClick={() => member.bioFull && setShowModal(true)}
        className={member.bioFull ? 'cursor-pointer' : ''}
      >
        <Card className="text-center h-full">
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
          
          <p className="text-gray-700 text-sm mb-4 line-clamp-3">
            {member.bio}
          </p>

          <a 
            href={`mailto:${member.email}`} 
            className="inline-flex items-center text-polimi-bright-blue hover:text-polimi-alpha-blue text-sm font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail size={16} className="mr-2" />
            Contact
          </a>
        </Card>
      </motion.div>

      {/* Modal for full bio */}
      {showModal && member.bioFull && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start space-x-6 mb-6">
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
                <p className="text-polimi-bright-blue font-semibold mb-2">
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
            
            <div className="prose max-w-none">
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                {member.bioFull}
              </p>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-6 px-6 py-2 bg-polimi-blue-heritage text-white rounded-lg hover:bg-polimi-blue-heritage/90 transition-colors"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}
    </>
  );
}
