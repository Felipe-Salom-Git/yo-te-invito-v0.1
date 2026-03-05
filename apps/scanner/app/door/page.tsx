'use client';

import { useState, useCallback, useEffect } from 'react';
import { scanTicket, fetchEventTickets } from '@/lib/api/scanner';
import { scanOffline } from '@/lib/scan/offline-scan';
import { useOfflineSync } from '@/lib/hooks/use-offline-sync';
import {
  clearTicketsForEvent,
  saveTickets,
  getAllQueuedScans,
} from '@/lib/db/offline-scanner';
import type { ScanResponse } from '@yo-te-invito/shared';

const MAX_HISTORY = 20;

export default function DoorPage() {
  const [eventId, setEventId] = useState('');
  const [qrPayload, setQrPayload] = useState('');
  const [devUserId, setDevUserId] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('scanner:devUserId') ?? '' : '',
  );
  const [lastResult, setLastResult] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ScanResponse[]>([]);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [queuedCount, setQueuedCount] = useState(0);
  const [preloadStatus, setPreloadStatus] = useState<string | null>(null);

  useOfflineSync();

  const handleDevUserIdChange = useCallback((v: string) => {
    setDevUserId(v);
    if (typeof window !== 'undefined') {
      localStorage.setItem('scanner:devUserId', v);
    }
  }, []);

  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const count = await getAllQueuedScans().then((q) => q.length);
      if (!cancelled) setQueuedCount(count);
    };
    refresh();
    const id = setInterval(refresh, 2000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [lastResult]);

  async function handlePreload() {
    if (!eventId.trim() || !devUserId.trim()) {
      setPreloadStatus('Event ID and Dev User ID required');
      return;
    }
    setPreloadStatus('Loading…');
    try {
      const tickets = await fetchEventTickets(eventId.trim(), devUserId.trim());
      await clearTicketsForEvent(eventId.trim());
      await saveTickets(eventId.trim(), tickets);
      setPreloadStatus(`Preloaded ${tickets.length} tickets`);
    } catch (err) {
      setPreloadStatus('Preload failed');
    }
  }

  async function handleScan() {
    if (!eventId.trim() || !qrPayload.trim() || !devUserId.trim()) {
      setLastResult({ result: 'INVALID' });
      return;
    }

    setLoading(true);
    setLastResult(null);
    try {
      let res: ScanResponse;
      if (isOnline) {
        try {
          res = await scanTicket({
            eventId: eventId.trim(),
            qrPayload: qrPayload.trim(),
            devUserId: devUserId.trim(),
          });
        } catch {
          res = await scanOffline(eventId.trim(), qrPayload.trim());
        }
      } else {
        res = await scanOffline(eventId.trim(), qrPayload.trim());
      }
      setLastResult(res);
      setHistory((prev) => [res, ...prev].slice(0, MAX_HISTORY));
    } catch (err) {
      const invalid: ScanResponse = { result: 'INVALID' };
      setLastResult(invalid);
      setHistory((prev) => [invalid, ...prev].slice(0, MAX_HISTORY));
    } finally {
      setLoading(false);
    }
  }

  const isOk = lastResult?.result === 'OK';

  return (
    <main className="flex min-h-screen flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold text-white">Door — Scanner</h1>

      <div className="flex flex-row items-center gap-3 text-sm">
        <span
          className={`rounded-full px-3 py-1 font-medium ${
            isOnline ? 'bg-emerald-600/80 text-white' : 'bg-amber-600/80 text-white'
          }`}
        >
          {isOnline ? 'ONLINE' : 'OFFLINE'}
        </span>
        {queuedCount > 0 && (
          <span className="rounded-full bg-slate-600 px-3 py-1 text-slate-200">
            {queuedCount} queued
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4 max-w-md">
        <label className="text-sm text-slate-400">
          Event ID
          <input
            type="text"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Event ID"
            className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500"
          />
        </label>

        <label className="text-sm text-slate-400">
          Dev User ID (X-Dev-User-Id)
          <input
            type="text"
            value={devUserId}
            onChange={(e) => handleDevUserIdChange(e.target.value)}
            placeholder="User ID with SCANNER role"
            className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500"
          />
        </label>

        <label className="text-sm text-slate-400">
          QR Payload
          <input
            type="text"
            value={qrPayload}
            onChange={(e) => setQrPayload(e.target.value)}
            placeholder="yti:v1:..."
            className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500"
          />
        </label>

        <button
          type="button"
          onClick={handlePreload}
          className="rounded-xl border border-slate-500 bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
        >
          Preload tickets
        </button>
        {preloadStatus && (
          <p className="text-sm text-slate-400">{preloadStatus}</p>
        )}

        <button
          onClick={handleScan}
          disabled={loading}
          className="h-16 w-full rounded-2xl bg-emerald-600 text-xl font-bold text-white shadow-lg transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading ? 'Scanning…' : 'SCAN TICKET'}
        </button>
      </div>

      {lastResult && (
        <div
          className={`rounded-xl px-6 py-4 text-lg font-semibold ${
            isOk ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'
          }`}
        >
          {isOk
            ? `OK — ${lastResult.ticketTypeName ?? 'Valid'}`
            : lastResult.result}
        </div>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-slate-400">
            Last {history.length} scans
          </h2>
          <ul className="flex flex-col gap-1">
            {history.map((h, i) => (
              <li
                key={i}
                className={`rounded px-3 py-2 text-sm ${
                  h.result === 'OK' ? 'bg-emerald-800/50 text-emerald-300' : 'bg-red-900/50 text-red-300'
                }`}
              >
                {h.result}
                {h.ticketTypeName && ` — ${h.ticketTypeName}`}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
