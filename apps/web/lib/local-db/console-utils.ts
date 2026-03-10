/**
 * Console utilities for testing LocalDB from devtools.
 * Usage: Object.assign(window, localDBConsoleUtils(defaultLocalDB));
 * Then: dbList('tickets'), dbCreate('tickets', {...}), etc.
 */

import type { LocalDB } from './LocalDB';

export function localDBConsoleUtils(db: LocalDB | null) {
  if (!db) {
    return {
      db: null,
      dbList: () => console.warn('LocalDB not available (SSR)'),
      dbGet: () => console.warn('LocalDB not available (SSR)'),
      dbCreate: () => console.warn('LocalDB not available (SSR)'),
      dbUpdate: () => console.warn('LocalDB not available (SSR)'),
      dbDelete: () => console.warn('LocalDB not available (SSR)'),
      dbListByIndex: () => console.warn('LocalDB not available (SSR)'),
      dbClear: () => console.warn('LocalDB not available (SSR)'),
      dbClearAll: () => console.warn('LocalDB not available (SSR)'),
      dbVersion: () => console.warn('LocalDB not available (SSR)'),
    };
  }

  return {
    db,

    dbList<T = unknown>(collection: string): T[] {
      const out = db.list<T & { id: string }>(collection);
      console.table(out);
      return out;
    },

    dbGet<T = unknown>(collection: string, id: string): T | null {
      const out = db.get<T & { id: string }>(collection, id);
      console.log(out);
      return out;
    },

    dbCreate<T = unknown>(collection: string, item: Record<string, unknown>): T | undefined {
      try {
        const out = db.create(collection, item);
        console.log('Created:', out);
        return out as T;
      } catch (e) {
        console.error(e);
        return undefined;
      }
    },

    dbUpdate<T = unknown>(collection: string, id: string, patch: Record<string, unknown>): T | null {
      const out = db.update<T & { id: string }>(collection, id, patch as Partial<T & { id: string }>);
      console.log('Updated:', out);
      return out as T | null;
    },

    dbDelete(collection: string, id: string): boolean {
      const out = db.delete(collection, id);
      console.log('Deleted:', out);
      return out;
    },

    dbListByIndex<T = unknown>(collection: string, field: string, value: string | null): T[] {
      const out = db.listByIndex<T & { id: string }>(collection, field, value);
      console.table(out);
      return out;
    },

    dbClear(collection: string): void {
      db.clear(collection);
      console.log(`Cleared collection: ${collection}`);
    },

    dbClearAll(): void {
      db.clearAll();
      console.log('Cleared all LocalDB data');
    },

    dbVersion(): { stored: number } {
      const stored = db.getStoredVersion();
      console.log('Stored version:', stored);
      return { stored };
    },

    dbTest(): void {
      const c = 'test_' + Date.now();
      const created = db.create(c, { name: 'foo', eventId: 'ev1', ownerUserId: 'u1' });
      console.log('create:', created);
      const list = db.list(c);
      console.log('list:', list);
      const byEvent = db.listByIndex(c, 'eventId', 'ev1');
      console.log('listByIndex eventId=ev1:', byEvent);
      const byOwner = db.listByIndex(c, 'ownerUserId', 'u1');
      console.log('listByIndex ownerUserId=u1:', byOwner);
      const updated = db.update(c, created.id, { name: 'bar' });
      console.log('update:', updated);
      const deleted = db.delete(c, created.id);
      console.log('delete:', deleted);
      db.clear(c);
      console.log('dbTest done');
    },
  };
}
