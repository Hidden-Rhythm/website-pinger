'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { getAllRecentChecks } from '@/lib/storage/checks';
import { getMonitors } from '@/lib/storage/monitors';
import { getIncidents } from '@/lib/storage/incidents';
import { CheckResult, Monitor, Incident } from '@/lib/types';
import { StatCard } from '@/components/ui/StatCard';
import { ResponseChart } from '@/components/charts/ResponseChart';
import { calculatePerformanceStats, calculateUptime } from '@/lib/analytics/metrics';

export default function AnalyticsPage() {
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filterTime, setFilterTime] = useState<'1h' | '6h' | '24h' | '7d' | '30d' | 'all'>('24h');

  useEffect(() => {
    Promise.all([getAllRecentChecks(500), getMonitors(), getIncidents()]).then(
      ([cList, mList, iList]) => {
        setChecks(cList);
        setMonitors(mList);
        setIncidents(iList);
      }
    );
  }, []);

  const filterSecondsMap = {
    '1h': 3600,
    '6h': 6 * 3600,
    '24h': 24 * 3600,
    '7d': 7 * 86400,
    '30d': 30 * 86400,
    all: 365 * 86400,
  };

  const filteredChecks = useMemo(() => {
    if (filterTime === 'all') return checks;
    const cutoff = Date.now() - filterSecondsMap[filterTime] * 1000;
    return checks.filter((c) => c.checkedAt >= cutoff);
  }, [checks, filterTime]);

  const perfStats = calculatePerformanceStats(filteredChecks);
  const uptimeData = calculateUptime(filteredChecks, filterSecondsMap[filterTime]);

  // Status code distribution
  const statusCodeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredChecks.forEach((c) => {
      const code = c.statusCode ? String(c.statusCode) : 'Error';
      counts[code] = (counts[code] || 0) + 1;
    });
    return counts;
  }, [filteredChecks]);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Analytics & Telemetry
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Aggregated latency percentiles, uptime analysis, and status distributions
          </p>
        </div>

        {/* Time Filter Controls */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-secondary border border-border self-start sm:self-auto">
          {(['1h', '6h', '24h', '7d', '30d', 'all'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterTime(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase transition-colors ${
                filterTime === t
                  ? 'bg-accent text-background font-bold shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Actual Uptime"
          value={`${uptimeData.uptimePercentage}%`}
          subValue={`Based on ${uptimeData.totalChecks} checks`}
          icon={TrendingUp}
          color="success"
        />
        <StatCard
          label="Monitored Time"
          value={uptimeData.monitoredFormatted}
          subValue="While Pulse was active"
          icon={Activity}
          color="accent"
        />
        <StatCard
          label="Unmonitored Time"
          value={uptimeData.unmonitoredFormatted}
          subValue="While Pulse was closed"
          icon={Clock}
          color="default"
        />
        <StatCard
          label="Average Latency"
          value={perfStats.average ? `${perfStats.average} ms` : '—'}
          subValue={`Median: ${perfStats.median} ms`}
          icon={Clock}
          color="default"
        />
      </div>

      {/* Latency Percentiles Breakdown */}
      <div className="glass-panel rounded-2xl p-6 border border-border">
        <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">
          Response Time Percentiles
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 text-center">
          <div className="p-3.5 rounded-xl bg-surface-secondary border border-border">
            <div className="text-[10px] text-text-muted uppercase">P50 (Median)</div>
            <div className="text-xl font-bold text-text-primary mt-1">{perfStats.median} ms</div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-secondary border border-border">
            <div className="text-[10px] text-text-muted uppercase">Average</div>
            <div className="text-xl font-bold text-text-primary mt-1">{perfStats.average} ms</div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-secondary border border-border">
            <div className="text-[10px] text-text-muted uppercase">P95</div>
            <div className="text-xl font-bold text-accent mt-1">{perfStats.p95} ms</div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-secondary border border-border">
            <div className="text-[10px] text-text-muted uppercase">P99</div>
            <div className="text-xl font-bold text-amber-400 mt-1">{perfStats.p99} ms</div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-secondary border border-border">
            <div className="text-[10px] text-text-muted uppercase">Minimum</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">{perfStats.min} ms</div>
          </div>
          <div className="p-3.5 rounded-xl bg-surface-secondary border border-border">
            <div className="text-[10px] text-text-muted uppercase">Maximum</div>
            <div className="text-xl font-bold text-rose-400 mt-1">{perfStats.max} ms</div>
          </div>
        </div>
      </div>

      {/* Combined Latency Chart */}
      <div className="glass-panel rounded-2xl p-6 border border-border">
        <h3 className="text-sm font-bold text-text-primary mb-4">Latency Timeline</h3>
        <ResponseChart checks={filteredChecks} height={260} />
      </div>

      {/* HTTP Status Code Distribution */}
      <div className="glass-panel rounded-2xl p-6 border border-border">
        <h3 className="text-sm font-bold text-text-primary mb-4">HTTP Status Code Distribution</h3>
        {Object.keys(statusCodeCounts).length === 0 ? (
          <div className="text-xs text-text-muted text-center py-6">
            No status code telemetry recorded for selected window.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {Object.entries(statusCodeCounts).map(([code, count]) => {
              const is2xx = code.startsWith('2');
              const is3xx = code.startsWith('3');
              const is4xx = code.startsWith('4');
              const is5xx = code.startsWith('5');

              let badgeColor = 'text-text-primary bg-surface-secondary';
              if (is2xx) badgeColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
              else if (is3xx) badgeColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
              else if (is4xx) badgeColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
              else if (is5xx || code === 'Error')
                badgeColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';

              return (
                <div key={code} className={`p-3 rounded-xl border text-center ${badgeColor}`}>
                  <div className="text-xs font-mono font-bold uppercase">{code}</div>
                  <div className="text-lg font-bold mt-0.5">{count}</div>
                  <div className="text-[10px] opacity-75">requests</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
