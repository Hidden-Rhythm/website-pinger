import { STORES, withTransaction, isIndexedDBAvailable } from './db';
import { Monitor } from '../types';

const BACKUP_KEY = 'pulse_monitors_backup_v1';

function getLocalStorageBackup(): Monitor[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalStorageBackup(monitors: Monitor[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(monitors));
  } catch {}
}

export async function getMonitors(): Promise<Monitor[]> {
  const localBackup = getLocalStorageBackup();

  if (!isIndexedDBAvailable()) {
    return localBackup;
  }

  try {
    const idbMonitors = await withTransaction(STORES.MONITORS, 'readonly', (store) => {
      return new Promise<Monitor[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    });

    if (idbMonitors && idbMonitors.length > 0) {
      saveLocalStorageBackup(idbMonitors);
      return idbMonitors;
    }

    // If IndexedDB is empty but local backup exists (e.g. after refresh or migration)
    if (localBackup.length > 0) {
      for (const m of localBackup) {
        try {
          await createMonitor(m);
        } catch {}
      }
      return localBackup;
    }

    return [];
  } catch (err) {
    console.warn('[Pulse] Error reading IndexedDB monitors, falling back to backup:', err);
    return localBackup;
  }
}

export async function getMonitor(id: string): Promise<Monitor | null> {
  const monitors = await getMonitors();
  return monitors.find((m) => m.id === id) || null;
}

export async function createMonitor(monitor: Monitor): Promise<Monitor> {
  // Update local backup immediately
  const backup = getLocalStorageBackup();
  const existsIdx = backup.findIndex((m) => m.id === monitor.id);
  if (existsIdx >= 0) backup[existsIdx] = monitor;
  else backup.push(monitor);
  saveLocalStorageBackup(backup);

  if (!isIndexedDBAvailable()) {
    return monitor;
  }

  try {
    await withTransaction(STORES.MONITORS, 'readwrite', (store) => {
      return new Promise<Monitor>((resolve, reject) => {
        const request = store.put(monitor);
        request.onsuccess = () => resolve(monitor);
        request.onerror = () => reject(request.error);
      });
    });
  } catch (err) {
    console.warn('[Pulse] IndexedDB put error, preserved in backup:', err);
  }

  return monitor;
}

export async function updateMonitor(id: string, updates: Partial<Monitor>): Promise<Monitor> {
  const existing = await getMonitor(id);
  if (!existing) {
    throw new Error(`Monitor with ID ${id} not found.`);
  }

  const updated: Monitor = {
    ...existing,
    ...updates,
    id,
    updatedAt: Date.now(),
  };

  await createMonitor(updated);
  return updated;
}

export async function deleteMonitor(id: string): Promise<void> {
  // Update backup
  const backup = getLocalStorageBackup().filter((m) => m.id !== id);
  saveLocalStorageBackup(backup);

  if (!isIndexedDBAvailable()) return;

  try {
    await withTransaction(STORES.MONITORS, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    // Cascade delete checks
    await withTransaction(STORES.CHECKS, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const index = store.index('monitorId');
        const req = index.openKeyCursor(IDBKeyRange.only(id));
        req.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest).result as IDBCursor;
          if (cursor) {
            store.delete(cursor.primaryKey);
            cursor.continue();
          } else {
            resolve();
          }
        };
        req.onerror = () => reject(req.error);
      });
    });
  } catch (err) {
    console.warn('[Pulse] Cascade delete notice:', err);
  }
}

export async function toggleMonitor(id: string, enabled: boolean): Promise<Monitor> {
  return updateMonitor(id, {
    enabled,
    status: enabled ? 'UNMONITORED' : 'PAUSED',
    updatedAt: Date.now(),
  });
}
