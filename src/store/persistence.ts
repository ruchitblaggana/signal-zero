// IndexedDB-backed persistence with versioned schema, safe init, fallback to localStorage.

import type { PersistedData, NotebookEntry, CustomScenario, ScenarioSummary } from '@/types';

const DB_NAME = 'signal-zero';
const DB_VERSION = 1;
const STORE = 'records';

const SCHEMA_VERSION = 1;

const LS_FALLBACK_KEY = 'signal-zero-fallback';

export const defaultData: PersistedData = {
  schemaVersion: SCHEMA_VERSION,
  notebook: [],
  customScenarios: [],
  scenarioSummaries: [],
  settings: {
    tutorialSeen: false,
    reducedMotion: false,
  },
};

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbGet(key: string): Promise<any | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const r = store.get(key);
      r.onsuccess = () => resolve(r.result?.value ?? null);
      r.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbSet(key: string, value: any): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      store.put({ key, value });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbClear(): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// localStorage fallback for settings/flags.
function lsGet<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) as T : fallback;
  } catch {
    return fallback;
  }
}
function lsSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable
  }
}

export interface PersistenceHandle {
  available: boolean;
  load(): Promise<PersistedData>;
  save(data: PersistedData): Promise<boolean>;
  clearAll(): Promise<boolean>;
}

export const persistence: PersistenceHandle = {
  available: typeof indexedDB !== 'undefined',
  async load() {
    const dbData = await idbGet('persisted');
    if (dbData && typeof dbData === 'object' && 'schemaVersion' in dbData) {
      return migrate(dbData as PersistedData);
    }
    // try fallback
    const fb = lsGet<PersistedData | null>(LS_FALLBACK_KEY, null);
    if (fb) return migrate(fb);
    return { ...defaultData };
  },
  async save(data) {
    const ok = await idbSet('persisted', data);
    if (!ok) lsSet(LS_FALLBACK_KEY, data);
    return ok;
  },
  async clearAll() {
    const ok = await idbClear();
    try { localStorage.removeItem(LS_FALLBACK_KEY); } catch { /* ignore */ }
    return ok;
  },
};

/** Migrate older schema versions forward. */
function migrate(data: PersistedData): PersistedData {
  if (!data.schemaVersion || data.schemaVersion < SCHEMA_VERSION) {
    // Forward-compatible: fill missing fields.
    return {
      schemaVersion: SCHEMA_VERSION,
      notebook: data.notebook ?? [],
      customScenarios: data.customScenarios ?? [],
      scenarioSummaries: data.scenarioSummaries ?? [],
      settings: { ...defaultData.settings, ...(data.settings ?? {}) },
    };
  }
  return data;
}

export function exportData(data: PersistedData): string {
  return JSON.stringify(data, null, 2);
}

export function importData(json: string): PersistedData {
  const parsed = JSON.parse(json);
  if (typeof parsed !== 'object' || !('schemaVersion' in parsed)) {
    throw new Error('Invalid Signal Zero data file.');
  }
  return migrate(parsed as PersistedData);
}

// Specific record helpers
export function addNotebook(data: PersistedData, entry: NotebookEntry): PersistedData {
  return { ...data, notebook: [entry, ...data.notebook] };
}
export function updateNotebook(data: PersistedData, id: string, patch: Partial<NotebookEntry>): PersistedData {
  return {
    ...data,
    notebook: data.notebook.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: Date.now() } : e)),
  };
}
export function deleteNotebook(data: PersistedData, id: string): PersistedData {
  return { ...data, notebook: data.notebook.filter((e) => e.id !== id) };
}
export function addScenario(data: PersistedData, scenario: CustomScenario): PersistedData {
  return { ...data, customScenarios: [scenario, ...data.customScenarios] };
}
export function deleteScenario(data: PersistedData, id: string): PersistedData {
  return { ...data, customScenarios: data.customScenarios.filter((s) => s.id !== id) };
}
export function addSummary(data: PersistedData, summary: ScenarioSummary): PersistedData {
  return { ...data, scenarioSummaries: [summary, ...data.scenarioSummaries].slice(0, 200) };
}
