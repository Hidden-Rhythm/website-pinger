'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  LayoutDashboard,
  Server,
  AlertOctagon,
  BarChart3,
  Globe2,
  Bell,
  Settings,
  Radio,
  ExternalLink,
  Github,
  X,
} from 'lucide-react';
import { DiscordIcon } from '@/components/icons/SocialIcons';

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  onClose?: () => void;
}

export function Sidebar({ className = '', onNavigate, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/monitors', label: 'Monitors', icon: Server },
    { href: '/dashboard/incidents', label: 'Incidents', icon: AlertOctagon },
    { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/dashboard/status-pages', label: 'Status Pages', icon: Globe2 },
    { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`w-64 flex flex-col justify-between border-r border-border bg-surface h-screen sticky top-0 ${className}`}
    >
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border">
          <Link
            href="/"
            onClick={onNavigate}
            className="flex items-center gap-3 group transition-opacity"
            title="Go to Pulse Home"
          >
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-background shadow-lg shadow-accent/20 group-hover:scale-105 transition-transform">
              <Activity className="w-5 h-5 font-bold stroke-[2.5]" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-text-primary group-hover:text-accent transition-colors">
                PULSE
              </span>
              <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface-secondary text-text-muted border border-border">
                v1.0
              </span>
            </div>
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-secondary transition-colors"
              title="Close menu"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Status indicator */}
        <div className="px-4 py-3 border-b border-border bg-surface-secondary/50">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-text-secondary font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Monitoring Active
            </span>
            <Radio className="w-3.5 h-3.5 text-accent animate-pulse" />
          </div>
          <p className="text-[11px] text-text-muted mt-1 leading-snug">
            Checks run while tab is open.
          </p>
        </div>

        {/* Nav Links */}
        <nav className="p-3 space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-accent/10 text-accent border border-accent/25 font-semibold'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-accent' : 'text-text-muted'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Developer Contact */}
      <div className="p-4 border-t border-border space-y-3">
        <div className="p-3 rounded-xl bg-surface-secondary/70 border border-border text-xs">
          <div className="font-semibold text-text-primary mb-1 flex items-center justify-between">
            <span>Zero Database</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </div>
          <div className="text-[11px] text-text-muted leading-relaxed">
            All monitors & checks saved in local IndexedDB.
          </div>
        </div>

        {/* Developer Contact */}
        <div className="pt-1 flex items-center justify-between text-[11px] text-text-muted px-0.5">
          <a
            href="https://github.com/Hidden-Rhythm"
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-1.5 hover:text-text-primary transition-colors font-medium"
            title="GitHub: Hidden-Rhythm"
          >
            <Github className="w-3.5 h-3.5" />
            <span>Hidden-Rhythm</span>
          </a>
          <span
            className="flex items-center gap-1 font-mono text-[10px] text-text-secondary bg-surface-secondary px-2 py-0.5 rounded-md border border-border"
            title="Discord: hidden-rhythm"
          >
            <DiscordIcon className="w-3 h-3 text-[#5865F2]" />
            <span>hidden-rhythm</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
