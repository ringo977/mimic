'use client';

import { useState } from 'react';
import NewsCard from '@/components/NewsCard';
import newsData from '@/data/news.json';

export default function NewsPage() {
  const [selectedTag, setSelectedTag] = useState<string>('all');

  const tags = ['all', 'News', 'Conference', 'Award', 'Event', 'Outreach'];

  const filteredNews = selectedTag === 'all' 
    ? newsData.news 
    : newsData.news.filter(item => item.tag === selectedTag);

  return (
    <div className="relative z-10 pb-20">
      {/* Header */}
      <section className="bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white py-20">
        <div className="container-polimi">
          <h1 className="font-frank font-bold text-5xl md:text-6xl mb-6">
            News & Events
          </h1>
          <p className="text-xl text-polimi-gray max-w-3xl">
            Stay updated with our latest research achievements, upcoming events, 
            and laboratory activities.
          </p>
        </div>
      </section>

      {/* Filter and News */}
      <section className="py-20 bg-white">
        <div className="container-polimi">
          {/* Filter */}
          <div className="bg-gray-50 rounded-xl p-6 mb-12">
            <div className="flex flex-wrap gap-3">
              {tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={`px-6 py-2 rounded-lg font-medium transition-all ${
                    selectedTag === tag
                      ? 'bg-polimi-bright-blue text-white shadow-md'
                      : 'bg-white text-polimi-blue-heritage hover:bg-polimi-bright-blue/10'
                  }`}
                >
                  {tag === 'all' ? 'All' : tag}
                </button>
              ))}
            </div>

            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredNews.length} item{filteredNews.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* News Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredNews.map(item => (
              <NewsCard key={item.id} news={item} />
            ))}
          </div>

          {filteredNews.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">
                No items found in this category.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-20 bg-gradient-to-r from-polimi-blue-heritage to-polimi-space-blue text-white">
        <div className="container-polimi text-center">
          <h2 className="font-frank font-bold text-3xl md:text-4xl mb-6">
            Subscribe to Our Newsletter
          </h2>
          <p className="text-polimi-gray mb-8 max-w-2xl mx-auto">
            Get the latest news, research updates, and event announcements delivered to your inbox.
          </p>
          
          <form className="max-w-md mx-auto">
            <div className="flex gap-3">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 rounded-lg text-polimi-blue-heritage focus:outline-none focus:ring-2 focus:ring-polimi-bright-blue"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-polimi-bright-blue hover:bg-polimi-blue-heritage text-white rounded-lg font-semibold transition-colors whitespace-nowrap"
              >
                Subscribe
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
