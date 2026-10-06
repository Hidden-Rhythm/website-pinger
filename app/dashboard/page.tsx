'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Server,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  Plus,
  RefreshCw,
  Info,
  Radio,
  ExternalLink,
  ChevronRight,
  AlertOctagon,
} from 'lucide-react';
import { getMonitors } from '@/lib/storage/monitors';
import { getAllRecentChecks } from '@/lib/storage/checks';
import { getActiveIncidents } from '@/lib/storage/incidents';
import { Monitor, CheckResult, Incident } from '@/lib/types';
import { StatCard } from '@/components/ui/StatCard';
import { MonitorCard } from '@/components/monitors/MonitorCard';
import { EmptyState } from '@/components/monitors/EmptyState';
import { ResponseChart } from '@/components/charts/ResponseChart';
import { calculatePerformanceStats, calculateUptime } from '@/lib/analytics/metrics';
import { globalScheduler } from '@/lib/monitoring/scheduler';

export default function DashboardPage() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [recentChecks, setRecentChecks] = useState<CheckResult[]>([]);
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [mList, cList, iList] = await Promise.all([
        getMonitors(),
        getAllRecentChecks(80),
        getActiveIncidents(),
      ]);
      setMonitors(Array.isArray(mList) ? mList : []);
      setRecentChecks(Array.isArray(cList) ? cList : []);
      setActiveIncidents(Array.isArray(iList) ? iList : []);
    } catch (err) {
      console.error('[Pulse] Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to scheduler updates & global events
    const unsubscribe = globalScheduler.subscribe(() => {
      loadData();
    });

    const handleCustomUpdate = () => loadData();
    window.addEventListener('pulse-state-updated', handleCustomUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('pulse-state-updated', handleCustomUpdate);
    };
  }, [loadData]);

  // Derived metrics
  const totalCount = monitors.length;
  const onlineCount = monitors.filter((m) => m.status === 'ONLINE').length;
  const degradedCount = monitors.filter((m) => m.status === 'DEGRADED').length;
  const downCount = monitors.filter((m) => m.status === 'DOWN').length;

  const perfStats = calculatePerformanceStats(recentChecks);
  const uptimeStats = calculateUptime(recentChecks, 24 * 3600);

  // Group checks by monitorId for MonitorCard mini-bars
  const checksByMonitor = recentChecks.reduce<Record<string, CheckResult[]>>((acc, c) => {
    if (!acc[c.monitorId]) acc[c.monitorId] = [];
    acc[c.monitorId].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Banner & Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Overview
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Browser-based real-time telemetry. Monitoring is active while Pulse is open.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              monitors.forEach((m) => globalScheduler.checkNow(m.id));
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-secondary border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Check All Now</span>
          </button>
          <Link
            href="/dashboard/monitors/new"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-background font-semibold text-xs hover:bg-accent-hover transition-all shadow-md shadow-accent/20"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Monitor</span>
          </Link>
        </div>
      </div>

      {/* Database-Free Notice Card */}
      <div className="p-4 rounded-2xl bg-surface-secondary/70 border border-border flex items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent/10 text-accent border border-accent/20">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div className="text-xs">
            <span className="font-semibold text-text-primary">Local Storage Model:</span>{' '}
            <span className="text-text-secondary">
              Zero cloud database. Your configuration and metrics are stored strictly in this browser.
            </span>
          </div>
        </div>
        <Link
          href="/dashboard/settings"
          className="text-xs text-accent hover:underline flex items-center gap-1 font-medium flex-shrink-0"
        >
          Backup & Export <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Ongoing Incidents Alert (if any) */}
      {activeIncidents.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertOctagon className="w-5 h-5 text-rose-400 animate-bounce" />
              <div>
                <span className="font-bold text-sm text-rose-200">
                  {activeIncidents.length} Active Incident{activeIncidents.length > 1 ? 's' : ''} Detected
                </span>
                <p className="text-xs text-rose-300/80 mt-0.5">
                  {activeIncidents.map((i) => i.monitorName).join(', ')} currently experiencing downtime.
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/incidents"
              className="px-3 py-1.5 rounded-lg bg-rose-500 text-white font-semibold text-xs hover:bg-rose-600 transition-colors"
            >
              View Incidents
            </Link>
          </div>
        </div>
      )}

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard
          label="Total Monitors"
          value={totalCount}
          icon={Server}
          color="default"
        />
        <StatCard
          label="Online"
          value={onlineCount}
          icon={CheckCircle2}
          color="success"
        />
        <StatCard
          label="Degraded"
          value={degradedCount}
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          label="Down"
          value={downCount}
          icon={XCircle}
          color="danger"
        />
        <StatCard
          label="24h Uptime"
          value={`${uptimeStats.uptimePercentage}%`}
          subValue={uptimeStats.monitoredFormatted}
          icon={TrendingUp}
          color="accent"
        />
        <StatCard
          label="Avg Response"
          value={perfStats.average ? `${perfStats.average} ms` : '—'}
          subValue={perfStats.p95 ? `p95: ${perfStats.p95}ms` : undefined}
          icon={Clock}
          color="default"
        />
      </div>

      {/* Latency History Chart */}
      <div className="glass-panel rounded-2xl p-6 border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">
              Response Time History
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Live millisecond latency for recent checks
            </p>
          </div>
          <div className="text-xs font-mono text-text-muted">
            {recentChecks.length} samples
          </div>
        </div>
        <ResponseChart checks={recentChecks} height={220} />
      </div>

      {/* Monitors Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">Monitored Endpoints</h2>
            <p className="text-xs text-text-secondary">
              Real-time health and performance status
            </p>
          </div>
          {monitors.length > 0 && (
            <Link
              href="/dashboard/monitors"
              className="text-xs text-accent hover:underline flex items-center gap-1 font-medium"
            >
              Manage All ({monitors.length}) <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {monitors.length === 0 && !isLoading ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {monitors.map((m) => (
              <MonitorCard
                key={m.id}
                monitor={m}
                recentChecks={checksByMonitor[m.id] || []}
                onRefresh={loadData}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
