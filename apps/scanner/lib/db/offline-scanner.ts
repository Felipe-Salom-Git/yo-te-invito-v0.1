const DB_NAME = 'ScannerOfflineDB';
const DB_VERSION = 1;
const TICKETS_STORE = 'tickets_store';
const SCAN_QUEUE_STORE = 'scan_queue';

export interface StoredTicket {
  ticketId: string;
  qrPayload: string;
  status: 'VALID' | 'USED' | 'REVOKED';
}

export interface QueuedScan {
  id: string;
  qrPayload: string;
  eventId: string;
  scannedAt: number;
  deviceId?: string;
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
        t.createIndex('status', 'status', { unique: false });
      }
      if (!db.objectStoreNames.contains(SCAN_QUEUE_STORE)) {
        db.createObjectStore(SCAN_QUEUE_STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function clearTicketsForEvent(eventId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TICKETS_STORE, 'readwrite');
    const store = tx.objectStore(TICKETS_STORE);
    const req = store.openCursor();
    const toDelete: string[] = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const v = cursor.value as StoredTicket & { eventId?: string };
        if (v.eventId === eventId) toDelete.push(v.qrPayload);
        cursor.continue();
      } else {
        toDelete.forEach((k) => store.delete(k));
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

export async function getTicketByQrPayload(
  qrPayload: string,
): Promise<(StoredTicket & { eventId?: string }) | null> {
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
): Promise<(StoredTicket & { eventId?: string }) | null> {
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
): Promise<void> {
  const db = await openDB();
  const item: QueuedScan = {
    id: genId(),
    qrPayload,
    eventId,
    scannedAt: Date.now(),
    deviceId,
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCAN_QUEUE_STORE, 'readwrite');
    tx.objectStore(SCAN_QUEUE_STORE).add(item);
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
