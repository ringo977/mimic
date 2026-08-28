'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, X, ChevronLeft, ChevronRight, Image as ImageIcon, ExternalLink } from 'lucide-react';
import Card from './ui/Card';
import { siteBasePath } from '@/lib/site-base-path';

interface NewsItem {
  id: number;
  date: string;
  title: string;
  excerpt: string;
  image?: string;
  tag: string;
  tags?: string[];
  gallery?: string[];
  captions?: string[];
  link?: string;
}

interface NewsCardProps {
  news: NewsItem;
}

const tagColors: Record<string, string> = {
  'News': 'bg-blue-100 text-blue-800',
  'Publication': 'bg-rose-100 text-rose-800',
  'Event': 'bg-green-100 text-green-800',
  'Conference': 'bg-purple-100 text-purple-800',
  'Award': 'bg-yellow-100 text-yellow-800',
  'Outreach': 'bg-teal-100 text-teal-800',
};

export default function NewsCard({ news }: NewsCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const prefix = siteBasePath;

  const displayTags = news.tags && news.tags.length > 0 ? news.tags : [news.tag];
  const hasGallery = news.gallery && news.gallery.length > 1;

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (news.gallery) {
      setCurrentImage((prev) => (prev + 1) % news.gallery!.length);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (news.gallery) {
      setCurrentImage((prev) => (prev - 1 + news.gallery!.length) % news.gallery!.length);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        onClick={() => setShowModal(true)}
      >
        <Card className="h-full overflow-hidden group cursor-pointer">
          {news.image && (
            <div className="relative w-[calc(100%+3rem)] h-48 bg-polimi-gray rounded-t-xl mb-4 overflow-hidden -mx-6 -mt-6">
              <div
                className="w-full h-full bg-cover bg-center transform group-hover:scale-110 transition-transform duration-500"
                style={{
                  backgroundImage: `url(${prefix}${news.image})`,
                  backgroundColor: '#E0DCDC'
                }}
              />
              {hasGallery && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                  <ImageIcon size={12} />
                  {news.gallery!.length}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-wrap items-center gap-2">
              {displayTags.map(t => (
                <span key={t} className={`text-xs px-3 py-1 rounded-full font-medium ${tagColors[t] || 'bg-gray-100 text-gray-800'}`}>
                  {t}
                </span>
              ))}
            </div>
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

      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-20 bg-black/70 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between rounded-t-2xl">
                <div className="flex-1 pr-4">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    {displayTags.map(t => (
                      <span key={t} className={`text-xs px-3 py-1 rounded-full font-medium ${tagColors[t] || 'bg-gray-100 text-gray-800'}`}>
                        {t}
                      </span>
                    ))}
                    <div className="flex items-center text-gray-500 text-sm">
                      <Calendar size={14} className="mr-1" />
                      {new Date(news.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                  <h2 className="font-frank font-bold text-2xl text-polimi-blue-heritage">
                    {news.title}
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                  aria-label="Close"
                >
                  <X size={22} className="text-gray-700" />
                </button>
              </div>

              {/* Image Gallery */}
              {hasGallery ? (
                <div className="px-6 pt-4">
                  <div className="relative rounded-xl overflow-hidden bg-gray-100">
                    <div className="aspect-[16/10]">
                      <img
                        src={`${prefix}${news.gallery![currentImage]}`}
                        alt={news.captions?.[currentImage] || news.title}
                        className="w-full h-full object-contain bg-gray-50"
                      />
                    </div>
                    
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>

                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                      {currentImage + 1} / {news.gallery!.length}
                    </div>
                  </div>

                  {news.captions?.[currentImage] && (
                    <p className="text-sm text-gray-600 italic mt-2 text-center">
                      {news.captions[currentImage]}
                    </p>
                  )}

                  {/* Thumbnail strip */}
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                    {news.gallery!.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImage(idx)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                          idx === currentImage
                            ? 'border-polimi-bright-blue shadow-md'
                            : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={`${prefix}${img}`}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : news.image ? (
                <div className="px-6 pt-4">
                  <div className="rounded-xl overflow-hidden">
                    <img
                      src={`${prefix}${news.image}`}
                      alt={news.title}
                      className="w-full object-cover"
                    />
                  </div>
                </div>
              ) : null}

              {/* Content */}
              <div className="px-6 py-6">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {news.excerpt}
                </p>
                {(news as any).link && (
                  <a
                    href={(news as any).link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 mt-4 text-polimi-bright-blue hover:text-polimi-alpha-blue font-medium text-sm transition-colors"
                  >
                    <ExternalLink size={16} />
                    Read more
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
