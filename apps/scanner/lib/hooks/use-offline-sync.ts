'use client';

import { useEffect, useRef, useCallback } from 'react';
import { scanTicket } from '@/lib/api/scanner';
import {
  getAllQueuedScans,
  removeFromScanQueue,
} from '@/lib/db/offline-scanner';

const SYNC_INTERVAL_MS = 30_000;
const DEV_USER_ID_KEY = 'scanner:devUserId';

export function useOfflineSync() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = useCallback(async () => {
    if (!navigator.onLine) return;
    const devUserId = typeof window !== 'undefined' ? localStorage.getItem(DEV_USER_ID_KEY) : null;
    if (!devUserId) return;

    const queue = await getAllQueuedScans();
    for (const item of queue) {
      try {
        const res = await scanTicket({
          eventId: item.eventId,
          qrPayload: item.qrPayload,
          deviceId: item.deviceId,
          devUserId,
        });
        if (res.result === 'OK' || res.result === 'ALREADY_USED') {
          await removeFromScanQueue(item.id);
        }
      } catch {
        break;
      }
    }
  }, []);

  useEffect(() => {
    const run = () => void sync();

    const onOnline = () => run();

    if (navigator.onLine) run();
    window.addEventListener('online', onOnline);

    intervalRef.current = setInterval(run, SYNC_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', onOnline);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sync]);

  return { sync };
}
