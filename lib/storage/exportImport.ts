import { openDatabase, STORES } from './db';
import { getMonitors, createMonitor } from './monitors';
import { getAllRecentChecks, saveCheck, clearAllChecks } from './checks';
import { getIncidents, createIncident, clearAllIncidents } from './incidents';
import { getIntegrations, saveIntegration } from './integrations';
import { getStatusPages, saveStatusPage } from './statusPages';
import { getPreferences, savePreferences, resetPreferences } from './preferences';
import { Monitor, CheckResult, Incident, Integration, StatusPageConfig } from '../types';

export const SCHEMA_VERSION = 1;
export const APP_VERSION = '1.0.0';

export interface PulseBackupPayload {
  schemaVersion: number;
  applicationVersion: string;
  exportedAt: string;
  data: {
    monitors: Monitor[];
    checks: CheckResult[];
    incidents: Incident[];
    integrations: Integration[];
    statusPages: StatusPageConfig[];
    preferences?: any;
  };
}

export interface ImportPreviewResult {
  valid: boolean;
  monitorsCount: number;
  checksCount: number;
  incidentsCount: number;
  statusPagesCount: number;
  integrationsCount: number;
  errors: string[];
}

export async function exportAllData(includeWebhookSecrets: boolean = false): Promise<PulseBackupPayload> {
  const [monitors, checks, incidents, integrations, statusPages] = await Promise.all([
    getMonitors(),
    getAllRecentChecks(1000),
    getIncidents(),
    getIntegrations(),
    getStatusPages(),
  ]);

  const sanitizedIntegrations = integrations.map((intg) => ({
    ...intg,
    webhookUrl: includeWebhookSecrets ? intg.webhookUrl : 'REDACTED',
  }));

  return {
    schemaVersion: SCHEMA_VERSION,
    applicationVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      monitors,
      checks,
      incidents,
      integrations: sanitizedIntegrations,
      statusPages,
      preferences: getPreferences(),
    },
  };
}

export function downloadJsonFile(filename: string, data: any): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportChecksToCsv(checks: CheckResult[], monitorNameMap: Record<string, string>): void {
  const headers = ['Timestamp', 'Date UTC', 'Monitor ID', 'Monitor Name', 'Status', 'HTTP Code', 'Response Time (ms)', 'Assertion Message'];
  const rows = checks.map((c) => [
    c.checkedAt,
    new Date(c.checkedAt).toISOString(),
    `"${c.monitorId}"`,
    `"${monitorNameMap[c.monitorId] || 'Unknown'}"`,
    c.status,
    c.statusCode || '',
    c.responseTimeMs,
    `"${(c.assertionMessage || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pulse-checks-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function validateImportPayload(rawJson: string): ImportPreviewResult {
  const errors: string[] = [];

  // Limit raw payload size (15MB)
  if (rawJson.length > 15 * 1024 * 1024) {
    return {
      valid: false,
      monitorsCount: 0,
      checksCount: 0,
      incidentsCount: 0,
      statusPagesCount: 0,
      integrationsCount: 0,
      errors: ['Import file exceeds the 15MB size limit.'],
    };
  }

  // Prevent prototype pollution
  if (rawJson.includes('__proto__') || rawJson.includes('constructor') || rawJson.includes('prototype')) {
    // Check if it's actually modifying prototypes
    try {
      const parsed = JSON.parse(rawJson);
      if (Object.prototype.hasOwnProperty.call(parsed, '__proto__')) {
        return {
          valid: false,
          monitorsCount: 0,
          checksCount: 0,
          incidentsCount: 0,
          statusPagesCount: 0,
          integrationsCount: 0,
          errors: ['Security violation: Malformed JSON keys detected.'],
        };
      }
    } catch {
      return {
        valid: false,
        monitorsCount: 0,
        checksCount: 0,
        incidentsCount: 0,
        statusPagesCount: 0,
        integrationsCount: 0,
        errors: ['Invalid JSON syntax.'],
      };
    }
  }

  let obj: any;
  try {
    obj = JSON.parse(rawJson);
  } catch (err: any) {
    return {
      valid: false,
      monitorsCount: 0,
      checksCount: 0,
      incidentsCount: 0,
      statusPagesCount: 0,
      integrationsCount: 0,
      errors: [`JSON parse error: ${err.message}`],
    };
  }

  if (!obj || typeof obj !== 'object' || !obj.data) {
    return {
      valid: false,
      monitorsCount: 0,
      checksCount: 0,
      incidentsCount: 0,
      statusPagesCount: 0,
      integrationsCount: 0,
      errors: ['Missing required root "data" object.'],
    };
  }

  const { monitors = [], checks = [], incidents = [], statusPages = [], integrations = [] } = obj.data;

  if (!Array.isArray(monitors)) errors.push('"monitors" must be an array.');
  if (!Array.isArray(checks)) errors.push('"checks" must be an array.');
  if (!Array.isArray(incidents)) errors.push('"incidents" must be an array.');

  // Sanity check limits
  if (monitors.length > 100) {
    errors.push(`Monitors count (${monitors.length}) exceeds safety limit of 100.`);
  }
  if (checks.length > 5000) {
    errors.push(`Checks count (${checks.length}) exceeds safety limit of 5000.`);
  }

  // Validate monitor URLs
  for (const m of monitors) {
    if (!m.id || !m.name || !m.url) {
      errors.push(`Invalid monitor entry found (missing id, name, or url).`);
      break;
    }
    if (!m.url.startsWith('http://') && !m.url.startsWith('https://')) {
      errors.push(`Monitor "${m.name}" has invalid URL protocol: ${m.url}`);
      break;
    }
  }

  return {
    valid: errors.length === 0,
    monitorsCount: monitors.length,
    checksCount: checks.length,
    incidentsCount: incidents.length,
    statusPagesCount: Array.isArray(statusPages) ? statusPages.length : 0,
    integrationsCount: Array.isArray(integrations) ? integrations.length : 0,
    errors,
  };
}

export async function executeImport(rawJson: string): Promise<void> {
  const preview = validateImportPayload(rawJson);
  if (!preview.valid) {
    throw new Error(`Import validation failed: ${preview.errors.join('; ')}`);
  }

  const parsed: PulseBackupPayload = JSON.parse(rawJson);
  const { monitors = [], checks = [], incidents = [], integrations = [], statusPages = [], preferences } = parsed.data;

  // Import monitors
  for (const m of monitors) {
    await createMonitor({
      ...m,
      status: 'UNMONITORED', // Reset to unmonitored on import so fresh check triggers
      updatedAt: Date.now(),
    });
  }

  // Import checks
  for (const c of checks) {
    await saveCheck(c);
  }

  // Import incidents
  for (const inc of incidents) {
    await createIncident(inc);
  }

  // Import integrations
  for (const intg of integrations) {
    if (intg.webhookUrl && intg.webhookUrl !== 'REDACTED') {
      await saveIntegration(intg);
    }
  }

  // Import status pages
  for (const sp of statusPages) {
    await saveStatusPage(sp);
  }

  // Import preferences
  if (preferences && typeof preferences === 'object') {
    savePreferences(preferences);
  }
}

export async function clearAllPulseData(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Clear localStorage
  resetPreferences();
  try {
    localStorage.clear();
  } catch {}

  // Delete IndexedDB
  if (window.indexedDB) {
    const db = await openDatabase();
    db.close();
    await new Promise<void>((resolve, reject) => {
      const req = window.indexedDB.deleteDatabase('pulse_db');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
      req.onblocked = () => resolve(); // Database closed
    });
  }
}
