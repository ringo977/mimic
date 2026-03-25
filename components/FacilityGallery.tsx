'use client';

import { useState, useEffect, useCallback } from 'react';
import { siteBasePath } from '@/lib/site-base-path';

interface FacilityGalleryProps {
  images: string[];
  alt: string;
}

export default function FacilityGallery({ images, alt }: FacilityGalleryProps) {
  const [current, setCurrent] = useState(0);
  const basePath = siteBasePath;

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1) return;
    const interval = setInterval(next, 4000);
    return () => clearInterval(interval);
  }, [next, images.length]);

  if (images.length === 0) return null;

  return (
    <div className="relative rounded-lg overflow-hidden aspect-[16/10]">
      {images.map((src, i) => (
        <img
          key={i}
          src={`${basePath}${src}`}
          alt={`${alt} — photo ${i + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${i === current ? 'opacity-100' : 'opacity-0'}`}
          loading="lazy"
        />
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === current ? 'bg-white' : 'bg-white/40'}`}
              aria-label={`Photo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
