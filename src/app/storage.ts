/**
 * The library: drawings kept in IndexedDB. If the browser refuses storage
 * (a private window, blocked site data), the same API keeps them in memory
 * and `persistent` is false, so the app can say so.
 */

export interface Drawing {
  id: string;
  name: string;
  source: string;
  createdAt: number;
  updatedAt: number;
  /** The finished drawing as SVG markup, shown small in the library. */
  thumbnail: string;
}

export interface Store {
  persistent: boolean;
  all(): Promise<Drawing[]>;
  get(id: string): Promise<Drawing | undefined>;
  put(d: Drawing): Promise<void>;
  remove(id: string): Promise<void>;
}

const STORE = 'drawings';

const done = <T>(req: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export function memoryStore(): Store {
  const m = new Map<string, Drawing>();
  return {
    persistent: false,
    all: async () => [...m.values()].map((d) => ({ ...d })),
    get: async (id) => (m.has(id) ? { ...m.get(id)! } : undefined),
    put: async (d) => void m.set(d.id, { ...d }),
    remove: async (id) => void m.delete(id),
  };
}

/** Opens the library. Never throws: falls back to memory. */
export async function openStore(name = 'inkling', idb: IDBFactory | undefined = globalThis.indexedDB): Promise<Store> {
  try {
    if (!idb) throw new Error('no IndexedDB');
    const open = idb.open(name, 1);
    open.onupgradeneeded = () => open.result.createObjectStore(STORE, { keyPath: 'id' });
    const db = await done(open);
    const tx = (mode: IDBTransactionMode) => db.transaction(STORE, mode).objectStore(STORE);
    // A write must succeed too: some browsers open the database and then refuse to store.
    await done(tx('readwrite').put({ id: '__probe__' }));
    await done(tx('readwrite').delete('__probe__'));
    return {
      persistent: true,
      all: () => done(tx('readonly').getAll() as IDBRequest<Drawing[]>),
      get: (id) => done(tx('readonly').get(id) as IDBRequest<Drawing | undefined>),
      put: async (d) => void (await done(tx('readwrite').put(d))),
      remove: async (id) => void (await done(tx('readwrite').delete(id))),
    };
  } catch {
    return memoryStore();
  }
}

export const newId = () =>
  (globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`).slice(0, 36);

/* ── Backups ─────────────────────────────────────────────────────────────── */

export interface Backup {
  app: 'inkling';
  version: 1;
  exportedAt: number;
  drawings: Drawing[];
}

export function makeBackup(drawings: Drawing[], now = Date.now()): string {
  const b: Backup = { app: 'inkling', version: 1, exportedAt: now, drawings };
  return JSON.stringify(b, null, 2);
}

/** Reads a backup file. Throws an Error with a plain message when it is not one. */
export function readBackup(text: string): Drawing[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('This file is not a backup: it is not valid JSON.');
  }
  const b = data as Partial<Backup>;
  if (!b || b.app !== 'inkling' || !Array.isArray(b.drawings)) throw new Error('This file is not an Inkling backup. Choose a file made with "Export backup".');
  const now = Date.now();
  return b.drawings
    .filter((d) => d && typeof d.source === 'string')
    .map((d) => ({
      id: typeof d.id === 'string' && d.id ? d.id : newId(),
      name: typeof d.name === 'string' && d.name ? d.name : 'Untitled drawing',
      source: d.source,
      createdAt: Number(d.createdAt) || now,
      updatedAt: Number(d.updatedAt) || now,
      // Thumbnails are markup shown in the page: never trust them from a file. They are redrawn on open.
      thumbnail: '',
    }));
}

/** A name for a drawing: its title line, or the fallback. */
export function nameFor(source: string, fallback = 'Untitled drawing'): string {
  const m = source.match(/^\s*title\s+"?([^"\n]+?)"?\s*$/m);
  return m ? m[1].trim() : fallback;
}
