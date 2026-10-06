'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  RefreshCw,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Sliders,
  History,
  AlertOctagon,
  TrendingUp,
} from 'lucide-react';
import { getMonitor, updateMonitor, toggleMonitor, deleteMonitor } from '@/lib/storage/monitors';
import { getRecentChecks, getChecksInRange } from '@/lib/storage/checks';
import { getIncidentsForMonitor } from '@/lib/storage/incidents';
import { Monitor, CheckResult, Incident } from '@/lib/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { ResponseChart } from '@/components/charts/ResponseChart';
import { UptimeBars } from '@/components/charts/UptimeBars';
import { calculatePerformanceStats, calculateUptime } from '@/lib/analytics/metrics';
import { globalScheduler } from '@/lib/monitoring/scheduler';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

export default function MonitorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const monitorId = params.id as string;

  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [isChecking, setIsChecking] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!monitorId) return;
    try {
      const m = await getMonitor(monitorId);
      if (!m) {
        setMonitor(null);
        setIsLoading(false);
        return;
      }
      setMonitor(m);

      const [cList, incList] = await Promise.all([
        getRecentChecks(monitorId, 100),
        getIncidentsForMonitor(monitorId),
      ]);
      setChecks(cList);
      setIncidents(incList);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [monitorId]);

  useEffect(() => {
    loadData();
    const unsub = globalScheduler.subscribe(loadData);
    return () => unsub();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-xs text-text-muted">
        Loading monitor telemetry...
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-lg font-bold text-text-primary">Monitor Not Found</h2>
        <p className="text-xs text-text-secondary">
          The requested monitor does not exist in your local storage.
        </p>
        <Link
          href="/dashboard/monitors"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-background text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Monitors
        </Link>
      </div>
    );
  }

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const res = await globalScheduler.checkNow(monitor.id);
      if (res?.status === 'ONLINE') {
        toast(`Check successful (${res.responseTimeMs}ms)`, 'success');
      } else if (res?.status === 'DEGRADED') {
        toast(`Slow response (${res.responseTimeMs}ms)`, 'info');
      } else {
        toast(`Check failed: ${res?.error?.message || 'Error'}`, 'error');
      }
      loadData();
    } catch {
      toast('Failed to run check', 'error');
    } finally {
      setIsChecking(false);
    }
  };

  const handleToggle = async () => {
    try {
      await toggleMonitor(monitor.id, !monitor.enabled);
      toast(monitor.enabled ? 'Monitor paused' : 'Monitor resumed', 'info');
      loadData();
    } catch {
      toast('Failed to update monitor', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMonitor(monitor.id);
      toast('Monitor deleted', 'info');
      router.push('/dashboard/monitors');
    } catch {
      toast('Failed to delete monitor', 'error');
    }
  };

  const perfStats = calculatePerformanceStats(checks);

  const timeframeSecondsMap = {
    '1h': 3600,
    '24h': 86400,
    '7d': 7 * 86400,
    '30d': 30 * 86400,
  };
  const uptimeData = calculateUptime(checks, timeframeSecondsMap[timeframe], monitor.interval || 60);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/monitors"
            className="p-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-text-primary">{monitor.name}</h1>
              <StatusBadge status={monitor.status} size="md" />
            </div>
            <a
              href={monitor.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-muted hover:text-accent flex items-center gap-1 mt-0.5"
            >
              <span>{monitor.url}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleManualCheck}
            disabled={isChecking}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-secondary border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-accent' : ''}`} />
            <span>Check Now</span>
          </button>
          <button
            onClick={handleToggle}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-secondary border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            {monitor.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{monitor.enabled ? 'Pause' : 'Resume'}</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Uptime and Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Current Response"
          value={monitor.lastResponseTime !== undefined ? `${monitor.lastResponseTime} ms` : '—'}
          subValue={monitor.lastStatusCode ? `HTTP ${monitor.lastStatusCode}` : undefined}
          icon={Clock}
          color="accent"
        />
        <StatCard
          label={`${timeframe.toUpperCase()} Uptime`}
          value={`${uptimeData.uptimePercentage}%`}
          subValue={`Based on ${uptimeData.totalChecks} checks`}
          icon={TrendingUp}
          color="success"
        />
        <StatCard
          label="Monitored Time"
          value={uptimeData.monitoredFormatted}
          subValue={`Unmonitored: ${uptimeData.unmonitoredFormatted}`}
          icon={Activity}
          color="default"
        />
        <StatCard
          label="Incidents"
          value={incidents.length}
          subValue={incidents.filter((i) => i.status === 'ONGOING').length ? 'Ongoing outage' : 'All resolved'}
          icon={AlertOctagon}
          color={incidents.filter((i) => i.status === 'ONGOING').length ? 'danger' : 'default'}
        />
      </div>

      {/* Performance Percentiles */}
      <div className="glass-panel rounded-2xl p-6 border border-border">
        <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">
          Latency Percentiles & Distribution
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 text-center">
          <div className="p-3 rounded-xl bg-surface-secondary border border-border">
            <div className="text-[10px] text-text-muted uppercase">Average</div>
            <div className="text-lg font-bold text-text-primary mt-0.5">{perfStats.average} ms</div>
          </div>
          <div className="p-3 rounded-xl bg-surface-secondary border border-border">
            <div className="text-[10px] text-text-muted uppercase">Median (P50)</div>
            <div className="text-lg font-bold text-text-primary mt-0.5">{perfStats.median} ms</div>
          </div>
          <div className="p-3 rounded-xl bg-surface-secondary border border-border">
            <div className="text-[10px] text-text-muted uppercase">P95</div>
            <div className="text-lg font-bold text-accent mt-0.5">{perfStats.p95} ms</div>
          </div>
          <div className="p-3 rounded-xl bg-surface-secondary border border-border">
            <div className="text-[10px] text-text-muted uppercase">P99</div>
            <div className="text-lg font-bold text-amber-400 mt-0.5">{perfStats.p99} ms</div>
          </div>
          <div className="p-3 rounded-xl bg-surface-secondary border border-border">
            <div className="text-[10px] text-text-muted uppercase">Min</div>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">{perfStats.min} ms</div>
          </div>
          <div className="p-3 rounded-xl bg-surface-secondary border border-border">
            <div className="text-[10px] text-text-muted uppercase">Max</div>
            <div className="text-lg font-bold text-rose-400 mt-0.5">{perfStats.max} ms</div>
          </div>
        </div>
      </div>

      {/* Latency History Graph */}
      <div className="glass-panel rounded-2xl p-6 border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Response Time Graph</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Continuously plotted while dashboard is open
            </p>
          </div>
          {/* Timeframe switch */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-secondary border border-border">
            {(['1h', '24h', '7d', '30d'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1 rounded-lg text-xs font-medium uppercase transition-colors ${
                  timeframe === t
                    ? 'bg-accent text-background font-bold shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <ResponseChart checks={checks} height={260} />
      </div>

      {/* Check History Table */}
      <div className="glass-panel rounded-2xl border border-border overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary">Recent Checks History</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Recorded responses and assertions
            </p>
          </div>
          <span className="text-xs font-mono text-text-muted">{checks.length} checks logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-secondary/60 text-text-muted border-b border-border uppercase font-mono text-[10px]">
              <tr>
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">HTTP Code</th>
                <th className="py-3 px-5">Response Time</th>
                <th className="py-3 px-5">Result / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono">
              {checks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-muted font-sans">
                    No checks recorded yet. Checks run automatically while Pulse is open.
                  </td>
                </tr>
              ) : (
                checks.slice().reverse().slice(0, 30).map((c) => (
                  <tr key={c.id} className="hover:bg-surface-secondary/40 transition-colors">
                    <td className="py-3 px-5 text-text-secondary">
                      {new Date(c.checkedAt).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-5 font-sans">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="py-3 px-5 text-text-primary font-bold">
                      {c.statusCode ?? '—'}
                    </td>
                    <td className="py-3 px-5 text-accent font-semibold">
                      {c.responseTimeMs > 0 ? `${c.responseTimeMs} ms` : '—'}
                    </td>
                    <td className="py-3 px-5 text-text-secondary truncate max-w-xs font-sans">
                      {c.assertionMessage || (c.error ? c.error.message : 'OK')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monitor Configuration Details */}
      <div className="glass-panel rounded-2xl p-6 border border-border">
        <h3 className="text-sm font-bold text-text-primary mb-4">Configuration</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-text-muted">Method:</span>
            <span className="ml-2 font-mono font-bold text-text-primary">{monitor.method}</span>
          </div>
          <div>
            <span className="text-text-muted">Interval:</span>
            <span className="ml-2 font-mono text-text-primary">{monitor.interval}s</span>
          </div>
          <div>
            <span className="text-text-muted">Timeout:</span>
            <span className="ml-2 font-mono text-text-primary">{monitor.timeout}s</span>
          </div>
          <div>
            <span className="text-text-muted">Failure Threshold:</span>
            <span className="ml-2 font-mono text-text-primary">{monitor.failureThreshold} fails</span>
          </div>
          <div>
            <span className="text-text-muted">Recovery Threshold:</span>
            <span className="ml-2 font-mono text-text-primary">{monitor.recoveryThreshold} passes</span>
          </div>
          <div>
            <span className="text-text-muted">Slow Threshold:</span>
            <span className="ml-2 font-mono text-text-primary">{monitor.slowResponseThreshold}ms</span>
          </div>
          <div>
            <span className="text-text-muted">Type:</span>
            <span className="ml-2 font-mono uppercase text-text-primary">{monitor.monitorType}</span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={`Delete Monitor: ${monitor.name}`}
        description="Are you sure you want to permanently delete this monitor and its history from your browser IndexedDB?"
        confirmLabel="Delete Monitor"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
