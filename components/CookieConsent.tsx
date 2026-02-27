'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { X, ChevronDown, ChevronUp } from 'lucide-react';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
}

const STORAGE_KEY = 'mimic-cookie-consent';

function getStoredPreferences(): CookiePreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function storePreferences(prefs: CookiePreferences) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export default function CookieConsent() {
  const [isOpen, setIsOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [expandedNecessary, setExpandedNecessary] = useState(false);
  const [expandedAnalytics, setExpandedAnalytics] = useState(false);

  useEffect(() => {
    const existing = getStoredPreferences();
    if (!existing) {
      setShowBanner(true);
    } else {
      setAnalyticsEnabled(existing.analytics);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsOpen(true);
      setShowBanner(false);
    };
    window.addEventListener('open-cookie-settings', handler);
    return () => window.removeEventListener('open-cookie-settings', handler);
  }, []);

  const handleAcceptAll = useCallback(() => {
    storePreferences({ necessary: true, analytics: true });
    setAnalyticsEnabled(true);
    setShowBanner(false);
    setIsOpen(false);
  }, []);

  const handleRejectAll = useCallback(() => {
    storePreferences({ necessary: true, analytics: false });
    setAnalyticsEnabled(false);
    setShowBanner(false);
    setIsOpen(false);
  }, []);

  const handleSaveSettings = useCallback(() => {
    storePreferences({ necessary: true, analytics: analyticsEnabled });
    setShowBanner(false);
    setIsOpen(false);
  }, [analyticsEnabled]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    if (!getStoredPreferences()) {
      storePreferences({ necessary: true, analytics: false });
    }
  }, []);

  if (!showBanner && !isOpen) return null;

  if (showBanner && !isOpen) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-200 shadow-[0_-4px_24px_rgba(0,0,0,0.12)] p-4 md:p-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex-1 font-manrope text-sm text-gray-700">
            <p>
              We use cookies to ensure basic website functionality and to improve your online experience.
              For more details, read our{' '}
              <Link href="/cookie-policy" className="text-polimi-bright-blue hover:underline">
                Cookie Policy
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-polimi-bright-blue hover:underline">
                Privacy Policy
              </Link>.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => { setShowBanner(false); setIsOpen(true); }}
              className="px-4 py-2 text-sm font-medium text-polimi-blue-heritage border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-manrope"
            >
              Settings
            </button>
            <button
              onClick={handleRejectAll}
              className="px-4 py-2 text-sm font-medium text-polimi-blue-heritage border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-manrope"
            >
              Reject all
            </button>
            <button
              onClick={handleAcceptAll}
              className="px-5 py-2 text-sm font-medium text-white bg-polimi-blue-heritage rounded-lg hover:bg-[#0d2340] transition-colors font-manrope"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="font-frank font-bold text-xl text-polimi-blue-heritage">
            Cookie usage 🍪
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-gray-600 font-manrope leading-relaxed">
            We use cookies to ensure basic website functionality and to improve your online experience.
            For each type of cookie you can choose to accept / reject when you want.
            For more details about cookies and other sensitive data please read{' '}
            <Link href="/privacy" className="text-polimi-bright-blue hover:underline font-medium">
              privacy policy
            </Link>{' '}
            in full.
          </p>

          {/* Strictly necessary cookies */}
          <div className="bg-gray-50 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedNecessary(!expandedNecessary)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-3">
                {expandedNecessary ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                <span className="font-manrope font-semibold text-sm text-gray-800">Strictly necessary cookies</span>
              </div>
              <div className="relative w-11 h-6 bg-gray-300 rounded-full cursor-not-allowed opacity-60">
                <div className="absolute top-0.5 left-[22px] w-5 h-5 bg-white rounded-full shadow flex items-center justify-center">
                  <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </button>
            {expandedNecessary && (
              <div className="px-5 pb-4 text-xs text-gray-500 font-manrope leading-relaxed">
                These cookies are essential for the website to function properly. They enable core functionalities
                such as page navigation and access to secure areas. The website cannot function without these cookies
                and they cannot be disabled.
              </div>
            )}
          </div>

          {/* Functional and Analytics cookies */}
          <div className="bg-gray-50 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedAnalytics(!expandedAnalytics)}
              className="w-full flex items-center justify-between px-5 py-4"
            >
              <div className="flex items-center gap-3">
                {expandedAnalytics ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                <span className="font-manrope font-semibold text-sm text-gray-800">Functional and Analytics cookies</span>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setAnalyticsEnabled(!analyticsEnabled); }}
                className={`relative w-11 h-6 rounded-full transition-colors ${analyticsEnabled ? 'bg-polimi-blue-heritage' : 'bg-gray-300'}`}
                aria-label="Toggle functional and analytics cookies"
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform flex items-center justify-center ${analyticsEnabled ? 'translate-x-[22px]' : 'translate-x-0.5'}`}>
                  {analyticsEnabled && (
                    <svg className="w-3 h-3 text-polimi-blue-heritage" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </button>
            </button>
            {expandedAnalytics && (
              <div className="px-5 pb-4 text-xs text-gray-500 font-manrope leading-relaxed">
                These cookies allow us to count visits and traffic sources so we can measure and improve site performance.
                They help us know which pages are the most and least popular and see how visitors move around the site.
                All information collected is aggregated and anonymous.
              </div>
            )}
          </div>

          {/* More information */}
          <div className="bg-gray-50 rounded-xl px-5 py-4">
            <p className="font-manrope font-semibold text-sm text-gray-800 mb-2">More information</p>
            <p className="text-xs text-gray-500 font-manrope leading-relaxed">
              For more details on cookies and data processing, read the{' '}
              <Link href="/cookie-policy" className="text-polimi-bright-blue hover:underline">Cookie Policy</Link>
              {' '}and the{' '}
              <Link href="/privacy" className="text-polimi-bright-blue hover:underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-between px-6 py-5 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={handleAcceptAll}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-polimi-blue-heritage rounded-lg hover:bg-[#0d2340] transition-colors font-manrope"
            >
              Accept all
            </button>
            <button
              onClick={handleRejectAll}
              className="px-5 py-2.5 text-sm font-semibold text-polimi-blue-heritage bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-manrope"
            >
              Reject all
            </button>
          </div>
          <button
            onClick={handleSaveSettings}
            className="px-5 py-2.5 text-sm font-semibold text-polimi-blue-heritage bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-manrope"
          >
            Save settings
          </button>
        </div>
      </div>
    </div>
  );
}
