import { STORES, withTransaction, isIndexedDBAvailable } from './db';
import { StatusPageConfig } from '../types';

const STATUS_PAGES_BACKUP_KEY = 'pulse_status_pages_backup_v1';

function getLocalStatusPagesBackup(): StatusPageConfig[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STATUS_PAGES_BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalStatusPagesBackup(pages: StatusPageConfig[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STATUS_PAGES_BACKUP_KEY, JSON.stringify(pages));
  } catch {}
}

export async function getStatusPages(): Promise<StatusPageConfig[]> {
  const localBackup = getLocalStatusPagesBackup();

  if (!isIndexedDBAvailable()) {
    return localBackup;
  }

  try {
    const list = await withTransaction(STORES.STATUS_PAGES, 'readonly', (store) => {
      return new Promise<StatusPageConfig[]>((resolve, reject) => {
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    });

    if (list && list.length > 0) {
      saveLocalStatusPagesBackup(list);
      return list;
    }

    if (localBackup.length > 0) {
      for (const item of localBackup) {
        try {
          await saveStatusPage(item);
        } catch {}
      }
      return localBackup;
    }

    return [];
  } catch (err) {
    console.warn('[Pulse] Error reading IndexedDB status pages:', err);
    return localBackup;
  }
}

export async function getStatusPageBySlug(slug: string): Promise<StatusPageConfig | null> {
  const all = await getStatusPages();
  return all.find((p) => p.slug === slug) || null;
}

export async function saveStatusPage(page: StatusPageConfig): Promise<StatusPageConfig> {
  const backup = getLocalStatusPagesBackup();
  const idx = backup.findIndex((p) => p.id === page.id);
  if (idx >= 0) backup[idx] = page;
  else backup.push(page);
  saveLocalStatusPagesBackup(backup);

  if (!isIndexedDBAvailable()) {
    return page;
  }

  try {
    await withTransaction(STORES.STATUS_PAGES, 'readwrite', (store) => {
      return new Promise<StatusPageConfig>((resolve, reject) => {
        const req = store.put(page);
        req.onsuccess = () => resolve(page);
        req.onerror = () => reject(req.error);
      });
    });
  } catch (err) {
    console.warn('[Pulse] IndexedDB save status page error:', err);
  }

  return page;
}

export async function deleteStatusPage(id: string): Promise<void> {
  const backup = getLocalStatusPagesBackup().filter((p) => p.id !== id);
  saveLocalStatusPagesBackup(backup);

  if (!isIndexedDBAvailable()) return;

  try {
    await withTransaction(STORES.STATUS_PAGES, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    });
  } catch (err) {
    console.warn('[Pulse] Error deleting status page:', err);
  }
}
