import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { makeBackup, memoryStore, nameFor, newId, openStore, readBackup, type Drawing } from '../src/app/storage';

const drawing = (over: Partial<Drawing> = {}): Drawing => ({
  id: newId(),
  name: 'Test',
  source: 'a -> b',
  createdAt: 1,
  updatedAt: 2,
  thumbnail: '<svg/>',
  ...over,
});

describe('storage', () => {
  it('stores, reads, updates and removes drawings in IndexedDB', async () => {
    const store = await openStore('t1', new IDBFactory());
    expect(store.persistent).toBe(true);
    expect(await store.all()).toEqual([]);
    const d = drawing();
    await store.put(d);
    expect(await store.get(d.id)).toEqual(d);
    await store.put({ ...d, source: 'x -> y' });
    expect((await store.get(d.id))?.source).toBe('x -> y');
    await store.put(drawing({ name: 'Other' }));
    expect((await store.all()).map((x) => x.name).sort()).toEqual(['Other', 'Test']);
    await store.remove(d.id);
    expect(await store.get(d.id)).toBeUndefined();
    expect(await store.all()).toHaveLength(1);
  });

  it('keeps drawings between openings', async () => {
    const idb = new IDBFactory();
    const d = drawing();
    await (await openStore('t2', idb)).put(d);
    expect(await (await openStore('t2', idb)).get(d.id)).toEqual(d);
  });

  it('falls back to memory when IndexedDB is missing or throws', async () => {
    const missing = await openStore('t3', undefined);
    expect(missing.persistent).toBe(false);
    const throwing = { open: () => { throw new Error('SecurityError'); } } as unknown as IDBFactory;
    const store = await openStore('t3', throwing);
    expect(store.persistent).toBe(false);
    const d = drawing();
    await store.put(d);
    expect(await store.get(d.id)).toEqual(d);
    expect(await store.all()).toEqual([d]);
  });

  it('memory store hands out copies', async () => {
    const store = memoryStore();
    const d = drawing();
    await store.put(d);
    (await store.get(d.id))!.name = 'changed';
    expect((await store.get(d.id))!.name).toBe('Test');
  });
});

describe('backups', () => {
  it('round-trips', () => {
    const list = [drawing(), drawing({ name: 'Two' })];
    expect(readBackup(makeBackup(list))).toEqual(list.map((d) => ({ ...d, thumbnail: '' })));
  });
  it('drops thumbnails, which are markup, from files', () => {
    const [d] = readBackup(makeBackup([drawing({ thumbnail: '<svg onload="alert(1)"/>' })]));
    expect(d.thumbnail).toBe('');
  });
  it('fills in missing fields', () => {
    const [d] = readBackup(JSON.stringify({ app: 'inkling', version: 1, drawings: [{ source: 'a -> b' }] }));
    expect(d.name).toBe('Untitled drawing');
    expect(d.id).toBeTruthy();
    expect(d.thumbnail).toBe('');
  });
  it('explains files that are not backups', () => {
    expect(() => readBackup('nope')).toThrow(/not valid JSON/);
    expect(() => readBackup('{"drawings": []}')).toThrow(/not an Inkling backup/);
  });
});

describe('nameFor', () => {
  it('uses the title line', () => {
    expect(nameFor('title "How DNS works"\na -> b')).toBe('How DNS works');
    expect(nameFor('title Plain words\n')).toBe('Plain words');
    expect(nameFor('a -> b')).toBe('Untitled drawing');
  });
});
