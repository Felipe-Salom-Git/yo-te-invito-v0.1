'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  classifyQrScanPayload,
  type ScanResponse,
  type ValidateGastroDiscountResponse,
} from '@yo-te-invito/shared';
import { scanTicket, fetchEventTickets, validateGastroDiscount } from '@/lib/api/scanner';
import { scanOffline } from '@/lib/scan/offline-scan';
import { useOfflineSync } from '@/lib/hooks/use-offline-sync';
import {
  clearTicketsForEvent,
  saveTickets,
  getAllQueuedScans,
} from '@/lib/db/offline-scanner';

const MAX_HISTORY = 20;

type ScanHistoryItem =
  | { kind: 'ticket'; result: ScanResponse }
  | { kind: 'gastro-discount'; result: ValidateGastroDiscountResponse };

function gastroStatusClass(status: ValidateGastroDiscountResponse['status']): string {
  if (status === 'VALID') return 'bg-emerald-700 text-white';
  if (status === 'ALREADY_USED' || status === 'LIMIT_REACHED') return 'bg-amber-700 text-white';
  return 'bg-red-700 text-white';
}

export default function DoorPage() {
  const [eventId, setEventId] = useState('');
  const [qrPayload, setQrPayload] = useState('');
  const [devUserId, setDevUserId] = useState(
    typeof window !== 'undefined' ? localStorage.getItem('scanner:devUserId') ?? '' : '',
  );
  const [lastTicket, setLastTicket] = useState<ScanResponse | null>(null);
  const [lastGastro, setLastGastro] = useState<ValidateGastroDiscountResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [queuedCount, setQueuedCount] = useState(0);
  const [preloadStatus, setPreloadStatus] = useState<string | null>(null);

  const payloadFamily = classifyQrScanPayload(qrPayload);

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
  }, [lastTicket, lastGastro]);

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
    } catch {
      setPreloadStatus('Preload failed');
    }
  }

  async function handleScan() {
    if (!qrPayload.trim() || !devUserId.trim()) {
      setLastTicket({ result: 'INVALID' });
      setLastGastro(null);
      return;
    }

    const family = classifyQrScanPayload(qrPayload.trim());

    if (family === 'gastro-discount') {
      setLoading(true);
      setLastTicket(null);
      setLastGastro(null);
      try {
        if (!isOnline) {
          setLastGastro({
            status: 'INVALID',
            title: 'Sin conexión',
            message: 'Los descuentos gastronómicos requieren conexión para validar.',
          });
          return;
        }
        const res = await validateGastroDiscount({
          qrPayload: qrPayload.trim(),
          devUserId: devUserId.trim(),
        });
        setLastGastro(res);
        const gastroItem: ScanHistoryItem = { kind: 'gastro-discount', result: res };
        setHistory((prev) => [gastroItem, ...prev].slice(0, MAX_HISTORY));
      } catch {
        setLastGastro({
          status: 'INVALID',
          title: 'Error',
          message: 'No se pudo validar el descuento.',
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!eventId.trim()) {
      setLastTicket({ result: 'INVALID' });
      setLastGastro(null);
      return;
    }

    setLoading(true);
    setLastGastro(null);
    setLastTicket(null);
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
      setLastTicket(res);
      const ticketItem: ScanHistoryItem = { kind: 'ticket', result: res };
      setHistory((prev) => [ticketItem, ...prev].slice(0, MAX_HISTORY));
    } catch {
      const invalid: ScanResponse = { result: 'INVALID' };
      setLastTicket(invalid);
      const invalidItem: ScanHistoryItem = { kind: 'ticket', result: invalid };
      setHistory((prev) => [invalidItem, ...prev].slice(0, MAX_HISTORY));
    } finally {
      setLoading(false);
    }
  }

  const ticketOk = lastTicket?.result === 'OK';
  const gastroOk = lastGastro?.status === 'VALID';

  return (
    <main className="flex min-h-screen flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold text-white">Door — Scanner</h1>
      <p className="text-sm text-slate-400">
        Entradas (<span className="font-mono text-slate-300">yti:v1:</span>) y descuentos gastro (
        <span className="font-mono text-slate-300">yti:gastro-discount:v1:</span>).
      </p>

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
        {payloadFamily !== 'unknown' && qrPayload.trim() && (
          <span
            className={`rounded-full px-3 py-1 font-medium ${
              payloadFamily === 'gastro-discount'
                ? 'bg-violet-600/80 text-white'
                : 'bg-sky-600/80 text-white'
            }`}
          >
            {payloadFamily === 'gastro-discount' ? 'DESCUENTO GASTRO' : 'ENTRADA'}
          </span>
        )}
      </div>

      <div className="flex max-w-md flex-col gap-4">
        <label className="text-sm text-slate-400">
          Event ID <span className="text-slate-500">(solo entradas)</span>
          <input
            type="text"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Event ID"
            disabled={payloadFamily === 'gastro-discount'}
            className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 disabled:opacity-50"
          />
        </label>

        <label className="text-sm text-slate-400">
          Dev User ID (X-Dev-User-Id)
          <input
            type="text"
            value={devUserId}
            onChange={(e) => handleDevUserIdChange(e.target.value)}
            placeholder="User ID with SCANNER or GASTRO_OWNER role"
            className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500"
          />
        </label>

        <label className="text-sm text-slate-400">
          QR Payload
          <input
            type="text"
            value={qrPayload}
            onChange={(e) => setQrPayload(e.target.value)}
            placeholder="yti:v1:… o yti:gastro-discount:v1:…"
            className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500"
          />
        </label>

        {payloadFamily === 'ticket' && (
          <>
            <button
              type="button"
              onClick={handlePreload}
              className="rounded-xl border border-slate-500 bg-slate-700 px-4 py-2 text-sm font-medium text-white hover:bg-slate-600"
            >
              Preload tickets
            </button>
            {preloadStatus && <p className="text-sm text-slate-400">{preloadStatus}</p>}
          </>
        )}

        <button
          type="button"
          onClick={handleScan}
          disabled={loading}
          className="h-16 w-full rounded-2xl bg-emerald-600 text-xl font-bold text-white shadow-lg transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {loading
            ? 'Escaneando…'
            : payloadFamily === 'gastro-discount'
              ? 'VALIDAR DESCUENTO'
              : 'ESCANEAR ENTRADA'}
        </button>
      </div>

      {lastTicket && (
        <div
          className={`rounded-xl px-6 py-4 text-lg font-semibold ${
            ticketOk ? 'bg-emerald-700 text-white' : 'bg-red-700 text-white'
          }`}
        >
          <p className="text-xs font-normal uppercase tracking-wide text-white/80">Entrada</p>
          {ticketOk
            ? `OK — ${lastTicket.ticketTypeName ?? 'Válida'}`
            : lastTicket.result}
        </div>
      )}

      {lastGastro && (
        <div className={`rounded-xl px-6 py-4 ${gastroStatusClass(lastGastro.status)}`}>
          <p className="text-xs font-normal uppercase tracking-wide text-white/80">
            Descuento gastro · {lastGastro.status}
          </p>
          <p className="mt-1 text-lg font-semibold">{lastGastro.title}</p>
          <p className="mt-2 text-sm text-white/90">{lastGastro.message}</p>
          {lastGastro.discount && (
            <p className="mt-2 text-sm font-medium">
              {lastGastro.discount.title} · {lastGastro.discount.valueLabel}
              {lastGastro.discount.localName ? ` · ${lastGastro.discount.localName}` : ''}
            </p>
          )}
        </div>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-slate-400">Last {history.length} scans</h2>
          <ul className="flex flex-col gap-1">
            {history.map((h, i) =>
              h.kind === 'ticket' ? (
                <li
                  key={i}
                  className={`rounded px-3 py-2 text-sm ${
                    h.result.result === 'OK'
                      ? 'bg-emerald-800/50 text-emerald-300'
                      : 'bg-red-900/50 text-red-300'
                  }`}
                >
                  <span className="text-xs text-slate-500">Entrada · </span>
                  {h.result.result}
                  {h.result.ticketTypeName && ` — ${h.result.ticketTypeName}`}
                </li>
              ) : (
                <li
                  key={i}
                  className={`rounded px-3 py-2 text-sm ${
                    h.result.status === 'VALID'
                      ? 'bg-violet-800/50 text-violet-200'
                      : h.result.status === 'ALREADY_USED'
                        ? 'bg-amber-900/50 text-amber-200'
                        : 'bg-red-900/50 text-red-300'
                  }`}
                >
                  <span className="text-xs text-slate-500">Gastro · </span>
                  {h.result.status} — {h.result.title}
                </li>
              ),
            )}
          </ul>
        </section>
      )}
    </main>
  );
}
