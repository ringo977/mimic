'use client';

import { motion } from 'framer-motion';
import Card from './ui/Card';
import { ArrowRight } from 'lucide-react';

interface ResearchCardProps {
  title: string;
  description: string;
  image?: string;
  tags?: string[];
  link?: string;
}

export default function ResearchCard({ title, description, image, tags, link }: ResearchCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Card className="h-full overflow-hidden group cursor-pointer">
        {image && (
          <div className="w-full h-48 bg-polimi-gray rounded-lg mb-4 overflow-hidden">
            <div 
              className="w-full h-full bg-cover bg-center transform group-hover:scale-110 transition-transform duration-500"
              style={{ 
                backgroundImage: `url(${image})`,
                backgroundColor: '#E0DCDC' 
              }}
            />
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
    </motion.div>
  );
}
