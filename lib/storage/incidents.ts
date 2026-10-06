import { STORES, withTransaction, isIndexedDBAvailable } from './db';
import { Incident } from '../types';

export async function getIncidents(): Promise<Incident[]> {
  if (!isIndexedDBAvailable()) return [];
  return withTransaction(STORES.INCIDENTS, 'readonly', (store) => {
    return new Promise<Incident[]>((resolve, reject) => {
      const index = store.index('startedAt');
      const req = index.openCursor(null, 'prev');
      const results: Incident[] = [];

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
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

export async function getActiveIncidents(): Promise<Incident[]> {
  if (!isIndexedDBAvailable()) return [];
  return withTransaction(STORES.INCIDENTS, 'readonly', (store) => {
    return new Promise<Incident[]>((resolve, reject) => {
      const index = store.index('status');
      const req = index.openCursor(IDBKeyRange.only('ONGOING'));
      const results: Incident[] = [];

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
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

export async function getIncidentsForMonitor(monitorId: string): Promise<Incident[]> {
  if (!isIndexedDBAvailable()) return [];
  return withTransaction(STORES.INCIDENTS, 'readonly', (store) => {
    return new Promise<Incident[]>((resolve, reject) => {
      const index = store.index('monitorId');
      const req = index.openCursor(IDBKeyRange.only(monitorId), 'prev');
      const results: Incident[] = [];

      req.onsuccess = (e) => {
        const cursor = (e.target as IDBRequest).result as IDBCursorWithValue;
        if (cursor) {
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

export async function getIncident(id: string): Promise<Incident | null> {
  if (!isIndexedDBAvailable()) return null;
  return withTransaction(STORES.INCIDENTS, 'readonly', (store) => {
    return new Promise<Incident | null>((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function createIncident(incident: Incident): Promise<Incident> {
  return withTransaction(STORES.INCIDENTS, 'readwrite', (store) => {
    return new Promise<Incident>((resolve, reject) => {
      const req = store.add(incident);
      req.onsuccess = () => resolve(incident);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function updateIncident(id: string, updates: Partial<Incident>): Promise<Incident> {
  const existing = await getIncident(id);
  if (!existing) {
    throw new Error(`Incident ${id} not found.`);
  }

  const updated: Incident = {
    ...existing,
    ...updates,
    id,
  };

  return withTransaction(STORES.INCIDENTS, 'readwrite', (store) => {
    return new Promise<Incident>((resolve, reject) => {
      const req = store.put(updated);
      req.onsuccess = () => resolve(updated);
      req.onerror = () => reject(req.error);
    });
  });
}

export async function resolveIncident(id: string, message: string = 'Service recovered'): Promise<Incident> {
  const incident = await getIncident(id);
  if (!incident || incident.status === 'RESOLVED') {
    return incident as Incident;
  }

  const now = Date.now();
  const updatedTimeline = [
    ...incident.timeline,
    {
      timestamp: now,
      status: 'ONLINE' as const,
      message,
    },
  ];

  return updateIncident(id, {
    status: 'RESOLVED',
    resolvedAt: now,
    timeline: updatedTimeline,
  });
}

export async function clearAllIncidents(): Promise<void> {
  if (!isIndexedDBAvailable()) return;
  return withTransaction(STORES.INCIDENTS, 'readwrite', (store) => {
    return new Promise<void>((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}
