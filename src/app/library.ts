/** The library as React state, on top of the storage wrapper. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { EXAMPLES } from './examples';
import { local } from './settings';
import { nameFor, newId, openStore, type Drawing, type Store } from './storage';

export interface Library {
  ready: boolean;
  /** False when the browser refuses storage: drawings live only in this tab. */
  persistent: boolean;
  drawings: Drawing[];
  create(source: string, name?: string): Promise<Drawing>;
  save(d: Drawing): Promise<void>;
  rename(id: string, name: string): Promise<void>;
  duplicate(id: string): Promise<Drawing | undefined>;
  remove(id: string): Promise<void>;
  /** Adds drawings, replacing any with the same id. */
  addAll(list: Drawing[]): Promise<void>;
}

export function makeDrawing(source: string, name?: string): Drawing {
  const now = Date.now();
  return { id: newId(), name: name || nameFor(source), source, createdAt: now, updatedAt: now, thumbnail: '' };
}

export function useLibrary(): Library {
  const store = useRef<Store | null>(null);
  const [ready, setReady] = useState(false);
  const [persistent, setPersistent] = useState(true);
  const [drawings, setDrawings] = useState<Drawing[]>([]);

  useEffect(() => {
    let live = true;
    (async () => {
      const s = await openStore();
      let all = await s.all().catch(() => [] as Drawing[]);
      // A first visit gets one example, so the library is never blank.
      if (!all.length && !local.get('inkling.seeded')) {
        const ex = EXAMPLES[0];
        const d = makeDrawing(ex.source, ex.name);
        await s.put(d).catch(() => {});
        all = [d];
        local.set('inkling.seeded', '1');
      }
      if (!live) return;
      store.current = s;
      setPersistent(s.persistent);
      setDrawings(all);
      setReady(true);
    })();
    return () => {
      live = false;
    };
  }, []);

  const upsert = (d: Drawing) => setDrawings((list) => (list.some((x) => x.id === d.id) ? list.map((x) => (x.id === d.id ? d : x)) : [d, ...list]));

  const put = useCallback(async (d: Drawing) => {
    upsert(d);
    try {
      await store.current?.put(d);
    } catch {
      setPersistent(false);
    }
  }, []);

  const create = useCallback(
    async (source: string, name?: string) => {
      const d = makeDrawing(source, name);
      await put(d);
      return d;
    },
    [put],
  );

  const find = (id: string) => store.current?.get(id).catch(() => undefined);

  return {
    ready,
    persistent,
    drawings,
    create,
    save: put,
    rename: async (id, name) => {
      const d = drawings.find((x) => x.id === id) ?? (await find(id));
      if (d) await put({ ...d, name: name.trim() || 'Untitled drawing', updatedAt: Date.now() });
    },
    duplicate: async (id) => {
      const d = drawings.find((x) => x.id === id);
      if (!d) return undefined;
      const now = Date.now();
      const copy = { ...d, id: newId(), name: `${d.name} (copy)`, createdAt: now, updatedAt: now };
      await put(copy);
      return copy;
    },
    remove: async (id) => {
      setDrawings((list) => list.filter((x) => x.id !== id));
      await store.current?.remove(id).catch(() => {});
    },
    addAll: async (list) => {
      for (const d of list) await put(d);
    },
  };
}
