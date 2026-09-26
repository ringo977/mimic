'use client';

import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

// Plain CSS transition instead of framer-motion: this component sits in the
// root layout, so it used to pull framer-motion into every page's bundle.
export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-6 right-6 z-40 p-3 bg-polimi-bright-blue hover:bg-polimi-blue-heritage text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 ${
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-75 pointer-events-none'
      }`}
      aria-label="Scroll to top"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <ArrowUp size={22} />
    </button>
  );
}
