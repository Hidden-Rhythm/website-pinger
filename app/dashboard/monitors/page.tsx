'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  Filter,
  Plus,
  Play,
  Pause,
  Trash2,
  Download,
  ArrowUpDown,
  CheckSquare,
  Square,
  RefreshCw,
} from 'lucide-react';
import { getMonitors, toggleMonitor, deleteMonitor } from '@/lib/storage/monitors';
import { getAllRecentChecks } from '@/lib/storage/checks';
import { Monitor, CheckResult, MonitorStatus } from '@/lib/types';
import { MonitorCard } from '@/components/monitors/MonitorCard';
import { EmptyState } from '@/components/monitors/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { globalScheduler } from '@/lib/monitoring/scheduler';
import { downloadJsonFile } from '@/lib/storage/exportImport';

export default function MonitorsListPage() {
  const { toast } = useToast();
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [recentChecks, setRecentChecks] = useState<CheckResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'name' | 'responseTime' | 'lastChecked' | 'created'>('created');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadMonitors = useCallback(async () => {
    try {
      const [mList, cList] = await Promise.all([getMonitors(), getAllRecentChecks(200)]);
      setMonitors(Array.isArray(mList) ? mList : []);
      setRecentChecks(Array.isArray(cList) ? cList : []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMonitors();
    const unsub = globalScheduler.subscribe(loadMonitors);
    return () => unsub();
  }, [loadMonitors]);

  const filteredAndSorted = useMemo(() => {
    return monitors
      .filter((m) => {
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = m.name.toLowerCase().includes(q);
          const matchUrl = m.url.toLowerCase().includes(q);
          const matchTags = m.tags?.some((t) => t.toLowerCase().includes(q));
          if (!matchName && !matchUrl && !matchTags) return false;
        }
        if (statusFilter !== 'ALL' && m.status !== statusFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'responseTime') return (b.lastResponseTime || 0) - (a.lastResponseTime || 0);
        if (sortBy === 'lastChecked') return (b.lastCheckedAt || 0) - (a.lastCheckedAt || 0);
        return b.createdAt - a.createdAt;
      });
  }, [monitors, searchQuery, statusFilter, sortBy]);

  // Bulk action handlers
  const handleSelectAll = () => {
    if (selectedIds.length === filteredAndSorted.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSorted.map((m) => m.id));
    }
  };

  const handleBulkToggle = async (enable: boolean) => {
    try {
      await Promise.all(selectedIds.map((id) => toggleMonitor(id, enable)));
      toast(`Updated ${selectedIds.length} monitors`, 'success');
      loadMonitors();
    } catch {
      toast('Failed to update monitors', 'error');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedIds.map((id) => deleteMonitor(id)));
      toast(`Deleted ${selectedIds.length} monitors`, 'info');
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      loadMonitors();
    } catch {
      toast('Failed to delete monitors', 'error');
    }
  };

  const handleBulkExport = () => {
    const selectedMonitors = monitors.filter((m) => selectedIds.includes(m.id));
    downloadJsonFile(`pulse-monitors-export-${Date.now()}.json`, selectedMonitors);
    toast(`Exported ${selectedMonitors.length} monitors`, 'success');
  };

  // Group checks
  const checksByMonitor = recentChecks.reduce<Record<string, CheckResult[]>>((acc, c) => {
    if (!acc[c.monitorId]) acc[c.monitorId] = [];
    acc[c.monitorId].push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Monitors ({monitors.length})
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Manage your endpoints, view health cards, and run bulk operations
          </p>
        </div>
        <Link
          href="/dashboard/monitors/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-background font-semibold text-xs hover:bg-accent-hover transition-all shadow-md shadow-accent/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Monitor</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search by name, URL, or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="ALL">All Statuses</option>
            <option value="ONLINE">Online</option>
            <option value="DEGRADED">Degraded</option>
            <option value="DOWN">Down</option>
            <option value="PAUSED">Paused</option>
            <option value="UNMONITORED">Unmonitored</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted hidden sm:inline">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent"
          >
            <option value="created">Recently Created</option>
            <option value="name">Name (A-Z)</option>
            <option value="responseTime">Response Time</option>
            <option value="lastChecked">Last Checked</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar (if any selected) */}
      {selectedIds.length > 0 && (
        <div className="p-3 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-between animate-in slide-in-from-top-1 text-xs">
          <span className="font-semibold text-accent">
            {selectedIds.length} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkToggle(true)}
              className="px-2.5 py-1.5 rounded-lg bg-surface border border-border text-text-primary hover:bg-surface-secondary flex items-center gap-1.5"
            >
              <Play className="w-3 h-3 text-emerald-400" /> Resume
            </button>
            <button
              onClick={() => handleBulkToggle(false)}
              className="px-2.5 py-1.5 rounded-lg bg-surface border border-border text-text-primary hover:bg-surface-secondary flex items-center gap-1.5"
            >
              <Pause className="w-3 h-3 text-zinc-400" /> Pause
            </button>
            <button
              onClick={handleBulkExport}
              className="px-2.5 py-1.5 rounded-lg bg-surface border border-border text-text-primary hover:bg-surface-secondary flex items-center gap-1.5"
            >
              <Download className="w-3 h-3" /> Export
            </button>
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 flex items-center gap-1.5"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Monitor List Display */}
      {filteredAndSorted.length === 0 && !isLoading ? (
        <EmptyState
          title={searchQuery || statusFilter !== 'ALL' ? 'No matching monitors' : 'No monitors yet'}
          description={
            searchQuery || statusFilter !== 'ALL'
              ? 'Try adjusting your search terms or filter criteria.'
              : 'Add your first endpoint to begin monitoring response times and uptime.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAndSorted.map((m) => {
            const isSelected = selectedIds.includes(m.id);
            return (
              <div key={m.id} className="relative group">
                {/* Selection checkbox overlay */}
                <button
                  onClick={() => {
                    setSelectedIds((prev) =>
                      isSelected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                    );
                  }}
                  className={`absolute top-6 left-6 z-10 p-1 rounded-md transition-opacity ${
                    selectedIds.length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-accent" />
                  ) : (
                    <Square className="w-4 h-4 text-text-muted hover:text-text-primary" />
                  )}
                </button>
                <div className={selectedIds.length > 0 ? 'pl-6' : ''}>
                  <MonitorCard
                    monitor={m}
                    recentChecks={checksByMonitor[m.id] || []}
                    onRefresh={loadMonitors}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={showBulkDeleteConfirm}
        title={`Delete ${selectedIds.length} Monitors`}
        description="Are you sure you want to permanently delete all selected monitors and their history records from your browser storage?"
        confirmLabel="Delete All Selected"
        isDestructive={true}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />
    </div>
  );
}
