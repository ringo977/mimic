'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Card from './ui/Card';
import { ArrowRight } from 'lucide-react';

interface ResearchCardProps {
  title: string;
  description: string;
  image?: string;
  video?: string;
  tags?: string[];
  link?: string;
}

export default function ResearchCard({ title, description, image, video, tags, link }: ResearchCardProps) {
  const prefix = process.env.NODE_ENV === 'production' ? '/mimic' : '';
  const content = (
    <Card className="h-full overflow-hidden group cursor-pointer">
      {(image || video) && (
        <div className="w-full h-48 bg-polimi-gray rounded-lg mb-4 overflow-hidden relative">
          {video ? (
            <video
              autoPlay loop muted playsInline
              className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
            >
              <source src={`${prefix}${video}`} type="video/mp4" />
            </video>
          ) : (
            <div 
              className="w-full h-full bg-cover bg-center transform group-hover:scale-110 transition-transform duration-500"
              style={{ 
                backgroundImage: `url(${prefix}${image})`,
                backgroundColor: '#E0DCDC' 
              }}
            />
          )}
        </div>
      )}
      
      <h3 className="font-frank font-bold text-2xl text-polimi-blue-heritage mb-3 group-hover:text-polimi-bright-blue transition-colors">
        {title}
      </h3>
      
      <p className="text-gray-700 mb-4 line-clamp-3">
        {description}
      </p>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, idx) => (
            <span 
              key={idx} 
              className="text-xs px-3 py-1 bg-polimi-bright-blue/10 text-polimi-blue-heritage rounded-full font-medium"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {link && (
        <div className="flex items-center text-polimi-bright-blue font-semibold group-hover:translate-x-2 transition-transform">
          Learn more <ArrowRight size={18} className="ml-2" />
        </div>
      )}
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      {link ? <Link href={link} className="block h-full">{content}</Link> : content}
    </motion.div>
  );
}
