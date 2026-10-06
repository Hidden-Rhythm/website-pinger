'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Download,
  Upload,
  Trash2,
  Palette,
  Shield,
  Info,
  Clock,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
  Github,
  ExternalLink,
} from 'lucide-react';
import { DiscordIcon } from '@/components/icons/SocialIcons';
import {
  getPreferences,
  savePreferences,
  resetPreferences,
  DEFAULT_PREFERENCES,
} from '@/lib/storage/preferences';
import {
  exportAllData,
  downloadJsonFile,
  exportChecksToCsv,
  validateImportPayload,
  executeImport,
  clearAllPulseData,
  ImportPreviewResult,
} from '@/lib/storage/exportImport';
import { clearAllChecks, getAllRecentChecks } from '@/lib/storage/checks';
import { clearAllIncidents } from '@/lib/storage/incidents';
import { getMonitors } from '@/lib/storage/monitors';
import { UserPreferences, ThemeName, AccentColor } from '@/lib/types';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

export default function SettingsPage() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<'appearance' | 'monitoring' | 'data' | 'security' | 'about'>('appearance');
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);

  // Import preview state
  const [importJson, setImportJson] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreviewResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Clear dialog state
  const [confirmClearType, setConfirmClearType] = useState<'checks' | 'incidents' | 'all' | null>(null);

  useEffect(() => {
    setPrefs(getPreferences());
  }, []);

  const handleUpdatePref = (updates: Partial<UserPreferences>) => {
    const updated = savePreferences(updates);
    setPrefs(updated);

    // Apply classes to document body
    if (updates.theme || updates.accent) {
      const themeClass = `theme-${updated.theme}`;
      const accentClass = `accent-${updated.accent}`;
      document.body.className = `${themeClass} ${accentClass} min-h-screen bg-background text-text-primary antialiased`;
    }
    toast('Preferences updated', 'success');
  };

  const handleExportBackup = async () => {
    try {
      const payload = await exportAllData(false);
      downloadJsonFile(`pulse-backup-${Date.now()}.json`, payload);
      toast('Backup exported successfully', 'success');
    } catch {
      toast('Failed to export backup', 'error');
    }
  };

  const handleExportCsv = async () => {
    try {
      const [checks, monitors] = await Promise.all([getAllRecentChecks(5000), getMonitors()]);
      const nameMap: Record<string, string> = {};
      monitors.forEach((m) => (nameMap[m.id] = m.name));
      exportChecksToCsv(checks, nameMap);
      toast('CSV check telemetry downloaded', 'success');
    } catch {
      toast('Failed to export CSV', 'error');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJson(content);
      const preview = validateImportPayload(content);
      setImportPreview(preview);
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (!importJson) return;
    setIsImporting(true);
    try {
      await executeImport(importJson);
      toast('Backup imported into IndexedDB!', 'success');
      setImportJson(null);
      setImportPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      toast(`Import failed: ${err.message}`, 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleClearHistory = async () => {
    try {
      await clearAllChecks();
      toast('Check history cleared', 'info');
      setConfirmClearType(null);
    } catch {
      toast('Failed to clear checks', 'error');
    }
  };

  const handleClearIncidents = async () => {
    try {
      await clearAllIncidents();
      toast('Incidents cleared', 'info');
      setConfirmClearType(null);
    } catch {
      toast('Failed to clear incidents', 'error');
    }
  };

  const handleClearEverything = async () => {
    try {
      await clearAllPulseData();
      toast('All local browser data permanently erased', 'info');
      setConfirmClearType(null);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch {
      toast('Failed to reset data', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Settings</h1>
        <p className="text-xs text-text-secondary mt-1">
          Customize themes, monitoring intervals, backups, and data retention
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3 overflow-x-auto text-xs font-semibold">
        {[
          { id: 'appearance', label: 'Appearance & Themes', icon: Palette },
          { id: 'monitoring', label: 'Monitoring Limits', icon: Sliders },
          { id: 'data', label: 'Data & Backup', icon: Download },
          { id: 'security', label: 'Security & SSRF', icon: Shield },
          { id: 'about', label: 'About Pulse', icon: Info },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-accent/15 text-accent border border-accent/25 font-bold shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-secondary'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Appearance */}
      {activeTab === 'appearance' && (
        <div className="space-y-6 max-w-2xl">
          {/* Themes */}
          <div className="glass-panel rounded-2xl p-6 border border-border space-y-4">
            <h3 className="text-sm font-bold text-text-primary">Theme</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { id: 'midnight', label: 'Midnight', bg: 'bg-[#050505]', border: 'border-[#1E1E22]' },
                { id: 'carbon', label: 'Carbon', bg: 'bg-[#111113]', border: 'border-[#2C2C32]' },
                { id: 'oled', label: 'OLED Black', bg: 'bg-[#000000]', border: 'border-[#181818]' },
                { id: 'slate', label: 'Slate', bg: 'bg-[#0B0F17]', border: 'border-[#374151]' },
                { id: 'light', label: 'Light', bg: 'bg-[#F8FAFC]', border: 'border-[#CBD5E1]' },
              ].map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => handleUpdatePref({ theme: th.id as ThemeName })}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    prefs.theme === th.id
                      ? 'border-accent ring-2 ring-accent/30'
                      : 'border-border hover:border-text-secondary/30'
                  }`}
                >
                  <div className={`w-full h-8 rounded-lg mb-2 ${th.bg} border ${th.border}`} />
                  <div className="text-xs font-semibold text-text-primary">{th.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div className="glass-panel rounded-2xl p-6 border border-border space-y-4">
            <h3 className="text-sm font-bold text-text-primary">Accent Color</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { id: 'cyan', label: 'Cyan', hex: '#06B6D4' },
                { id: 'violet', label: 'Violet', hex: '#8B5CF6' },
                { id: 'blue', label: 'Blue', hex: '#3B82F6' },
                { id: 'emerald', label: 'Emerald', hex: '#10B981' },
                { id: 'amber', label: 'Amber', hex: '#F59E0B' },
                { id: 'rose', label: 'Rose', hex: '#F43F5E' },
              ].map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleUpdatePref({ accent: acc.id as AccentColor })}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    prefs.accent === acc.id
                      ? 'border-accent ring-2 ring-accent/30'
                      : 'border-border hover:border-text-secondary/30'
                  }`}
                >
                  <div
                    className="w-full h-6 rounded-md mb-2 mx-auto"
                    style={{ backgroundColor: acc.hex }}
                  />
                  <div className="text-xs font-medium text-text-primary">{acc.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Density & Animation */}
          <div className="glass-panel rounded-2xl p-6 border border-border space-y-4">
            <h3 className="text-sm font-bold text-text-primary">UI Density & Animations</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-text-primary">Layout Density</div>
                <div className="text-[11px] text-text-muted">Adjust padding and item spacing</div>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-secondary border border-border">
                {(['comfortable', 'compact'] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleUpdatePref({ density: d })}
                    className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                      prefs.density === d
                        ? 'bg-accent text-background font-bold'
                        : 'text-text-muted hover:text-text-primary'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div>
                <div className="text-xs font-semibold text-text-primary">Motion & Animations</div>
                <div className="text-[11px] text-text-muted">Enable smooth page and card transitions</div>
              </div>
              <input
                type="checkbox"
                checked={prefs.animations}
                onChange={(e) => handleUpdatePref({ animations: e.target.checked })}
                className="rounded border-border text-accent focus:ring-accent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Monitoring */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6 max-w-2xl">
          <div className="glass-panel rounded-2xl p-6 border border-border space-y-4">
            <h3 className="text-sm font-bold text-text-primary">Telemetry Data Retention</h3>
            <p className="text-xs text-text-secondary">
              Pulse automatically purges raw check records older than this retention threshold to preserve browser storage efficiency.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[7, 14, 30, 60, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => handleUpdatePref({ retentionDays: days })}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    prefs.retentionDays === days
                      ? 'border-accent bg-accent/15 text-accent font-bold'
                      : 'border-border bg-surface-secondary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <div className="text-sm">{days} Days</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Data & Backup */}
      {activeTab === 'data' && (
        <div className="space-y-6 max-w-2xl">
          {/* Backup Export */}
          <div className="glass-panel rounded-2xl p-6 border border-border space-y-4">
            <h3 className="text-sm font-bold text-text-primary">Export Application Backup</h3>
            <p className="text-xs text-text-secondary">
              Export all monitors, checks history, incidents, and preferences into a standardized JSON file.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleExportBackup}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-background font-semibold text-xs hover:bg-accent-hover shadow-md shadow-accent/20 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export JSON Backup</span>
              </button>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-secondary border border-border text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-tertiary transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Export Checks (CSV)</span>
              </button>
            </div>
          </div>

          {/* Backup Import */}
          <div className="glass-panel rounded-2xl p-6 border border-border space-y-4">
            <h3 className="text-sm font-bold text-text-primary">Import Backup</h3>
            <p className="text-xs text-text-secondary">
              Restore your monitors and metrics from a previously saved JSON backup file.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="block w-full text-xs text-text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface-secondary file:text-text-primary hover:file:bg-surface-tertiary cursor-pointer"
            />

            {importPreview && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  importPreview.valid
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
                }`}
              >
                <div className="font-bold">
                  {importPreview.valid ? '✓ Backup file validated successfully' : '✗ Validation error'}
                </div>
                {importPreview.valid ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-text-primary pt-1">
                    <div>Monitors: {importPreview.monitorsCount}</div>
                    <div>Checks: {importPreview.checksCount}</div>
                    <div>Incidents: {importPreview.incidentsCount}</div>
                    <div>Status Pages: {importPreview.statusPagesCount}</div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {importPreview.errors.map((e, idx) => (
                      <div key={idx}>• {e}</div>
                    ))}
                  </div>
                )}

                {importPreview.valid && (
                  <div className="pt-2">
                    <button
                      onClick={handleExecuteImport}
                      disabled={isImporting}
                      className="px-4 py-2 rounded-xl bg-accent text-background font-bold text-xs hover:bg-accent-hover transition-colors disabled:opacity-50"
                    >
                      {isImporting ? 'Importing...' : 'Restore Backup Now'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Clear & Purge Data */}
          <div className="glass-panel rounded-2xl p-6 border border-rose-500/30 bg-rose-500/5 space-y-4">
            <h3 className="text-sm font-bold text-rose-300">Danger Zone</h3>
            <p className="text-xs text-rose-300/80">
              Clear check history or permanently purge all browser storage. These actions cannot be undone.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setConfirmClearType('checks')}
                className="px-3.5 py-2 rounded-xl bg-surface-secondary border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Clear Check History
              </button>
              <button
                onClick={() => setConfirmClearType('incidents')}
                className="px-3.5 py-2 rounded-xl bg-surface-secondary border border-border text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Clear Incidents
              </button>
              <button
                onClick={() => setConfirmClearType('all')}
                className="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
              >
                Clear All Pulse Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Security */}
      {activeTab === 'security' && (
        <div className="space-y-6 max-w-2xl">
          <div className="glass-panel rounded-2xl p-6 border border-border space-y-4 text-xs leading-relaxed text-text-secondary">
            <h3 className="text-sm font-bold text-text-primary">SSRF Protection Architecture</h3>
            <p>
              Pulse enforces rigorous Server-Side Request Forgery defenses before dispatching any check:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-text-muted">
              <li>Strict HTTP and HTTPS scheme validation.</li>
              <li>DNS resolution of all A and AAAA records prior to socket connection.</li>
              <li>Blocking of IPv4 loopback (127.0.0.0/8) and IPv6 loopback (::1).</li>
              <li>Blocking of RFC1918 private subnets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16).</li>
              <li>Blocking of Cloud metadata endpoints (169.254.169.254, metadata.google.internal).</li>
              <li>Hop-by-hop redirect validation ensuring redirected URLs cannot hit private targets.</li>
              <li>Max response body download capped at 512 KB to prevent memory exhaustion attacks.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 5: About */}
      {activeTab === 'about' && (
        <div className="space-y-6 max-w-2xl">
          <div className="glass-panel rounded-2xl p-6 border border-border space-y-4 text-xs leading-relaxed text-text-secondary">
            <h3 className="text-sm font-bold text-text-primary">Pulse v1.0.0</h3>
            <p>
              Pulse is a commercial-grade website and API telemetry platform built with Next.js and Python.
            </p>
            <div className="p-4 rounded-xl bg-surface-secondary border border-border font-mono text-[11px] text-text-primary space-y-1">
              <div>Architecture: 100% Database-Free</div>
              <div>Primary Storage: Browser IndexedDB (pulse_db)</div>
              <div>Settings Storage: localStorage</div>
              <div>Backend: Python FastAPI (Stateless Runner)</div>
              <div>Deployment Target: Vercel Serverless</div>
            </div>
            <p className="text-text-muted">
              Remember: Monitoring is active while Pulse is open in your browser. When closed, monitoring pauses until you return.
            </p>
          </div>

          {/* Developer Contact Card */}
          <div className="glass-panel rounded-2xl p-6 border border-border space-y-4">
            <h3 className="text-sm font-bold text-text-primary">Developer & Contact</h3>
            <p className="text-xs text-text-secondary">
              Connect or report feedback directly via GitHub or Discord.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <a
                href="https://github.com/Hidden-Rhythm"
                target="_blank"
                rel="noreferrer noopener"
                className="p-4 rounded-xl bg-surface-secondary hover:bg-surface border border-border hover:border-accent/40 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-text-primary group-hover:text-accent group-hover:border-accent/40 transition-colors">
                    <Github className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary">GitHub</div>
                    <div className="text-[11px] text-text-muted font-mono">Hidden-Rhythm</div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" />
              </a>

              <div className="p-4 rounded-xl bg-surface-secondary border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface border border-border flex items-center justify-center text-[#5865F2]">
                    <DiscordIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-text-primary">Discord</div>
                    <div className="text-[11px] text-accent font-mono">hidden-rhythm</div>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-text-muted">
                  username
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={confirmClearType === 'checks'}
        title="Clear Check History"
        description="Are you sure you want to remove all saved check telemetry records from IndexedDB? Your monitors and settings will remain."
        confirmLabel="Clear Checks"
        isDestructive={true}
        onConfirm={handleClearHistory}
        onCancel={() => setConfirmClearType(null)}
      />

      <ConfirmDialog
        isOpen={confirmClearType === 'incidents'}
        title="Clear All Incidents"
        description="Are you sure you want to clear all incident logs from IndexedDB?"
        confirmLabel="Clear Incidents"
        isDestructive={true}
        onConfirm={handleClearIncidents}
        onCancel={() => setConfirmClearType(null)}
      />

      <ConfirmDialog
        isOpen={confirmClearType === 'all'}
        title="Clear All Pulse Data"
        description="This permanently removes all Pulse data stored in this browser (monitors, checks, incidents, webhooks, and preferences). This action cannot be reversed."
        confirmLabel="Permanently Delete Everything"
        isDestructive={true}
        onConfirm={handleClearEverything}
        onCancel={() => setConfirmClearType(null)}
      />
    </div>
  );
}
