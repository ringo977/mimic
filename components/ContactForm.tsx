'use client';

import { useState, FormEvent } from 'react';
import Card from '@/components/ui/Card';

const FORMSPREE_ID = 'xkgrbjnq';

export default function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });

      if (res.ok) {
        setStatus('success');
        form.reset();
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (status === 'success') {
    return (
      <Card>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            ✓
          </div>
          <h3 className="font-frank font-bold text-xl text-polimi-blue-heritage mb-2">
            Message Sent!
          </h3>
          <p className="text-gray-600 mb-6">
            Thank you for reaching out. We will get back to you as soon as possible.
          </p>
          <button
            onClick={() => setStatus('idle')}
            className="text-polimi-bright-blue hover:text-polimi-blue-heritage font-semibold transition-colors"
          >
            Send another message
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-polimi-blue-heritage mb-2">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-polimi-bright-blue focus:ring-2 focus:ring-polimi-bright-blue/20 outline-none transition-all"
            placeholder="Your full name"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-polimi-blue-heritage mb-2">
            Email Address *
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-polimi-bright-blue focus:ring-2 focus:ring-polimi-bright-blue/20 outline-none transition-all"
            placeholder="your.email@example.com"
          />
        </div>

        <div>
          <label htmlFor="subject" className="block text-sm font-semibold text-polimi-blue-heritage mb-2">
            Subject *
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            required
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-polimi-bright-blue focus:ring-2 focus:ring-polimi-bright-blue/20 outline-none transition-all"
            placeholder="What is this regarding?"
          />
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-semibold text-polimi-blue-heritage mb-2">
            Message *
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={6}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-polimi-bright-blue focus:ring-2 focus:ring-polimi-bright-blue/20 outline-none transition-all resize-none"
            placeholder="Your message..."
          />
        </div>

        {status === 'error' && (
          <p className="text-red-600 text-sm">
            Something went wrong. Please try again or email us directly.
          </p>
        )}

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="w-full bg-polimi-bright-blue hover:bg-polimi-blue-heritage text-white px-6 py-4 rounded-lg font-manrope font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
        >
          {status === 'submitting' ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </Card>
  );
}
