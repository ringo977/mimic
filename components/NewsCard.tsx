'use client';

import { motion } from 'framer-motion';
import { Calendar } from 'lucide-react';
import Card from './ui/Card';

interface NewsItem {
  id: number;
  date: string;
  title: string;
  excerpt: string;
  image?: string;
  tag: 'News' | 'Event' | 'Conference' | 'Award';
}

interface NewsCardProps {
  news: NewsItem;
}

const tagColors = {
  'News': 'bg-blue-100 text-blue-800',
  'Event': 'bg-green-100 text-green-800',
  'Conference': 'bg-purple-100 text-purple-800',
  'Award': 'bg-yellow-100 text-yellow-800',
};

export default function NewsCard({ news }: NewsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Card className="h-full overflow-hidden group cursor-pointer">
        {news.image && (
          <div className="w-full h-48 bg-polimi-gray rounded-lg mb-4 overflow-hidden -mx-6 -mt-6 mb-4">
            <div 
              className="w-full h-full bg-cover bg-center transform group-hover:scale-110 transition-transform duration-500"
              style={{ 
                backgroundImage: `url(${news.image})`,
                backgroundColor: '#E0DCDC' 
              }}
            />
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${tagColors[news.tag]}`}>
            {news.tag}
          </span>
          <div className="flex items-center text-gray-500 text-sm">
            <Calendar size={14} className="mr-1" />
            {new Date(news.date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
        </div>

        <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-3 group-hover:text-polimi-bright-blue transition-colors">
          {news.title}
        </h3>

        <p className="text-gray-700 line-clamp-3">
          {news.excerpt}
        </p>
      </Card>
    </motion.div>
  );
}
