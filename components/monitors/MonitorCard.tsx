'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import { Monitor, CheckResult } from '@/lib/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UptimeBars } from '@/components/charts/UptimeBars';
import { globalScheduler } from '@/lib/monitoring/scheduler';
import { toggleMonitor, deleteMonitor } from '@/lib/storage/monitors';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

interface MonitorCardProps {
  monitor: Monitor;
  recentChecks?: CheckResult[];
  onRefresh?: () => void;
}

export function MonitorCard({ monitor, recentChecks = [], onRefresh }: MonitorCardProps) {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleManualCheck = async () => {
    setIsChecking(true);
    try {
      const res = await globalScheduler.checkNow(monitor.id);
      if (res?.status === 'ONLINE') {
        toast(`Check successful (${res.responseTimeMs}ms)`, 'success');
      } else if (res?.status === 'DEGRADED') {
        toast(`Slow response: ${res.responseTimeMs}ms`, 'info');
      } else {
        toast(`Check failed: ${res?.error?.message || 'Error'}`, 'error');
      }
      onRefresh?.();
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
      onRefresh?.();
    } catch {
      toast('Failed to update monitor status', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMonitor(monitor.id);
      toast('Monitor deleted', 'info');
      setShowDeleteConfirm(false);
      onRefresh?.();
    } catch {
      toast('Failed to delete monitor', 'error');
    }
  };

  const lastCheckedStr = monitor.lastCheckedAt
    ? new Date(monitor.lastCheckedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Never';

  const nextCheckSeconds = monitor.nextCheckAt
    ? Math.max(0, Math.round((monitor.nextCheckAt - Date.now()) / 1000))
    : monitor.interval || 60;

  return (
    <>
      <div className="glass-panel rounded-2xl p-5 border border-border transition-all duration-200 hover:border-text-secondary/25 shadow-sm">
        {/* Header Row: Status, Title, Quick Actions */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <StatusBadge status={monitor.status} size="md" />
            <div className="min-w-0">
              <Link
                href={`/dashboard/monitors/${monitor.id}`}
                className="font-bold text-base text-text-primary hover:text-accent transition-colors truncate block"
              >
                {monitor.name}
              </Link>
              <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                <a
                  href={monitor.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-text-primary transition-colors flex items-center gap-1 truncate max-w-xs"
                >
                  <span className="truncate">{monitor.url}</span>
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                </a>
                <span className="text-text-muted/40">•</span>
                <span className="uppercase font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface-secondary border border-border">
                  {monitor.monitorType}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleManualCheck}
              disabled={isChecking}
              title="Run Check Now"
              className="p-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-accent' : ''}`} />
            </button>
            <button
              onClick={handleToggle}
              title={monitor.enabled ? 'Pause Monitor' : 'Resume Monitor'}
              className="p-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
            >
              {monitor.enabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete Monitor"
              className="p-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Mini Bars / Uptime History */}
        <div className="my-4">
          <UptimeBars checks={recentChecks} maxBars={35} />
        </div>

        {/* Footer Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-border text-xs">
          <div>
            <div className="text-text-muted text-[11px] uppercase tracking-wider font-medium">Response Time</div>
            <div className="font-semibold text-text-primary mt-0.5">
              {monitor.lastResponseTime !== undefined && monitor.lastResponseTime !== null
                ? `${monitor.lastResponseTime} ms`
                : '—'}
            </div>
          </div>

          <div>
            <div className="text-text-muted text-[11px] uppercase tracking-wider font-medium">HTTP Code</div>
            <div className="font-semibold font-mono text-text-primary mt-0.5">
              {monitor.lastStatusCode ?? '—'}
            </div>
          </div>

          <div>
            <div className="text-text-muted text-[11px] uppercase tracking-wider font-medium">Last Checked</div>
            <div className="font-medium text-text-secondary mt-0.5">{lastCheckedStr}</div>
          </div>

          <div>
            <div className="text-text-muted text-[11px] uppercase tracking-wider font-medium">Next Check</div>
            <div className="font-medium text-text-secondary mt-0.5">
              {monitor.enabled ? `in ~${nextCheckSeconds}s` : 'Paused'}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={`Delete Monitor: ${monitor.name}`}
        description="Are you sure you want to permanently delete this monitor and all its recorded check history from your local browser storage?"
        confirmLabel="Delete Monitor"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  );
}
