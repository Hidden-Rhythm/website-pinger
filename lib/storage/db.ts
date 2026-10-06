/**
 * Pulse IndexedDB Layer
 * Pure client-side persistence without any database server.
 */

const DB_NAME = 'pulse_db';
const DB_VERSION = 1;

export const STORES = {
  MONITORS: 'monitors',
  CHECKS: 'checks',
  INCIDENTS: 'incidents',
  INTEGRATIONS: 'integrations',
  STATUS_PAGES: 'statusPages',
  MAINTENANCE_WINDOWS: 'maintenanceWindows',
  PREFERENCES: 'preferences',
} as const;

let dbInstance: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase> | null = null;

export function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.indexedDB;
}

export function openDatabase(): Promise<IDBDatabase> {
  if (!isIndexedDBAvailable()) {
    return Promise.reject(new Error('IndexedDB is not available in this environment.'));
  }

  if (dbInstance) {
    try {
      // Test if instance is still open
      dbInstance.transaction(STORES.MONITORS, 'readonly');
      return Promise.resolve(dbInstance);
    } catch {
      dbInstance = null;
    }
  }

  if (dbOpenPromise) {
    return dbOpenPromise;
  }

  dbOpenPromise = new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        dbOpenPromise = null;
        dbInstance = null;
        const error = (event.target as IDBOpenDBRequest).error;
        console.error('[Pulse DB] Failed to open IndexedDB:', error);
        reject(new Error(error?.message || 'Failed to open local browser database.'));
      };

      request.onsuccess = (event) => {
        dbInstance = (event.target as IDBOpenDBRequest).result;

        dbInstance.onversionchange = () => {
          dbInstance?.close();
          dbInstance = null;
          dbOpenPromise = null;
        };

        dbInstance.onclose = () => {
          dbInstance = null;
          dbOpenPromise = null;
        };

        resolve(dbInstance);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. monitors
        if (!db.objectStoreNames.contains(STORES.MONITORS)) {
          const monitorStore = db.createObjectStore(STORES.MONITORS, { keyPath: 'id' });
          monitorStore.createIndex('status', 'status', { unique: false });
          monitorStore.createIndex('enabled', 'enabled', { unique: false });
          monitorStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // 2. checks
        if (!db.objectStoreNames.contains(STORES.CHECKS)) {
          const checkStore = db.createObjectStore(STORES.CHECKS, { keyPath: 'id' });
          checkStore.createIndex('monitorId', 'monitorId', { unique: false });
          checkStore.createIndex('checkedAt', 'checkedAt', { unique: false });
          checkStore.createIndex('status', 'status', { unique: false });
        }

        // 3. incidents
        if (!db.objectStoreNames.contains(STORES.INCIDENTS)) {
          const incidentStore = db.createObjectStore(STORES.INCIDENTS, { keyPath: 'id' });
          incidentStore.createIndex('monitorId', 'monitorId', { unique: false });
          incidentStore.createIndex('status', 'status', { unique: false });
          incidentStore.createIndex('startedAt', 'startedAt', { unique: false });
        }

        // 4. integrations
        if (!db.objectStoreNames.contains(STORES.INTEGRATIONS)) {
          const integrationStore = db.createObjectStore(STORES.INTEGRATIONS, { keyPath: 'id' });
          integrationStore.createIndex('type', 'type', { unique: false });
          integrationStore.createIndex('enabled', 'enabled', { unique: false });
        }

        // 5. statusPages
        if (!db.objectStoreNames.contains(STORES.STATUS_PAGES)) {
          const statusStore = db.createObjectStore(STORES.STATUS_PAGES, { keyPath: 'id' });
          statusStore.createIndex('slug', 'slug', { unique: true });
        }

        // 6. maintenanceWindows
        if (!db.objectStoreNames.contains(STORES.MAINTENANCE_WINDOWS)) {
          const mwStore = db.createObjectStore(STORES.MAINTENANCE_WINDOWS, { keyPath: 'id' });
          mwStore.createIndex('active', 'active', { unique: false });
        }

        // 7. preferences
        if (!db.objectStoreNames.contains(STORES.PREFERENCES)) {
          db.createObjectStore(STORES.PREFERENCES, { keyPath: 'key' });
        }
      };
    } catch (err) {
      dbOpenPromise = null;
      dbInstance = null;
      reject(err);
    }
  });

  return dbOpenPromise;
}

export async function withTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<T>
): Promise<T> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);

  return new Promise<T>((resolve, reject) => {
    tx.onerror = () => {
      reject(tx.error || new Error('Transaction error'));
    };

    tx.onabort = () => {
      reject(new Error('Transaction aborted'));
    };

    callback(store)
      .then((val) => {
        resolve(val);
      })
      .catch((err) => {
        try {
          tx.abort();
        } catch {}
        reject(err);
      });
  });
}
