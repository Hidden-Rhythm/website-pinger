'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { getIncidents } from '@/lib/storage/incidents';
import { Incident } from '@/lib/types';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/monitors/EmptyState';
import { globalScheduler } from '@/lib/monitoring/scheduler';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'ONGOING' | 'RESOLVED'>('ALL');
  const [isLoading, setIsLoading] = useState(true);

  const loadIncidents = useCallback(async () => {
    try {
      const list = await getIncidents();
      setIncidents(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIncidents();
    const unsub = globalScheduler.subscribe(loadIncidents);
    return () => unsub();
  }, [loadIncidents]);

  const filteredIncidents = incidents.filter((inc) => {
    if (filter === 'ONGOING') return inc.status === 'ONGOING';
    if (filter === 'RESOLVED') return inc.status === 'RESOLVED';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Incidents ({incidents.length})
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Track automated outage reports, downtime durations, and resolution timelines
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-secondary border border-border self-start sm:self-auto">
          {(['ALL', 'ONGOING', 'RESOLVED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium uppercase transition-colors ${
                filter === f
                  ? 'bg-accent text-background font-bold shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Incidents List */}
      {filteredIncidents.length === 0 && !isLoading ? (
        <EmptyState
          title="Everything looks good."
          description={
            filter !== 'ALL'
              ? `No ${filter.toLowerCase()} incidents recorded in browser storage.`
              : 'No incidents recorded yet. When a monitor breaches failure thresholds, an incident will automatically be generated here.'
          }
          icon={CheckCircle2}
          actionLabel="View Monitors"
          actionHref="/dashboard/monitors"
        />
      ) : (
        <div className="space-y-4">
          {filteredIncidents.map((inc) => {
            const isOngoing = inc.status === 'ONGOING';
            const durationMs = (inc.resolvedAt || Date.now()) - inc.startedAt;
            const durationMin = Math.floor(durationMs / 60000);
            const durationSec = Math.floor((durationMs % 60000) / 1000);
            const durationStr = `${durationMin}m ${durationSec}s`;

            return (
              <div
                key={inc.id}
                className={`glass-panel rounded-2xl p-6 border transition-all ${
                  isOngoing
                    ? 'border-rose-500/30 bg-rose-500/5'
                    : 'border-border hover:border-text-secondary/25'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border ${
                        isOngoing
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}
                    >
                      {isOngoing ? <AlertOctagon className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/monitors/${inc.monitorId}`}
                          className="font-bold text-base text-text-primary hover:text-accent transition-colors"
                        >
                          {inc.monitorName}
                        </Link>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isOngoing
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {inc.status}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted mt-0.5 font-mono">
                        ID: {inc.id}
                      </div>
                    </div>
                  </div>

                  {/* Duration pill */}
                  <div className="text-right text-xs">
                    <div className="text-text-muted">Downtime Duration</div>
                    <div className="font-bold font-mono text-text-primary mt-0.5">
                      {durationStr}
                    </div>
                  </div>
                </div>

                {/* Reason */}
                <div className="p-3.5 rounded-xl bg-surface-secondary border border-border text-xs mb-4">
                  <span className="text-text-muted font-medium">Root Cause:</span>{' '}
                  <span className="text-text-primary font-mono">{inc.reason}</span>
                </div>

                {/* Timeline */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">
                    Incident Timeline
                  </span>
                  <div className="space-y-1.5 pl-2">
                    {inc.timeline.map((entry, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-xs">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            entry.status === 'ONLINE' ? 'bg-emerald-400' : 'bg-rose-400'
                          }`}
                        />
                        <span className="text-text-muted font-mono text-[11px]">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={`font-semibold ${
                            entry.status === 'ONLINE' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {entry.status}
                        </span>
                        <span className="text-text-secondary truncate">{entry.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
