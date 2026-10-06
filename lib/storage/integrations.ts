import { STORES, withTransaction, isIndexedDBAvailable } from './db';
import { Integration } from '../types';

const INTEGRATIONS_BACKUP_KEY = 'pulse_integrations_backup_v1';

function getLocalIntegrationsBackup(): Integration[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(INTEGRATIONS_BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalIntegrationsBackup(integrations: Integration[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INTEGRATIONS_BACKUP_KEY, JSON.stringify(integrations));
  } catch {}
}

export function maskWebhookUrl(url: string): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const pathParts = parsed.pathname.split('/');
    if (pathParts.length > 2) {
      const last = pathParts[pathParts.length - 1];
      const maskedPart = last.length > 8 ? last.slice(0, 4) + '••••••••' + last.slice(-4) : '••••••••';
      pathParts[pathParts.length - 1] = maskedPart;
      return `${parsed.origin}${pathParts.join('/')}`;
    }
    return `${parsed.origin}••••••••`;
  } catch {
    return url.length > 10 ? url.slice(0, 6) + '••••••••' : '••••••••';
  }
}

export async function getIntegrations(): Promise<Integration[]> {
  const localBackup = getLocalIntegrationsBackup();

  if (!isIndexedDBAvailable()) {
    return localBackup;
  }

  try {
    const list = await withTransaction(STORES.INTEGRATIONS, 'readonly', (store) => {
      return new Promise<Integration[]>((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });

    if (list && list.length > 0) {
      saveLocalIntegrationsBackup(list);
      return list;
    }

    if (localBackup.length > 0) {
      for (const item of localBackup) {
        try {
          await saveIntegration(item);
        } catch {}
      }
      return localBackup;
    }

    return [];
  } catch (err) {
    console.warn('[Pulse] Error reading IndexedDB integrations:', err);
    return localBackup;
  }
}

export async function getIntegration(id: string): Promise<Integration | null> {
  const all = await getIntegrations();
  return all.find((i) => i.id === id) || null;
}

export async function saveIntegration(integration: Integration): Promise<Integration> {
  const backup = getLocalIntegrationsBackup();
  const idx = backup.findIndex((i) => i.id === integration.id);
  if (idx >= 0) backup[idx] = integration;
  else backup.push(integration);
  saveLocalIntegrationsBackup(backup);

  if (!isIndexedDBAvailable()) {
    return integration;
  }

  try {
    await withTransaction(STORES.INTEGRATIONS, 'readwrite', (store) => {
      return new Promise<Integration>((resolve, reject) => {
        const req = store.put(integration);
        req.onsuccess = () => resolve(integration);
        req.onerror = () => reject(req.error);
      });
    });
  } catch (err) {
    console.warn('[Pulse] IndexedDB save integration error:', err);
  }

  return integration;
}

export async function deleteIntegration(id: string): Promise<void> {
  const backup = getLocalIntegrationsBackup().filter((i) => i.id !== id);
  saveLocalIntegrationsBackup(backup);

  if (!isIndexedDBAvailable()) return;

  try {
    await withTransaction(STORES.INTEGRATIONS, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  } catch (err) {
    console.warn('[Pulse] Error deleting integration:', err);
  }
}
