'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Activity, CheckCircle2, AlertTriangle, XCircle, ArrowLeft, ShieldCheck, Share2 } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MonitorStatus } from '@/lib/types';

interface PortableConfigData {
  title: string;
  description?: string;
  accent?: string;
  generatedAt: number;
  monitors: Array<{
    name: string;
    url: string;
    status: MonitorStatus;
    responseTime?: number;
  }>;
}

function StatusContent() {
  const searchParams = useSearchParams();
  const configParam = searchParams.get('config');

  const [data, setData] = useState<PortableConfigData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configParam) {
      setError('No status configuration payload provided in URL parameter.');
      return;
    }

    try {
      const decoded = decodeURIComponent(escape(atob(configParam)));
      const parsed: PortableConfigData = JSON.parse(decoded);
      if (!parsed || !parsed.title || !Array.isArray(parsed.monitors)) {
        throw new Error('Malformed portable status configuration format.');
      }
      setData(parsed);
    } catch (err: any) {
      setError(`Failed to read portable configuration: ${err.message}`);
    }
  }, [configParam]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Invalid Status Link</h1>
        <p className="text-xs text-rose-400 max-w-sm">{error}</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-background text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Open Pulse Dashboard
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-text-muted">
        Decoding status telemetry...
      </div>
    );
  }

  const hasDown = data.monitors.some((m) => m.status === 'DOWN');
  const hasDegraded = data.monitors.some((m) => m.status === 'DEGRADED');

  let bannerBg = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
  let bannerIcon = CheckCircle2;
  let bannerTitle = 'All Systems Operational';

  if (hasDown) {
    bannerBg = 'bg-rose-500/10 border-rose-500/30 text-rose-400';
    bannerIcon = XCircle;
    bannerTitle = 'Service Degradation / Outage';
  } else if (hasDegraded) {
    bannerBg = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    bannerIcon = AlertTriangle;
    bannerTitle = 'Degraded Performance';
  }

  const BannerIcon = bannerIcon;

  return (
    <div className="min-h-screen bg-background text-text-primary p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-200">
        {/* Brand Header */}
        <div className="flex items-center justify-between border-b border-border pb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-background font-bold shadow-md shadow-accent/20">
              <Activity className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-text-primary">{data.title}</h1>
              {data.description && (
                <p className="text-xs text-text-secondary mt-0.5">{data.description}</p>
              )}
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-secondary border border-border text-text-muted">
              Portable Snapshot
            </span>
          </div>
        </div>

        {/* Global Health Status Banner */}
        <div className={`p-5 rounded-2xl border flex items-center gap-3.5 ${bannerBg}`}>
          <BannerIcon className="w-6 h-6 flex-shrink-0" />
          <div>
            <div className="font-bold text-sm tracking-tight">{bannerTitle}</div>
            <div className="text-xs opacity-80 mt-0.5">
              Snapshot taken at {new Date(data.generatedAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Services Table */}
        <div className="glass-panel rounded-2xl border border-border divide-y divide-border overflow-hidden">
          <div className="p-4 bg-surface-secondary/50 flex items-center justify-between text-xs font-semibold text-text-muted uppercase tracking-wider">
            <span>Service Component</span>
            <span>Status</span>
          </div>

          {data.monitors.map((m, idx) => (
            <div
              key={idx}
              className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-surface-secondary/30 transition-colors"
            >
              <div>
                <div className="font-bold text-sm text-text-primary">{m.name}</div>
                <div className="text-xs text-text-muted mt-0.5 font-mono truncate max-w-sm">
                  {m.url}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {m.responseTime !== undefined && (
                  <span className="text-xs font-mono text-text-secondary hidden sm:inline">
                    {m.responseTime} ms
                  </span>
                )}
                <StatusBadge status={m.status} size="md" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-border flex items-center justify-between text-xs text-text-muted">
          <span>Pulse • Database-Free Monitoring Platform</span>
          <Link href="/dashboard" className="text-accent hover:underline">
            Open Pulse
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PortableStatusPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-xs text-text-muted">Loading...</div>}>
      <StatusContent />
    </Suspense>
  );
}
