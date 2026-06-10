'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { syncOfflineValidations } from '@/lib/api/scanner';
import {
  getPendingQueuedScans,
  getSnapshotMeta,
  updateQueuedScan,
  getConflictQueuedScans,
  type QueuedScan,
} from '@/lib/db/offline-scanner';

const DEV_USER_ID_KEY = 'scanner:devUserId';

export type SyncSummary = {
  synced: number;
  conflicts: number;
  errors: number;
} | null;

function mapSyncCode(code: string): QueuedScan['syncStatus'] {
  if (code === 'synced') return 'synced';
  if (
    code === 'already_used' ||
    code === 'conflict' ||
    code === 'revoked' ||
    code === 'transferred'
  ) {
    return 'conflict';
  }
  return 'error';
}

export function useOfflineSync() {
  const [syncing, setSyncing] = useState(false);
  const [lastSummary, setLastSummary] = useState<SyncSummary>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = useCallback(async (): Promise<SyncSummary | null> => {
    if (!navigator.onLine || syncing) return null;
    const devUserId =
      typeof window !== 'undefined' ? localStorage.getItem(DEV_USER_ID_KEY) : null;
    if (!devUserId) return null;

    const pending = await getPendingQueuedScans();
    if (pending.length === 0) return null;

    const eventId = pending[0]!.eventId;
    const meta = await getSnapshotMeta(eventId);
    if (!meta) return null;

    setSyncing(true);
    try {
      const response = await syncOfflineValidations(devUserId, {
        snapshotVersion: meta.version,
        contentId: eventId,
        contentType: 'EVENT',
        validations: pending.map((p) => ({
          localId: p.localId,
          qrPayload: p.qrPayload,
          scannedAt: new Date(p.scannedAt).toISOString(),
          deviceId: p.deviceId,
        })),
      });

      for (const r of response.results) {
        const item = pending.find((p) => p.localId === r.localId);
        if (!item) continue;
        const status = mapSyncCode(r.code);
        await updateQueuedScan(item.id, {
          syncStatus: status,
          syncCode: r.code,
          syncMessage: r.message,
          ticketId: r.ticketId,
        });
      }

      setLastSummary(response.summary);
      return response.summary;
    } catch {
      return null;
    } finally {
      setSyncing(false);
    }
  }, [syncing]);

  useEffect(() => {
    const onOnline = () => void sync();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [sync]);

  return { sync, syncing, lastSummary, getConflictQueuedScans, getPendingQueuedScans };
}
