'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Users, Eye, RefreshCw, Globe, Monitor, Smartphone, Tablet } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DayStat {
  day: string;
  views: number;
  sessions: number;
}

interface SiteStats {
  total_views: number;
  unique_sessions: number;
  by_day: DayStat[];
  top_pages: { path: string; views: number }[];
  top_referrers: { referrer: string; views: number }[];
  devices: Record<string, number>;
}

const PERIODS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

const deviceIcons: Record<string, typeof Monitor> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
};

function referrerLabel(referrer: string): string {
  try {
    return new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return referrer;
  }
}

export default function SiteStatsPage() {
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (daysBack: number) => {
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('site_stats', { days_back: daysBack });
    if (rpcError) {
      setError(
        rpcError.message.includes('site_stats')
          ? 'Stats backend not set up yet — run scripts/supabase-site-analytics.sql in the Supabase SQL Editor.'
          : rpcError.message
      );
      setStats(null);
    } else {
      setStats(data as SiteStats);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  const maxDayViews = stats ? Math.max(1, ...stats.by_day.map(d => d.views)) : 1;
  const totalDeviceViews = stats
    ? Object.values(stats.devices).reduce((a, b) => a + b, 0)
    : 0;
  const maxPageViews = stats ? Math.max(1, ...stats.top_pages.map(p => p.views)) : 1;

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900 font-manrope flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#102C53]" />
            Site Stats
          </h1>
          <p className="text-sm text-gray-500 font-manrope mt-0.5">
            mimic.polimi.it — first-party analytics (visitors with cookie consent)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-xl p-1">
            {PERIODS.map(p => (
              <button
                key={p.days}
                onClick={() => setDays(p.days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-manrope transition-all ${
                  days === p.days ? 'bg-white text-[#102C53] shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(days)}
            className="p-2 rounded-xl bg-gray-100 text-gray-500 hover:text-[#102C53] transition-colors"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 text-amber-700 text-sm px-4 py-3 rounded-xl font-manrope mb-6">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="flex items-center justify-center py-20 text-gray-400 font-manrope text-sm">
          Loading stats…
        </div>
      ) : stats ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-manrope font-semibold uppercase tracking-wide mb-2">
                <Eye size={14} /> Page views
              </div>
              <p className="text-3xl font-bold text-[#102C53] font-manrope">{stats.total_views.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-manrope font-semibold uppercase tracking-wide mb-2">
                <Users size={14} /> Visits (sessions)
              </div>
              <p className="text-3xl font-bold text-[#102C53] font-manrope">{stats.unique_sessions.toLocaleString()}</p>
            </div>
          </div>

          {/* Daily chart */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
            <h2 className="text-sm font-bold text-gray-900 font-manrope mb-4">Views per day</h2>
            {stats.by_day.length === 0 ? (
              <p className="text-sm text-gray-400 font-manrope py-6 text-center">No data in this period yet.</p>
            ) : (
              <div className="flex items-end gap-[3px] h-36">
                {stats.by_day.map(d => (
                  <div
                    key={d.day}
                    className="flex-1 bg-[#102C53]/80 hover:bg-[#4DC9FF] rounded-t transition-colors min-w-[3px]"
                    style={{ height: `${Math.max(3, (d.views / maxDayViews) * 100)}%` }}
                    title={`${d.day}: ${d.views} views, ${d.sessions} visits`}
                  />
                ))}
              </div>
            )}
            {stats.by_day.length > 0 && (
              <div className="flex justify-between text-[10px] text-gray-400 font-manrope mt-2">
                <span>{stats.by_day[0].day}</span>
                <span>{stats.by_day[stats.by_day.length - 1].day}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top pages */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold text-gray-900 font-manrope mb-4">Top pages</h2>
              {stats.top_pages.length === 0 ? (
                <p className="text-sm text-gray-400 font-manrope">No data yet.</p>
              ) : (
                <div className="space-y-2">
                  {stats.top_pages.map(p => (
                    <div key={p.path} className="relative rounded-lg overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-blue-50"
                        style={{ width: `${(p.views / maxPageViews) * 100}%` }}
                      />
                      <div className="relative flex items-center justify-between px-3 py-1.5 text-sm font-manrope">
                        <span className="text-gray-700 truncate">{p.path}</span>
                        <span className="text-[#102C53] font-semibold ml-3 shrink-0">{p.views}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Referrers */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-900 font-manrope mb-4 flex items-center gap-2">
                  <Globe size={15} className="text-gray-400" /> Traffic sources
                </h2>
                {stats.top_referrers.length === 0 ? (
                  <p className="text-sm text-gray-400 font-manrope">Only direct visits so far.</p>
                ) : (
                  <div className="space-y-1.5">
                    {stats.top_referrers.map(r => (
                      <div key={r.referrer} className="flex items-center justify-between text-sm font-manrope">
                        <span className="text-gray-700 truncate" title={r.referrer}>{referrerLabel(r.referrer)}</span>
                        <span className="text-[#102C53] font-semibold ml-3 shrink-0">{r.views}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Devices */}
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h2 className="text-sm font-bold text-gray-900 font-manrope mb-4">Devices</h2>
                {totalDeviceViews === 0 ? (
                  <p className="text-sm text-gray-400 font-manrope">No data yet.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(stats.devices)
                      .sort((a, b) => b[1] - a[1])
                      .map(([device, views]) => {
                        const Icon = deviceIcons[device] || Monitor;
                        const pct = Math.round((views / totalDeviceViews) * 100);
                        return (
                          <div key={device} className="flex items-center gap-3 text-sm font-manrope">
                            <Icon size={15} className="text-gray-400 shrink-0" />
                            <span className="text-gray-700 capitalize w-16">{device}</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-[#102C53] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-gray-500 w-10 text-right">{pct}%</span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 font-manrope mt-6">
            Counts only visitors who accepted analytics in the cookie banner, on mimic.polimi.it. The /lab area is never tracked.
            Search impressions and clicks are in{' '}
            <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="text-[#4DC9FF] hover:underline">
              Google Search Console
            </a>.
          </p>
        </>
      ) : null}
    </div>
  );
}
