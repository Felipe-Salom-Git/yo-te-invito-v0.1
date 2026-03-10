/**
 * LocalDB — localStorage-backed CRUD layer with indexes and migration version.
 * Uses JSON per collection. Indexes: eventId, ownerUserId (configurable).
 */

export interface LocalDBOptions {
  prefix?: string;
  version?: number;
  /** Index fields per collection: field -> true */
  indexes?: Record<string, string[]>;
}

const STORAGE_VERSION_KEY = 'yti:localdb:version';

function generateId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export class LocalDB {
  private prefix: string;
  private version: number;
  private indexes: Record<string, string[]>;
  private storage: Storage;

  constructor(
    options: LocalDBOptions = {},
    storage: Storage = typeof window !== 'undefined' ? localStorage : (null as unknown as Storage)
  ) {
    this.prefix = options.prefix ?? 'yti:localdb:';
    this.version = options.version ?? 1;
    this.indexes = options.indexes ?? {
      tickets: ['eventId', 'ownerUserId'],
      events: ['tenantId'],
    };
    this.storage = storage;
  }

  private collectionKey(name: string): string {
    return `${this.prefix}v${this.version}:${name}`;
  }

  private indexKey(collection: string, field: string): string {
    return `${this.prefix}v${this.version}:idx:${collection}:${field}`;
  }

  private readCollection<T extends { id: string }>(name: string): Record<string, T> {
    try {
      const raw = this.storage.getItem(this.collectionKey(name));
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, T>;
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeCollection<T extends { id: string }>(name: string, data: Record<string, T>): void {
    this.storage.setItem(this.collectionKey(name), JSON.stringify(data));
  }

  private readIndex(collection: string, field: string): Record<string, string[]> {
    try {
      const raw = this.storage.getItem(this.indexKey(collection, field));
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, string[]>;
      return typeof parsed === 'object' && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  private writeIndex(collection: string, field: string, idx: Record<string, string[]>): void {
    this.storage.setItem(this.indexKey(collection, field), JSON.stringify(idx));
  }

  private updateIndexForItem<T extends Record<string, unknown>>(
    collection: string,
    field: string,
    item: T,
    mode: 'add' | 'remove'
  ): void {
    const fields = this.indexes[collection];
    if (!fields?.includes(field)) return;

    const value = item[field];
    const key = value != null ? String(value) : '__null__';
    const idx = this.readIndex(collection, field);

    if (mode === 'add') {
      const ids = idx[key] ?? [];
      if (!ids.includes(item.id as string)) {
        idx[key] = [...ids, item.id as string];
        this.writeIndex(collection, field, idx);
      }
    } else {
      const ids = (idx[key] ?? []).filter((id) => id !== item.id);
      if (ids.length === 0) delete idx[key];
      else idx[key] = ids;
      this.writeIndex(collection, field, idx);
    }
  }

  private rebuildIndexes<T extends { id: string }>(collection: string, data: Record<string, T>): void {
    const fields = this.indexes[collection];
    if (!fields) return;

    for (const field of fields) {
      const idx: Record<string, string[]> = {};
      for (const item of Object.values(data)) {
        const value = (item as Record<string, unknown>)[field];
        const key = value != null ? String(value) : '__null__';
        if (!idx[key]) idx[key] = [];
        idx[key].push(item.id);
      }
      this.writeIndex(collection, field, idx);
    }
  }

  /** Get stored schema version. */
  getStoredVersion(): number {
    try {
      const raw = this.storage.getItem(STORAGE_VERSION_KEY);
      return raw ? parseInt(raw, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  /** Set schema version (call after migrations). */
  setVersion(v: number): void {
    this.storage.setItem(STORAGE_VERSION_KEY, String(v));
  }

  /** Run migration if stored version < current. */
  migrate(migrateFn: (fromVersion: number, toVersion: number) => void): void {
    const stored = this.getStoredVersion();
    if (stored < this.version) {
      migrateFn(stored, this.version);
      this.setVersion(this.version);
    }
  }

  list<T extends { id: string }>(collection: string): T[] {
    const data = this.readCollection<T>(collection);
    return Object.values(data);
  }

  get<T extends { id: string }>(collection: string, id: string): T | null {
    const data = this.readCollection<T>(collection);
    return data[id] ?? null;
  }

  create<T extends Record<string, unknown> & { id?: string }>(
    collection: string,
    item: T
  ): T & { id: string } {
    const raw = item as Record<string, unknown>;
    const id = (raw.id as string | undefined) ?? generateId();
    const full = { ...raw, id } as T & { id: string };
    const data = this.readCollection<T & { id: string }>(collection);
    if (data[id]) throw new Error(`LocalDB: duplicate id ${id} in ${collection}`);
    data[id] = full;
    this.writeCollection(collection, data);

    const fields = this.indexes[collection];
    if (fields) {
      for (const field of fields) {
        this.updateIndexForItem(collection, field, full as T & Record<string, unknown>, 'add');
      }
    }
    return full as T & { id: string };
  }

  update<T extends { id: string }>(collection: string, id: string, patch: Partial<T> | Record<string, unknown>): T | null {
    const data = this.readCollection<T>(collection);
    const existing = data[id];
    if (!existing) return null;

    const fields = this.indexes[collection];
    if (fields) {
      for (const field of fields) {
        this.updateIndexForItem(collection, field, existing as T & Record<string, unknown>, 'remove');
      }
    }

    const updated = { ...existing, ...patch, id } as T;
    data[id] = updated;
    this.writeCollection(collection, data);

    if (fields) {
      for (const field of fields) {
        this.updateIndexForItem(collection, field, updated as T & Record<string, unknown>, 'add');
      }
    }
    return updated;
  }

  delete(collection: string, id: string): boolean {
    const data = this.readCollection(collection);
    const existing = data[id];
    if (!existing) return false;

    const fields = this.indexes[collection];
    if (fields) {
      for (const field of fields) {
        this.updateIndexForItem(collection, field, existing as Record<string, unknown>, 'remove');
      }
    }

    delete data[id];
    this.writeCollection(collection, data);
    return true;
  }

  /** List items where field === value (uses index if available, else filters in-memory). */
  listByIndex<T extends { id: string }>(
    collection: string,
    field: string,
    value: string | null
  ): T[] {
    const key = value != null ? String(value) : '__null__';
    const idx = this.readIndex(collection, field);
    const ids = idx[key];
    const data = this.readCollection<T>(collection);

    if (ids?.length) {
      return ids.map((id) => data[id]).filter(Boolean);
    }
    const items = Object.values(data);
    return value == null
      ? items.filter((i) => (i as Record<string, unknown>)[field] == null)
      : items.filter((i) => (i as Record<string, unknown>)[field] === value);
  }

  /** Clear all data for a collection. */
  clear(collection: string): void {
    const data: Record<string, never> = {};
    this.writeCollection(collection, data);
    const fields = this.indexes[collection];
    if (fields) {
      for (const field of fields) {
        this.writeIndex(collection, field, {});
      }
    }
  }

  /** Clear all LocalDB data (all collections + version). */
  clearAll(): void {
    const keys: string[] = [];
    for (let i = 0; i < this.storage.length; i++) {
      const k = this.storage.key(i);
      if (k?.startsWith(this.prefix) || k === STORAGE_VERSION_KEY) keys.push(k);
    }
    keys.forEach((k) => this.storage.removeItem(k));
  }
}

export const defaultLocalDB = typeof window !== 'undefined' ? new LocalDB() : null;
