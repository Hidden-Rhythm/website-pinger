'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  AlertOctagon,
  BarChart3,
  Settings,
  Download,
  Upload,
  Globe2,
  Server,
  Play,
  Pause,
  X,
  Palette,
  Bell,
} from 'lucide-react';
import { getMonitors, toggleMonitor } from '@/lib/storage/monitors';
import { exportAllData, downloadJsonFile } from '@/lib/storage/exportImport';
import { Monitor } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      getMonitors().then(setMonitors);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const staticCommands = [
    {
      id: 'add-monitor',
      title: 'Add New Monitor',
      category: 'Actions',
      icon: Plus,
      action: () => router.push('/dashboard/monitors/new'),
    },
    {
      id: 'view-incidents',
      title: 'Open Incidents',
      category: 'Navigation',
      icon: AlertOctagon,
      action: () => router.push('/dashboard/incidents'),
    },
    {
      id: 'view-analytics',
      title: 'Open Analytics',
      category: 'Navigation',
      icon: BarChart3,
      action: () => router.push('/dashboard/analytics'),
    },
    {
      id: 'view-status-pages',
      title: 'Open Status Pages',
      category: 'Navigation',
      icon: Globe2,
      action: () => router.push('/dashboard/status-pages'),
    },
    {
      id: 'view-notifications',
      title: 'Open Notifications & Webhook Integrations',
      category: 'Navigation',
      icon: Bell,
      action: () => router.push('/dashboard/notifications'),
    },
    {
      id: 'view-settings',
      title: 'Open Settings',
      category: 'Navigation',
      icon: Settings,
      action: () => router.push('/dashboard/settings'),
    },
    {
      id: 'export-data',
      title: 'Export Backup (JSON)',
      category: 'Data',
      icon: Download,
      action: async () => {
        const backup = await exportAllData(false);
        downloadJsonFile(`pulse-backup-${Date.now()}.json`, backup);
        toast('Backup downloaded successfully', 'success');
      },
    },
  ];

  const monitorCommands = monitors.map((m) => ({
    id: `mon-${m.id}`,
    title: `${m.name} (${m.url})`,
    category: 'Monitors',
    icon: Server,
    action: () => router.push(`/dashboard/monitors/${m.id}`),
  }));

  const filteredItems = useMemo(() => {
    const all = [...staticCommands, ...monitorCommands];
    if (!query.trim()) return all;
    return all.filter(
      (item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, monitorCommands]);

  const handleSelect = (item: (typeof filteredItems)[0]) => {
    item.action();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="glass-panel w-full max-w-xl rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-surface-secondary/40">
          <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command, monitor name, or URL..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
              } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
                e.preventDefault();
                handleSelect(filteredItems[selectedIndex]);
              }
            }}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-accent/15 text-accent font-medium'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="w-4 h-4 flex-shrink-0 text-text-muted" />
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-text-muted px-1.5 py-0.5 rounded bg-surface border border-border">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
