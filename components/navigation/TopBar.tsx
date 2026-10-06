'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Plus,
  Command,
  Wifi,
  WifiOff,
  Palette,
  Sun,
  Moon,
  Menu,
} from 'lucide-react';
import { globalScheduler } from '@/lib/monitoring/scheduler';
import { getPreferences, savePreferences } from '@/lib/storage/preferences';
import { ThemeName, AccentColor } from '@/lib/types';

interface TopBarProps {
  onOpenCommandPalette: () => void;
  onToggleMobileMenu?: () => void;
}

export function TopBar({ onOpenCommandPalette, onToggleMobileMenu }: TopBarProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [theme, setTheme] = useState<ThemeName>('oled');
  const [accent, setAccent] = useState<AccentColor>('cyan');

  useEffect(() => {
    const prefs = getPreferences();
    setTheme(prefs.theme || 'oled');
    setAccent(prefs.accent || 'cyan');

    const unsubscribe = globalScheduler.subscribe(() => {
      const status = globalScheduler.getStatus();
      setIsOnline(status.isOnline);
    });

    const handlePrefs = (e: any) => {
      if (e.detail) {
        setTheme(e.detail.theme);
        setAccent(e.detail.accent);
      }
    };
    window.addEventListener('pulse-preferences-changed', handlePrefs);

    return () => {
      unsubscribe();
      window.removeEventListener('pulse-preferences-changed', handlePrefs);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme: ThemeName = theme === 'midnight' ? 'oled' : theme === 'oled' ? 'carbon' : theme === 'carbon' ? 'slate' : 'midnight';
    setTheme(nextTheme);
    savePreferences({ theme: nextTheme });
    document.body.className = `theme-${nextTheme} accent-${accent} min-h-screen bg-background text-text-primary antialiased`;
  };

  return (
    <header className="h-16 border-b border-border bg-surface/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left Search Bar & Mobile Menu Button */}
      <div className="flex items-center gap-2 sm:gap-3">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
            title="Open navigation menu"
            aria-label="Open navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-muted hover:text-text-primary hover:border-text-secondary/30 transition-all duration-150 w-32 sm:w-60 text-left shadow-sm"
        >
          <Search className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          <span className="flex-1 truncate">Search...</span>
          <kbd className="hidden sm:inline-flex px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] font-mono text-text-secondary items-center gap-0.5">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Network indicator */}
        <div
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-medium ${
            isOnline
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
          title={isOnline ? 'Internet connection available' : 'Pulse connection unavailable'}
        >
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Quick Theme Switch */}
        <button
          onClick={toggleTheme}
          title={`Switch Theme (Current: ${theme})`}
          className="p-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
        >
          <Palette className="w-4 h-4" />
        </button>

        {/* Add Monitor Button */}
        <Link
          href="/dashboard/monitors/new"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-background font-semibold text-xs hover:bg-accent-hover transition-all duration-150 shadow-md shadow-accent/20 flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
          <span className="hidden sm:inline">Add Monitor</span>
        </Link>
      </div>
    </header>
  );
}
