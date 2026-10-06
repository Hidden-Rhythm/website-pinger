'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Activity, CheckCircle2, AlertTriangle, XCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { getStatusPageBySlug } from '@/lib/storage/statusPages';
import { getMonitors } from '@/lib/storage/monitors';
import { StatusPageConfig, Monitor } from '@/lib/types';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function StatusPageSlugView() {
  const params = useParams();
  const slug = params.slug as string;

  const [pageConfig, setPageConfig] = useState<StatusPageConfig | null>(null);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!slug) return;
      try {
        const config = await getStatusPageBySlug(slug);
        if (config) {
          setPageConfig(config);
          const allMonitors = await getMonitors();
          const filtered = allMonitors.filter((m) => config.monitors.includes(m.id));
          setMonitors(filtered);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-text-muted">
        Loading status...
      </div>
    );
  }

  if (!pageConfig) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6 space-y-4">
        <h1 className="text-xl font-bold text-text-primary">Status Page Not Found</h1>
        <p className="text-xs text-text-secondary max-w-sm">
          No local status page configuration found for &ldquo;{slug}&rdquo;. Status pages are stored locally in the creator&apos;s browser.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-background text-xs font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Pulse
        </Link>
      </div>
    );
  }

  const hasDown = monitors.some((m) => m.status === 'DOWN');
  const hasDegraded = monitors.some((m) => m.status === 'DEGRADED');

  let bannerBg = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
  let bannerIcon = CheckCircle2;
  let bannerTitle = 'All Systems Operational';

  if (hasDown) {
    bannerBg = 'bg-rose-500/10 border-rose-500/30 text-rose-400';
    bannerIcon = XCircle;
    bannerTitle = 'Major Service Outage Detected';
  } else if (hasDegraded) {
    bannerBg = 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    bannerIcon = AlertTriangle;
    bannerTitle = 'Degraded Performance';
  }

  const BannerIconComponent = bannerIcon;

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
              <h1 className="text-xl font-bold tracking-tight text-text-primary">
                {pageConfig.title}
              </h1>
              {pageConfig.description && (
                <p className="text-xs text-text-secondary mt-0.5">{pageConfig.description}</p>
              )}
            </div>
          </div>

          <Link
            href="/dashboard"
            className="text-xs text-text-muted hover:text-text-primary transition-colors flex items-center gap-1 font-mono"
          >
            Powered by Pulse
          </Link>
        </div>

        {/* Global Health Status Banner */}
        <div className={`p-5 rounded-2xl border flex items-center gap-3.5 ${bannerBg}`}>
          <BannerIconComponent className="w-6 h-6 flex-shrink-0" />
          <div>
            <div className="font-bold text-sm tracking-tight">{bannerTitle}</div>
            <div className="text-xs opacity-80 mt-0.5">
              Live status report updated automatically from browser telemetry.
            </div>
          </div>
        </div>

        {/* Monitored Services List */}
        <div className="glass-panel rounded-2xl border border-border divide-y divide-border overflow-hidden">
          <div className="p-4 bg-surface-secondary/50 flex items-center justify-between text-xs font-semibold text-text-muted uppercase tracking-wider">
            <span>System Component</span>
            <span>Status</span>
          </div>

          {monitors.map((m) => (
            <div
              key={m.id}
              className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-surface-secondary/30 transition-colors"
            >
              <div>
                <div className="font-bold text-sm text-text-primary">{m.name}</div>
                <div className="text-xs text-text-muted mt-0.5 font-mono truncate max-w-sm">
                  {m.url}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {m.lastResponseTime !== undefined && (
                  <span className="text-xs font-mono text-text-secondary hidden sm:inline">
                    {m.lastResponseTime} ms
                  </span>
                )}
                <StatusBadge status={m.status} size="md" />
              </div>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-border text-center text-xs text-text-muted">
          <span>Pulse • Database-Free Website & API Monitoring</span>
        </div>
      </div>
    </div>
  );
}
