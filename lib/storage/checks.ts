import { STORES, withTransaction, isIndexedDBAvailable } from './db';
import { CheckResult } from '../types';

export async function saveCheck(check: CheckResult): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  return withTransaction(STORES.CHECKS, 'readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const request = store.add(check);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  });
}

export async function getRecentChecks(monitorId: string, limit: number = 60): Promise<CheckResult[]> {
  if (!isIndexedDBAvailable()) return [];
  return withTransaction(STORES.CHECKS, 'readonly', (store) => {
    return new Promise<CheckResult[]>((resolve, reject) => {
      const index = store.index('monitorId');
      const req = index.openCursor(IDBKeyRange.only(monitorId), 'prev');
      const results: CheckResult[] = [];

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          // Return in chronological order
          resolve(results.reverse());
        }
      };

      req.onerror = () => reject(req.error);
    });
  });
}

export async function getChecksInRange(
  monitorId: string,
  startTime: number,
  endTime: number
): Promise<CheckResult[]> {
  if (!isIndexedDBAvailable()) return [];
  return withTransaction(STORES.CHECKS, 'readonly', (store) => {
    return new Promise<CheckResult[]>((resolve, reject) => {
      const index = store.index('monitorId');
      const req = index.openCursor(IDBKeyRange.only(monitorId));
      const results: CheckResult[] = [];

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
          const val: CheckResult = cursor.value;
          if (val.checkedAt >= startTime && val.checkedAt <= endTime) {
            results.push(val);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      req.onerror = () => reject(req.error);
    });
  });
}

export async function getAllRecentChecks(limit: number = 300): Promise<CheckResult[]> {
  if (!isIndexedDBAvailable()) return [];
  return withTransaction(STORES.CHECKS, 'readonly', (store) => {
    return new Promise<CheckResult[]>((resolve, reject) => {
      const index = store.index('checkedAt');
      const req = index.openCursor(null, 'prev');
      const results: CheckResult[] = [];

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor && results.length < limit) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      req.onerror = () => reject(req.error);
    });
  });
}

export async function pruneChecks(retentionDays: number): Promise<number> {
  if (!isIndexedDBAvailable()) return 0;
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  return withTransaction(STORES.CHECKS, 'readwrite', (store) => {
    return new Promise<number>((resolve, reject) => {
      const index = store.index('checkedAt');
      const range = IDBKeyRange.upperBound(cutoffTime);
      const req = index.openKeyCursor(range);

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursor;
        if (cursor) {
          store.delete(cursor.primaryKey);
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      req.onerror = () => reject(req.error);
    });
  });
}

export async function clearAllChecks(): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  return withTransaction(STORES.CHECKS, 'readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}
