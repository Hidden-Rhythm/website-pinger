'use client';

import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Send,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { getIntegrations, saveIntegration, deleteIntegration, maskWebhookUrl } from '@/lib/storage/integrations';
import { Integration, IntegrationType, NotificationEvent } from '@/lib/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { EmptyState } from '@/components/monitors/EmptyState';

const ALL_EVENTS: { id: NotificationEvent; label: string; desc: string }[] = [
  { id: 'MONITOR_DOWN', label: 'Monitor Down', desc: 'When consecutive failures breach threshold' },
  { id: 'MONITOR_RECOVERED', label: 'Monitor Recovered', desc: 'When service recovers and incident closes' },
  { id: 'MONITOR_DEGRADED', label: 'Monitor Degraded', desc: 'When slow response time threshold exceeded' },
  { id: 'SLOW_RESPONSE', label: 'Slow Response', desc: 'When latency triggers warning' },
  { id: 'SSL_EXPIRING', label: 'SSL Expiring', desc: 'When certificate expires in under 14 days' },
  { id: 'SSL_EXPIRED', label: 'SSL Expired', desc: 'When TLS certificate has expired' },
  { id: 'STATUS_CHANGED', label: 'Status Changed', desc: 'Any state transition' },
  { id: 'INCIDENT_CREATED', label: 'Incident Created', desc: 'New outage ticket logged' },
  { id: 'INCIDENT_RESOLVED', label: 'Incident Resolved', desc: 'Outage marked resolved' },
];

export default function NotificationsPage() {
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<IntegrationType>('discord');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<NotificationEvent[]>([
    'MONITOR_DOWN',
    'MONITOR_RECOVERED',
    'INCIDENT_CREATED',
    'INCIDENT_RESOLVED',
  ]);
  const [customTemplate, setCustomTemplate] = useState('');

  const loadData = async () => {
    const list = await getIntegrations();
    setIntegrations(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async () => {
    if (!name.trim() || !webhookUrl.trim()) {
      toast('Name and Webhook URL are required', 'error');
      return;
    }

    try {
      new URL(webhookUrl.trim());
    } catch {
      toast('Invalid URL format', 'error');
      return;
    }

    const newIntegration: Integration = {
      id: `intg_${Date.now()}`,
      name: name.trim(),
      type,
      webhookUrl: webhookUrl.trim(),
      enabled: true,
      events: selectedEvents,
      customTemplate: customTemplate.trim() || undefined,
      createdAt: Date.now(),
    };

    try {
      await saveIntegration(newIntegration);
      toast('Integration saved to IndexedDB!', 'success');
      setIsModalOpen(false);
      setName('');
      setWebhookUrl('');
      setCustomTemplate('');
      loadData();
    } catch (err: any) {
      toast(`Failed to save: ${err.message}`, 'error');
    }
  };

  const handleTest = async (intg: Integration) => {
    setTestingId(intg.id);
    try {
      const res = await fetch('/api/webhook/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integration_type: intg.type,
          webhook_url: intg.webhookUrl,
          custom_template: intg.customTemplate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast(`Test notification sent successfully to ${intg.type}!`, 'success');
      } else {
        toast(`Test failed: ${data.error || 'Server rejected webhook'}`, 'error');
      }
    } catch (err: any) {
      toast(`Network error testing webhook: ${err.message}`, 'error');
    } finally {
      setTestingId(null);
    }
  };

  const handleToggle = async (intg: Integration) => {
    try {
      await saveIntegration({ ...intg, enabled: !intg.enabled });
      loadData();
    } catch {
      toast('Failed to toggle integration', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteIntegration(deleteTargetId);
      toast('Integration removed', 'info');
      setDeleteTargetId(null);
      loadData();
    } catch {
      toast('Failed to delete integration', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Alerts & Webhooks ({integrations.length})
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Dispatch downtime and recovery alerts to Discord, Slack, and custom webhooks
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-background font-semibold text-xs hover:bg-accent-hover transition-all shadow-md shadow-accent/20 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Add Integration</span>
        </button>
      </div>

      {/* Security notice */}
      <div className="p-4 rounded-2xl bg-surface-secondary border border-border flex items-center gap-3 text-xs">
        <ShieldAlert className="w-4 h-4 text-accent flex-shrink-0" />
        <span className="text-text-secondary">
          Webhook URLs are stored exclusively in your local browser IndexedDB and masked upon creation. Destination hosts are strictly validated against SSRF before every dispatch.
        </span>
      </div>

      {/* Integrations List */}
      {integrations.length === 0 ? (
        <EmptyState
          title="No notification channels configured."
          description="Add a Discord or Slack webhook to receive instant notifications when your websites go down."
          icon={Bell}
          actionLabel="Add Webhook"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map((intg) => {
            const isTesting = testingId === intg.id;
            return (
              <div
                key={intg.id}
                className={`glass-panel rounded-2xl p-6 border transition-all ${
                  intg.enabled ? 'border-border' : 'border-border/40 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-text-primary">{intg.name}</h3>
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-secondary border border-border text-accent font-semibold">
                        {intg.type}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-text-muted mt-1 truncate max-w-xs">
                      {maskWebhookUrl(intg.webhookUrl)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTest(intg)}
                      disabled={isTesting}
                      title="Test Webhook Notification"
                      className="p-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors disabled:opacity-50"
                    >
                      <Send className={`w-3.5 h-3.5 ${isTesting ? 'animate-pulse text-accent' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleToggle(intg)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        intg.enabled
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                      }`}
                    >
                      {intg.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      onClick={() => setDeleteTargetId(intg.id)}
                      className="p-2 rounded-xl bg-surface-secondary border border-border text-text-secondary hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Subscribed events tags */}
                <div className="pt-3 border-t border-border">
                  <div className="text-[11px] text-text-muted mb-2 font-medium">
                    Subscribed Events ({intg.events.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {intg.events.map((ev) => (
                      <span
                        key={ev}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-secondary text-text-secondary border border-border"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 border border-border space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-text-primary">Add Notification Integration</h2>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Integration Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['discord', 'slack', 'webhook'] as IntegrationType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all ${
                      type === t
                        ? 'border-accent bg-accent/15 text-accent'
                        : 'border-border bg-surface-secondary text-text-secondary'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Name</label>
              <input
                type="text"
                placeholder="e.g. Core Ops Discord Channel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Webhook URL <span className="text-rose-400">*</span>
              </label>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary font-mono focus:outline-none focus:border-accent"
              />
              <p className="text-[11px] text-text-muted mt-1">
                Will be masked after saving. SSRF protection applies to this destination.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Trigger Events
              </label>
              <div className="space-y-1.5 max-h-40 overflow-y-auto p-2 rounded-xl bg-surface-secondary border border-border">
                {ALL_EVENTS.map((ev) => {
                  const isChecked = selectedEvents.includes(ev.id);
                  return (
                    <label
                      key={ev.id}
                      className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedEvents((prev) => [...prev, ev.id]);
                          else setSelectedEvents((prev) => prev.filter((id) => id !== ev.id));
                        }}
                        className="rounded border-border text-accent focus:ring-accent"
                      />
                      <span className="font-medium text-text-primary">{ev.label}</span>
                      <span className="text-[10px] text-text-muted">({ev.desc})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Custom Message Template (Optional)
              </label>
              <input
                type="text"
                placeholder="Notice: {{monitor_name}} status is {{status}}."
                value={customTemplate}
                onChange={(e) => setCustomTemplate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs text-text-primary focus:outline-none focus:border-accent font-mono"
              />
              <p className="text-[10px] text-text-muted mt-1 font-mono">
                Variables: &#123;&#123;monitor_name&#125;&#125;, &#123;&#123;status&#125;&#125;, &#123;&#123;response_time&#125;&#125;, &#123;&#123;downtime&#125;&#125;
              </p>
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
                onClick={handleSave}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-accent text-background hover:bg-accent-hover"
              >
                Save Integration
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTargetId}
        title="Delete Notification Integration"
        description="Are you sure you want to remove this webhook configuration from your browser storage?"
        confirmLabel="Delete Webhook"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  );
}
