'use client';

import React from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Zap,
  Bell,
  BarChart3,
  Globe2,
  HardDrive,
  CheckCircle2,
  Lock,
  Radio,
  Clock,
  Sparkles,
  Github,
  Send,
  Share2,
  ExternalLink,
} from 'lucide-react';
import { DiscordIcon } from '@/components/icons/SocialIcons';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary selection:bg-accent/20 selection:text-accent scroll-smooth">
      {/* Navigation Header */}
      <header className="h-16 border-b border-border/60 bg-surface/80 backdrop-blur-md px-6 md:px-12 flex items-center justify-between sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-3 hover:opacity-85 transition-opacity" title="Pulse Home">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-background shadow-lg shadow-accent/20">
            <Activity className="w-5 h-5 font-bold stroke-[2.5]" />
          </div>
          <span className="font-bold text-lg tracking-tight text-text-primary">PULSE</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-text-secondary">
          <a href="#features" className="hover:text-text-primary transition-colors">
            Features
          </a>
          <a href="#architecture" className="hover:text-text-primary transition-colors">
            Zero-Database
          </a>
          <a href="#notifications" className="hover:text-text-primary transition-colors">
            Integrations
          </a>
          <a href="#status-pages" className="hover:text-text-primary transition-colors">
            Status Pages
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="https://github.com/Hidden-Rhythm"
            target="_blank"
            rel="noreferrer noopener"
            className="p-2 rounded-xl border border-border bg-surface-secondary/70 hover:bg-surface-secondary text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2 text-xs"
            title="GitHub - Hidden-Rhythm"
          >
            <Github className="w-4 h-4" />
            <span className="hidden sm:inline font-mono">GitHub</span>
          </a>
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-xl bg-accent text-background font-bold text-xs hover:bg-accent-hover transition-all duration-150 shadow-md shadow-accent/25"
          >
            Open Pulse
          </Link>
        </div>
      </header>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden flex items-center justify-around border-b border-border bg-surface/90 backdrop-blur-md px-4 py-2 text-[11px] font-medium text-text-secondary sticky top-16 z-40 overflow-x-auto">
        <a href="#features" className="hover:text-text-primary px-2 py-1">
          Features
        </a>
        <a href="#architecture" className="hover:text-text-primary px-2 py-1">
          Zero-DB
        </a>
        <a href="#notifications" className="hover:text-text-primary px-2 py-1">
          Integrations
        </a>
        <a href="#status-pages" className="hover:text-text-primary px-2 py-1">
          Status Pages
        </a>
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-6 md:px-12 max-w-6xl mx-auto text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-secondary border border-border text-xs text-text-secondary mb-8 shadow-inner animate-in fade-in">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-medium">100% Database-Free Architecture</span>
          <span className="text-text-muted">•</span>
          <span className="text-accent font-semibold">Your Browser is the Source of Truth</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-text-primary max-w-4xl mx-auto leading-[1.1]">
          Know when your website goes down.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto mt-6 leading-relaxed">
          Monitor websites and APIs, track response times and uptime, and get notified via Discord or Slack when something changes.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-accent text-background font-bold text-sm hover:bg-accent-hover transition-all duration-150 shadow-xl shadow-accent/25 flex items-center justify-center gap-2"
          >
            <span>Open Pulse</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard/monitors/new"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-surface-secondary border border-border text-text-primary font-semibold text-sm hover:bg-surface-tertiary transition-all flex items-center justify-center gap-2"
          >
            <span>Add Monitor</span>
          </Link>
        </div>

        {/* Honest Limitation Disclaimer */}
        <p className="text-xs text-text-muted mt-6 font-mono">
          Monitoring is active while Pulse is open in your browser • No credit card, no sign-up, zero cloud database.
        </p>

        {/* Product UI Preview Mockup */}
        <div className="mt-16 glass-panel rounded-2xl border border-border/80 shadow-2xl p-4 sm:p-6 text-left relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="text-xs text-text-muted font-mono ml-2">pulse.app/dashboard</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <Radio className="w-3.5 h-3.5 animate-pulse" /> Live Telemetry
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-surface-secondary border border-border">
              <div className="text-[10px] text-text-muted uppercase">Status</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">Online (99.98%)</div>
            </div>
            <div className="p-3 rounded-xl bg-surface-secondary border border-border">
              <div className="text-[10px] text-text-muted uppercase">Avg Latency</div>
              <div className="text-sm font-bold text-accent mt-0.5">142 ms</div>
            </div>
            <div className="p-3 rounded-xl bg-surface-secondary border border-border">
              <div className="text-[10px] text-text-muted uppercase">P95 Percentile</div>
              <div className="text-sm font-bold text-text-primary mt-0.5">188 ms</div>
            </div>
            <div className="p-3 rounded-xl bg-surface-secondary border border-border">
              <div className="text-[10px] text-text-muted uppercase">Storage</div>
              <div className="text-sm font-bold text-text-secondary mt-0.5">IndexedDB</div>
            </div>
          </div>

          <div className="h-28 w-full rounded-xl bg-surface-secondary/60 border border-border flex items-end p-3 gap-1 overflow-hidden">
            {[42, 45, 38, 55, 48, 40, 52, 60, 41, 39, 45, 47, 50, 42, 38, 54, 49, 42, 44, 41, 46, 51, 40, 43].map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className="flex-1 bg-accent/40 hover:bg-accent rounded-t transition-all"
              />
            ))}
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-20 px-6 md:px-12 max-w-6xl mx-auto border-t border-border">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest">
            Engineering Precision
          </h2>
          <p className="text-3xl font-extrabold text-text-primary mt-2">
            Built for developers who value sovereignty and privacy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6 rounded-2xl border border-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
              <HardDrive className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-primary">Zero Cloud Database</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Pulse uses IndexedDB for monitors, checks, and incidents, and localStorage for settings. Your data never touches a hosted database.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-primary">SSRF Protection</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Every check resolves DNS and validates against private IPv4/IPv6, loopbacks, and cloud metadata before opening sockets.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-primary">Multi-Type Probing</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Support for HTTP status validation, keyword matching, safe JSON field assertions, and SSL certificate expiration tracking.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-primary">Instant Webhooks</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Automated notifications for Discord, Slack, and generic webhooks formatted with status codes, downtime duration, and recovery alerts.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-primary">Honest Telemetry</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Uptime strictly reflects actual checks performed while Pulse is open, clearly differentiating monitored vs unmonitored time.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Globe2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-primary">Portable Status Pages</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Create local status pages or generate portable encoded URLs to share service health snapshots with zero credentials leaked.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture Deep Dive */}
      <section id="architecture" className="py-20 px-6 md:px-12 max-w-5xl mx-auto border-t border-border">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-border relative overflow-hidden">
          <div className="max-w-2xl space-y-4">
            <span className="text-xs font-mono text-accent font-bold uppercase tracking-wider">
              Architecture Model
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary">
              Your monitoring configuration stays in your browser.
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Pulse uses a stateless Python backend to execute HTTP requests and check SSL certificates without risking SSRF attacks. The backend discards all request data immediately after returning latency and status codes.
            </p>
            <div className="pt-4 flex flex-wrap gap-4 text-xs font-mono text-text-muted">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No Supabase
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No PostgreSQL
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No Redis
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No SQLite
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations & Notifications Section */}
      <section id="notifications" className="py-20 px-6 md:px-12 max-w-6xl mx-auto border-t border-border scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest">
            Notifications & Integrations
          </h2>
          <p className="text-3xl font-extrabold text-text-primary mt-2">
            Instant Alerts Everywhere You Work
          </p>
          <p className="text-xs text-text-secondary mt-3 leading-relaxed">
            Configure Discord webhooks, Slack channels, or generic endpoints. All credentials remain stored privately in your browser IndexedDB and dispatched securely with SSRF validation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Discord Card */}
          <div className="glass-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#5865F2]/10 text-[#5865F2] flex items-center justify-center mb-4">
                <DiscordIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary">Discord Webhooks</h3>
              <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                Color-coded embeds with downtime duration, response latency, timestamp, and instant resolution notifications when service recovers.
              </p>
              <div className="mt-4 p-3 rounded-xl bg-surface-secondary/70 border border-border font-mono text-[11px] text-text-secondary space-y-1">
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-sans mb-1 flex items-center justify-between">
                  <span>Example Bot Alert</span>
                  <span className="text-emerald-400">Preview</span>
                </div>
                <div className="text-emerald-400 font-semibold">[RESOLVED] API Gateway Operational</div>
                <div>Status: 200 OK</div>
                <div>Avg Latency: 42 ms</div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-border">
              <Link
                href="/dashboard/notifications"
                className="text-xs font-semibold text-accent hover:text-accent-hover inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Add Discord Webhook</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Slack Card */}
          <div className="glass-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-[#4A154B]/10 text-[#E01E5A] flex items-center justify-center mb-4">
                <Bell className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary">Slack Alerts</h3>
              <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                Clean Slack block kit alerts sent directly into your team channels. Get notified within seconds of consecutive failures.
              </p>
              <div className="mt-4 p-3 rounded-xl bg-surface-secondary/70 border border-border font-mono text-[11px] text-text-secondary space-y-1">
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-sans mb-1 flex items-center justify-between">
                  <span>Example Slack Notification</span>
                  <span className="text-emerald-400">Preview</span>
                </div>
                <div className="text-emerald-400 font-semibold">[RECOVERED] Database Health Check</div>
                <div>Response Time: 68 ms</div>
                <div>Consecutive Checks: 5/5 Healthy</div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-border">
              <Link
                href="/dashboard/notifications"
                className="text-xs font-semibold text-accent hover:text-accent-hover inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Add Slack Webhook</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Custom Webhook Card */}
          <div className="glass-panel p-6 rounded-2xl border border-border flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Send className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-text-primary">Custom HTTP Webhooks</h3>
              <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                Connect PagerDuty, Opsgenie, n8n, Zapier, or your own incident listener with customizable JSON payloads.
              </p>
              <div className="mt-4 p-3 rounded-xl bg-surface-secondary/70 border border-border font-mono text-[11px] text-text-secondary space-y-1">
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-sans mb-1 flex items-center justify-between">
                  <span>Example JSON Payload</span>
                  <span className="text-accent">Preview</span>
                </div>
                <div className="text-accent font-semibold">&#123; &quot;event&quot;: &quot;SERVICE_HEALTHY&quot; &#125;</div>
                <div>Custom headers supported</div>
                <div>SSRF validated dispatch</div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-border">
              <Link
                href="/dashboard/notifications"
                className="text-xs font-semibold text-accent hover:text-accent-hover inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Configure Webhooks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/dashboard/notifications"
            className="px-6 py-3 rounded-xl bg-surface-secondary border border-border hover:border-accent/40 font-bold text-xs text-text-primary inline-flex items-center gap-2 hover:bg-surface-tertiary transition-all"
          >
            <Bell className="w-4 h-4 text-accent" />
            <span>Open Notification Channels Dashboard</span>
          </Link>
        </div>
      </section>

      {/* Status Pages Section */}
      <section id="status-pages" className="py-20 px-6 md:px-12 max-w-6xl mx-auto border-t border-border scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-bold text-accent uppercase tracking-widest">
            Public Status Pages
          </h2>
          <p className="text-3xl font-extrabold text-text-primary mt-2">
            Build & Share Real-Time Status Dashboards
          </p>
          <p className="text-xs text-text-secondary mt-3 leading-relaxed">
            Create public status dashboards for your audience without setting up an external database. Share local pages via URL slugs or export self-contained portable encrypted links.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-6">
            <div className="glass-panel p-6 rounded-2xl border border-border space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center font-bold">
                  1
                </div>
                <h3 className="text-sm font-bold text-text-primary">Local Status Pages (/status/[slug])</h3>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Group monitors by service category, customize description, accent color, and display live uptime metrics directly from browser IndexedDB.
              </p>
            </div>

            <div className="glass-panel p-6 rounded-2xl border border-border space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold">
                  2
                </div>
                <h3 className="text-sm font-bold text-text-primary">Portable Sharable Links (/status?config=...)</h3>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Generate compact base64-encoded URLs containing service health snapshots. Anyone with the link can view your status page on any device with zero server storage.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/dashboard/status-pages"
                className="px-6 py-3 rounded-xl bg-accent text-background font-bold text-xs hover:bg-accent-hover transition-all shadow-md shadow-accent/20 inline-flex items-center gap-2"
              >
                <Globe2 className="w-4 h-4" />
                <span>Launch Status Page Builder</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Interactive Status Page Preview */}
          <div className="glass-panel rounded-2xl p-6 border border-border space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-text-primary">Acme Cloud Status</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Operational
              </span>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>All Systems Operational</span>
            </div>

            <div className="space-y-2 pt-2">
              {[
                { name: 'API Gateway', status: 'Online', ms: '84 ms' },
                { name: 'Web Application', status: 'Online', ms: '112 ms' },
                { name: 'Payment Webhook', status: 'Online', ms: '146 ms' },
              ].map((svc) => (
                <div
                  key={svc.name}
                  className="p-3 rounded-xl bg-surface-secondary border border-border flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-text-primary">{svc.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-text-muted">{svc.ms}</span>
                    <span className="text-[11px] text-emerald-400 font-semibold">{svc.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 px-6 md:px-12 text-center max-w-4xl mx-auto border-t border-border">
        <h2 className="text-3xl sm:text-5xl font-black text-text-primary tracking-tight">
          Ready to monitor your services?
        </h2>
        <p className="text-sm text-text-secondary max-w-lg mx-auto mt-4 leading-relaxed">
          Launch Pulse in seconds. No account registration or server provisioning needed.
        </p>
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="px-8 py-3.5 rounded-xl bg-accent text-background font-bold text-sm hover:bg-accent-hover transition-all shadow-xl shadow-accent/25 inline-flex items-center gap-2"
          >
            <span>Launch Pulse Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 md:px-12 text-center text-xs text-text-muted flex flex-col md:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
          <span className="font-semibold text-text-primary">Pulse</span>
          <span className="hidden sm:inline">•</span>
          <span>Advanced Database-Free Website Monitoring Platform</span>
        </div>

        {/* Developer Contact Details */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-text-secondary">
          <a
            href="https://github.com/Hidden-Rhythm"
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1.5 hover:text-text-primary transition-colors text-xs font-medium"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Hidden-Rhythm</span>
          </a>

          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-secondary border border-border text-[11px] font-mono text-text-primary"
            title="Discord Username: hidden-rhythm"
          >
            <DiscordIcon className="w-3.5 h-3.5 text-[#5865F2]" />
            <span>hidden-rhythm</span>
          </div>

          <div className="h-3 w-px bg-border hidden sm:block" />

          <Link href="/dashboard" className="hover:text-text-primary">
            Dashboard
          </Link>
          <Link href="/dashboard/notifications" className="hover:text-text-primary">
            Integrations
          </Link>
          <Link href="/dashboard/status-pages" className="hover:text-text-primary">
            Status Pages
          </Link>
          <Link href="/dashboard/settings" className="hover:text-text-primary">
            Settings
          </Link>
        </div>
      </footer>
    </div>
  );
}
