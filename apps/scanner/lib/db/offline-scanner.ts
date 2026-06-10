import type { OfflineSnapshotResponse } from '@yo-te-invito/shared';

const DB_NAME = 'ScannerOfflineDB';
const DB_VERSION = 2;
const TICKETS_STORE = 'tickets_store';
const SCAN_QUEUE_STORE = 'scan_queue';
const SNAPSHOT_META_STORE = 'snapshot_meta';

export type SyncQueueStatus = 'pending' | 'synced' | 'conflict' | 'error';

export interface StoredTicket {
  ticketId: string;
  qrPayload: string;
  status: 'VALID' | 'USED' | 'REVOKED' | 'TRANSFER_PENDING' | 'TRANSFERRED';
  eventId?: string;
  buyerName?: string;
  ticketType?: string;
  code?: string;
}

export interface QueuedScan {
  id: string;
  localId: string;
  qrPayload: string;
  eventId: string;
  scannedAt: number;
  deviceId?: string;
  syncStatus: SyncQueueStatus;
  syncCode?: string;
  syncMessage?: string;
  ticketId?: string;
}

export interface SnapshotMeta {
  eventId: string;
  snapshotId: string;
  version: string;
  generatedAt: string;
  expiresAt?: string;
  eventTitle: string;
  ticketCount: number;
  downloadedAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TICKETS_STORE)) {
        const t = db.createObjectStore(TICKETS_STORE, { keyPath: 'qrPayload' });
        t.createIndex('eventId', 'eventId', { unique: false });
        t.createIndex('status', 'status', { unique: false });
      }
      if (!db.objectStoreNames.contains(SCAN_QUEUE_STORE)) {
        const q = db.createObjectStore(SCAN_QUEUE_STORE, { keyPath: 'id' });
        q.createIndex('syncStatus', 'syncStatus', { unique: false });
        q.createIndex('eventId', 'eventId', { unique: false });
      }
      if (!db.objectStoreNames.contains(SNAPSHOT_META_STORE)) {
        db.createObjectStore(SNAPSHOT_META_STORE, { keyPath: 'eventId' });
      }
    };
  });
}

export async function clearTicketsForEvent(eventId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([TICKETS_STORE, SNAPSHOT_META_STORE], 'readwrite');
    const store = tx.objectStore(TICKETS_STORE);
    const req = store.openCursor();
    const toDelete: string[] = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const v = cursor.value as StoredTicket;
        if (v.eventId === eventId) toDelete.push(v.qrPayload);
        cursor.continue();
      } else {
        toDelete.forEach((k) => store.delete(k));
        tx.objectStore(SNAPSHOT_META_STORE).delete(eventId);
        db.close();
        resolve();
      }
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function saveSnapshot(snapshot: OfflineSnapshotResponse): Promise<void> {
  const eventId = snapshot.contentId;
  await clearTicketsForEvent(eventId);
  const db = await openDB();
  const tx = db.transaction([TICKETS_STORE, SNAPSHOT_META_STORE], 'readwrite');
  const ticketStore = tx.objectStore(TICKETS_STORE);
  for (const t of snapshot.tickets) {
    ticketStore.put({
      ticketId: t.ticketId,
      qrPayload: t.qrPayload,
      status: t.status as StoredTicket['status'],
      eventId,
      buyerName: t.buyerName,
      ticketType: t.ticketType,
      code: t.code,
    });
  }
  const meta: SnapshotMeta = {
    eventId,
    snapshotId: snapshot.snapshotId,
    version: snapshot.version,
    generatedAt: snapshot.generatedAt,
    expiresAt: snapshot.expiresAt,
    eventTitle: snapshot.eventTitle,
    ticketCount: snapshot.tickets.length,
    downloadedAt: new Date().toISOString(),
  };
  tx.objectStore(SNAPSHOT_META_STORE).put(meta);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/** @deprecated use saveSnapshot */
export async function saveTickets(
  eventId: string,
  tickets: { ticketId: string; qrPayload: string; status: string }[],
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(TICKETS_STORE, 'readwrite');
  const store = tx.objectStore(TICKETS_STORE);
  for (const t of tickets) {
    store.put({
      ...t,
      eventId,
      status: t.status as StoredTicket['status'],
    });
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getSnapshotMeta(eventId: string): Promise<SnapshotMeta | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SNAPSHOT_META_STORE, 'readonly');
    const req = tx.objectStore(SNAPSHOT_META_STORE).get(eventId);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as SnapshotMeta | undefined) ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function countTicketsForEvent(eventId: string): Promise<number> {
  const meta = await getSnapshotMeta(eventId);
  if (meta) return meta.ticketCount;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TICKETS_STORE, 'readonly');
    const req = tx.objectStore(TICKETS_STORE).index('eventId').getAll(eventId);
    req.onsuccess = () => {
      db.close();
      resolve((req.result as StoredTicket[]).length);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export function isSnapshotStale(meta: SnapshotMeta | null): boolean {
  if (!meta?.expiresAt) return false;
  return new Date(meta.expiresAt).getTime() < Date.now();
}

export async function getTicketByQrPayload(
  qrPayload: string,
): Promise<StoredTicket | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TICKETS_STORE, 'readonly');
    const req = tx.objectStore(TICKETS_STORE).get(qrPayload);
    req.onsuccess = () => {
      db.close();
      resolve(req.result ?? null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function getTicketForEvent(
  qrPayload: string,
  eventId: string,
): Promise<StoredTicket | null> {
  const t = await getTicketByQrPayload(qrPayload);
  if (!t || t.eventId !== eventId) return null;
  return t;
}

export async function markTicketUsed(qrPayload: string): Promise<void> {
  const t = await getTicketByQrPayload(qrPayload);
  if (!t) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TICKETS_STORE, 'readwrite');
    tx.objectStore(TICKETS_STORE).put({
      ...t,
      status: 'USED' as const,
    });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

function genId(): string {
  return `sq_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export async function addToScanQueue(
  qrPayload: string,
  eventId: string,
  deviceId?: string,
): Promise<string> {
  const db = await openDB();
  const localId = genId();
  const item: QueuedScan = {
    id: localId,
    localId,
    qrPayload,
    eventId,
    scannedAt: Date.now(),
    deviceId,
    syncStatus: 'pending',
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCAN_QUEUE_STORE, 'readwrite');
    tx.objectStore(SCAN_QUEUE_STORE).add(item);
    tx.oncomplete = () => {
      db.close();
      resolve(localId);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function getAllQueuedScans(): Promise<QueuedScan[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCAN_QUEUE_STORE, 'readonly');
    const req = tx.objectStore(SCAN_QUEUE_STORE).getAll();
    req.onsuccess = () => {
      db.close();
      resolve(req.result ?? []);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

export async function getPendingQueuedScans(): Promise<QueuedScan[]> {
  const all = await getAllQueuedScans();
  return all.filter((q) => q.syncStatus === 'pending' || q.syncStatus === 'error');
}

export async function getConflictQueuedScans(): Promise<QueuedScan[]> {
  const all = await getAllQueuedScans();
  return all.filter((q) => q.syncStatus === 'conflict');
}

export async function updateQueuedScan(
  id: string,
  patch: Partial<Pick<QueuedScan, 'syncStatus' | 'syncCode' | 'syncMessage' | 'ticketId'>>,
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCAN_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(SCAN_QUEUE_STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      const existing = req.result as QueuedScan | undefined;
      if (!existing) {
        db.close();
        resolve();
        return;
      }
      store.put({ ...existing, ...patch });
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function removeFromScanQueue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCAN_QUEUE_STORE, 'readwrite');
    tx.objectStore(SCAN_QUEUE_STORE).delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
