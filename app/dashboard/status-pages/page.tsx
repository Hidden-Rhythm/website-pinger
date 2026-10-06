'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Globe2,
  Plus,
  ExternalLink,
  Trash2,
  Share2,
  Check,
  Copy,
  Sliders,
  Server,
} from 'lucide-react';
import { getStatusPages, saveStatusPage, deleteStatusPage } from '@/lib/storage/statusPages';
import { getMonitors } from '@/lib/storage/monitors';
import { StatusPageConfig, Monitor } from '@/lib/types';
import { EmptyState } from '@/components/monitors/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

export default function StatusPagesManagement() {
  const { toast } = useToast();
  const [pages, setPages] = useState<StatusPageConfig[]>([]);
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // New status page state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [accentColor, setAccentColor] = useState('cyan');
  const [selectedMonitors, setSelectedMonitors] = useState<string[]>([]);
  const [showUptime, setShowUptime] = useState(true);
  const [showIncidents, setShowIncidents] = useState(true);

  const loadAll = async () => {
    const [pList, mList] = await Promise.all([getStatusPages(), getMonitors()]);
    setPages(pList);
    setMonitors(mList);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleCreate = async () => {
    if (!title.trim() || !slug.trim()) {
      toast('Title and URL slug are required', 'error');
      return;
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    const newPage: StatusPageConfig = {
      id: `sp_${Date.now()}`,
      slug: cleanSlug,
      title: title.trim(),
      description: description.trim(),
      monitors: selectedMonitors,
      accentColor,
      showUptime,
      showIncidents,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      await saveStatusPage(newPage);
      toast('Status page created!', 'success');
      setIsModalOpen(false);
      setTitle('');
      setSlug('');
      setDescription('');
      setSelectedMonitors([]);
      loadAll();
    } catch (err: any) {
      toast(`Failed to save: ${err.message}`, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteStatusPage(deleteTargetId);
      toast('Status page removed', 'info');
      setDeleteTargetId(null);
      loadAll();
    } catch {
      toast('Failed to delete', 'error');
    }
  };

  const handleCopyShareLink = (page: StatusPageConfig) => {
    // Generate portable shareable config payload
    const selectedMonitorData = monitors
      .filter((m) => page.monitors.includes(m.id))
      .map((m) => ({
        name: m.name,
        url: m.url,
        status: m.status,
        responseTime: m.lastResponseTime,
      }));

    const portableData = {
      title: page.title,
      description: page.description,
      monitors: selectedMonitorData,
      accent: page.accentColor,
      generatedAt: Date.now(),
    };

    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(portableData))));
    const shareUrl = `${window.location.origin}/status?config=${encoded}`;

    navigator.clipboard.writeText(shareUrl);
    toast('Portable share link copied to clipboard!', 'success');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Status Pages ({pages.length})
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Build public-facing status dashboards for your users and teammates
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-background font-semibold text-xs hover:bg-accent-hover transition-all shadow-md shadow-accent/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Create Status Page</span>
        </button>
      </div>

      {/* Pages List */}
      {pages.length === 0 ? (
        <EmptyState
          title="No status pages created."
          description="Create your first status page to display uptime and services to your audience."
          icon={Globe2}
          actionLabel="Create Status Page"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pages.map((p) => (
            <div key={p.id} className="glass-panel rounded-2xl p-6 border border-border space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold text-base text-text-primary">{p.title}</h3>
                  <div className="text-xs font-mono text-accent mt-0.5">/status/{p.slug}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopyShareLink(p)}
                    title="Copy Portable Share Link"
                    className="p-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href={`/status/${p.slug}`}
                    target="_blank"
                    className="p-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => setDeleteTargetId(p.id)}
                    className="p-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {p.description && (
                <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
                  {p.description}
                </p>
              )}

              <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
                <span>{p.monitors.length} Monitors included</span>
                <span className="capitalize">Theme Accent: {p.accentColor}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-border space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-text-primary">Create New Status Page</h2>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Title</label>
              <input
                type="text"
                placeholder="e.g. Acme Corp System Status"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                URL Slug (/status/[slug])
              </label>
              <input
                type="text"
                placeholder="acme-status"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Description
              </label>
              <textarea
                rows={2}
                placeholder="Official service status updates for Acme customers."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Select Monitors to Display
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 rounded-xl bg-surface-secondary border border-border">
                {monitors.map((m) => {
                  const isChecked = selectedMonitors.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMonitors((prev) => [...prev, m.id]);
                          else setSelectedMonitors((prev) => prev.filter((id) => id !== m.id));
                        }}
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      <span className="font-medium text-text-primary truncate">{m.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-secondary border border-border"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-accent text-background hover:bg-accent-hover"
              >
                Create Status Page
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Delete Status Page"
        description="Are you sure you want to delete this status page configuration from your browser storage?"
        confirmLabel="Delete Page"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
