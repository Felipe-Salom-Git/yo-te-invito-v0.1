'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  classifyQrScanPayload,
  parseGastroDiscountQrPayload,
  type ScanResponse,
  type ScannerScanTargetsResponse,
  type ValidateGastroDiscountResponse,
} from '@yo-te-invito/shared';
import {
  scanTicket,
  fetchEventSnapshot,
  validateGastroDiscount,
  fetchScanTargets,
  downloadEventTicketsPdf,
  fetchEventOccurrences,
  type ScannerEventOccurrence,
} from '@/lib/api/scanner';
import { scanOffline, type OfflineScanResult } from '@/lib/scan/offline-scan';
import { useOfflineSync } from '@/lib/hooks/use-offline-sync';
import {
  clearTicketsForEvent,
  saveSnapshot,
  getSnapshotMeta,
  getPendingQueuedScans,
  getConflictQueuedScans,
  type SnapshotMeta,
} from '@/lib/db/offline-scanner';
import { QrCameraScanner } from '@/components/QrCameraScanner';
import { ScannerConnectionStatus } from '@/components/ScannerConnectionStatus';
import { OfflineConflictPanel } from '@/components/OfflineConflictPanel';
import { ScannerOperationalMenu } from '@/components/ScannerOperationalMenu';
import { ScanResultModal, type ScanResultModalData } from '@/components/ScanResultModal';
import { ScannerTicketListPanel } from '@/components/ScannerTicketListPanel';

const MAX_HISTORY = 20;
const LS_LAST_EVENT = 'scanner:lastEventId';
const LS_LAST_DISCOUNT = 'scanner:lastDiscountId';
const LS_LAST_OCCURRENCE = 'scanner:lastOccurrenceId';
const LS_INPUT_MODE = 'scanner:inputMode';

type DoorScannerClientProps = {
  userLabel: string;
  userEmail: string;
  onLogout: () => void;
};

type ScanHistoryItem =
  | { kind: 'ticket'; result: ScanResponse | OfflineScanResult }
  | { kind: 'gastro-discount'; result: ValidateGastroDiscountResponse };

type InputMode = 'camera' | 'manual';

function gastroStatusClass(status: ValidateGastroDiscountResponse['status']): string {
  if (status === 'VALID') return 'bg-emerald-700 text-white';
  if (status === 'ALREADY_USED' || status === 'LIMIT_REACHED') return 'bg-amber-700 text-white';
  return 'bg-red-700 text-white';
}

function formatOccurrenceLabel(occ: ScannerEventOccurrence): string {
  return new Date(occ.startAt).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function scanResultLabel(result: ScanResponse['result']): string {
  if (result === 'WRONG_OCCURRENCE') {
    return 'Fecha incorrecta — esta entrada es para otra función';
  }
  return result;
}

function formatEventLabel(e: ScannerScanTargetsResponse['events'][number]): string {
  const date = e.startAt
    ? new Date(e.startAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
    : 'Sin fecha';
  return `${e.title} · ${date}${e.city ? ` · ${e.city}` : ''}`;
}

export function DoorScannerClient({ userLabel, userEmail, onLogout }: DoorScannerClientProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [ticketListOpen, setTicketListOpen] = useState(false);
  const [targets, setTargets] = useState<ScannerScanTargetsResponse | null>(null);
  const [targetsError, setTargetsError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState('');
  const [eventOccurrences, setEventOccurrences] = useState<ScannerEventOccurrence[]>([]);
  const [occurrencesError, setOccurrencesError] = useState<string | null>(null);
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [qrPayload, setQrPayload] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('camera');
  const [lastTicket, setLastTicket] = useState<ScanResultModalData | null>(null);
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [lastGastro, setLastGastro] = useState<ValidateGastroDiscountResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [snapshotMeta, setSnapshotMeta] = useState<SnapshotMeta | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [conflicts, setConflicts] = useState<Awaited<ReturnType<typeof getConflictQueuedScans>>>([]);
  const [offlineStatus, setOfflineStatus] = useState<string | null>(null);
  const [pdfStatus, setPdfStatus] = useState<string | null>(null);
  const scanningRef = useRef(false);
  const targetSectionRef = useRef<HTMLDivElement>(null);
  const scanSectionRef = useRef<HTMLDivElement>(null);

  const { sync, syncing, lastSummary } = useOfflineSync();

  const payloadFamily = classifyQrScanPayload(qrPayload);
  const isProducer = targets?.parentProfileType === 'PRODUCER';
  const isGastro = targets?.parentProfileType === 'GASTRO';

  const refreshOfflineState = useCallback(async (eventId: string) => {
    if (!eventId) {
      setSnapshotMeta(null);
      setPendingCount(0);
      setConflicts([]);
      return;
    }
    const [meta, pending, conflictItems] = await Promise.all([
      getSnapshotMeta(eventId),
      getPendingQueuedScans(),
      getConflictQueuedScans(),
    ]);
    setSnapshotMeta(meta);
    setPendingCount(pending.filter((p) => p.eventId === eventId).length);
    setConflicts(conflictItems.filter((c) => c.eventId === eventId));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSelectedEventId(localStorage.getItem(LS_LAST_EVENT) ?? '');
    setSelectedOccurrenceId(localStorage.getItem(LS_LAST_OCCURRENCE) ?? '');
    setSelectedDiscountId(localStorage.getItem(LS_LAST_DISCOUNT) ?? '');
    const mode = localStorage.getItem(LS_INPUT_MODE);
    if (mode === 'manual' || mode === 'camera') setInputMode(mode);
    setIsOnline(navigator.onLine);
  }, []);

  useEffect(() => {
    if (selectedEventId) void refreshOfflineState(selectedEventId);
  }, [selectedEventId, refreshOfflineState, lastTicket, lastSummary]);

  const loadTargets = useCallback(async () => {
    setTargetsError(null);
    setOccurrencesError(null);
    try {
      const data = await fetchScanTargets();
      setTargets(data);
      if (data.parentProfileType === 'PRODUCER') {
        const stored = localStorage.getItem(LS_LAST_EVENT);
        if (data.events.length === 0) {
          setSelectedEventId('');
          localStorage.removeItem(LS_LAST_EVENT);
          localStorage.removeItem(LS_LAST_OCCURRENCE);
          if (stored) {
            setOccurrencesError('Este evento ya no está disponible para escanear.');
          }
        } else {
          const valid = stored && data.events.some((e) => e.id === stored);
          if (stored && !valid) {
            setOccurrencesError('Este evento ya no está disponible para escanear.');
            localStorage.removeItem(LS_LAST_EVENT);
            localStorage.removeItem(LS_LAST_OCCURRENCE);
          }
          const id = valid ? stored! : data.events[0]!.id;
          setSelectedEventId(id);
          localStorage.setItem(LS_LAST_EVENT, id);
        }
      }
      if (data.parentProfileType === 'GASTRO' && data.discounts.length > 0) {
        const stored = localStorage.getItem(LS_LAST_DISCOUNT);
        const valid = stored && data.discounts.some((d) => d.id === stored);
        const id = valid ? stored! : data.discounts[0]!.id;
        setSelectedDiscountId(id);
        localStorage.setItem(LS_LAST_DISCOUNT, id);
      }
    } catch {
      setTargets(null);
      setTargetsError('No se pudo cargar el contexto del scanner. Verificá tu usuario y vínculo activo.');
    }
  }, []);

  useEffect(() => {
    void loadTargets();
  }, [loadTargets]);

  useEffect(() => {
    if (!selectedEventId || !isProducer) {
      setEventOccurrences([]);
      setOccurrencesError(null);
      return;
    }
    const inTargets = targets?.events.some((e) => e.id === selectedEventId);
    if (targets && !inTargets) {
      setEventOccurrences([]);
      setSelectedEventId('');
      localStorage.removeItem(LS_LAST_EVENT);
      localStorage.removeItem(LS_LAST_OCCURRENCE);
      setOccurrencesError('Este evento ya no está disponible para escanear.');
      return;
    }
    setOccurrencesError(null);
    void fetchEventOccurrences(selectedEventId)
      .then((data) => {
        setEventOccurrences(data.isMultiDate ? data.occurrences : []);
        if (!data.isMultiDate || data.occurrences.length === 0) {
          setSelectedOccurrenceId('');
          localStorage.removeItem(LS_LAST_OCCURRENCE);
          return;
        }
        const stored = localStorage.getItem(LS_LAST_OCCURRENCE);
        const valid = stored && data.occurrences.some((o) => o.id === stored);
        const id = valid ? stored! : data.occurrences[0]!.id;
        setSelectedOccurrenceId(id);
        localStorage.setItem(LS_LAST_OCCURRENCE, id);
      })
      .catch((err: unknown) => {
        setEventOccurrences([]);
        setOccurrencesError(
          err instanceof Error
            ? err.message
            : 'Este evento ya no está disponible para escanear.',
        );
      });
  }, [selectedEventId, isProducer, targets]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const setMode = (mode: InputMode) => {
    setInputMode(mode);
    localStorage.setItem(LS_INPUT_MODE, mode);
  };

  const enrichTicketResult = useCallback(
    (res: ScanResponse | OfflineScanResult, connectionError?: boolean): ScanResultModalData => {
      const eventTitle = targets?.events.find((e) => e.id === selectedEventId)?.title;
      const occ = eventOccurrences.find((o) => o.id === selectedOccurrenceId);
      const occurrenceLabel = occ ? formatOccurrenceLabel(occ) : undefined;
      return {
        ...res,
        eventTitle: res.eventTitle ?? eventTitle,
        occurrenceLabel: res.occurrenceLabel ?? occurrenceLabel,
        connectionError,
      };
    },
    [targets, selectedEventId, eventOccurrences, selectedOccurrenceId],
  );

  const processScan = useCallback(
    async (rawPayload: string) => {
      const trimmed = rawPayload.trim();
      if (!trimmed || scanningRef.current) return;

      scanningRef.current = true;
      setQrPayload(trimmed);
      const family = classifyQrScanPayload(trimmed);

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
          const parsed = parseGastroDiscountQrPayload(trimmed);
          if (isGastro && selectedDiscountId && parsed?.discountId !== selectedDiscountId) {
            setLastGastro({
              status: 'INVALID',
              title: 'Descuento incorrecto',
              message: 'El QR no corresponde al descuento seleccionado.',
            });
            return;
          }
          const res = await validateGastroDiscount({
            qrPayload: trimmed,
          });
          setLastGastro(res);
          setHistory((prev) =>
            [{ kind: 'gastro-discount' as const, result: res }, ...prev].slice(0, MAX_HISTORY),
          );
        } catch {
          setLastGastro({
            status: 'INVALID',
            title: 'Error',
            message: 'No se pudo validar el descuento.',
          });
        } finally {
          setLoading(false);
          scanningRef.current = false;
        }
        return;
      }

      const eventId = selectedEventId.trim();
      if (!eventId) {
        setLastTicket({ result: 'INVALID' });
        setScanModalOpen(true);
        setLastGastro(null);
        scanningRef.current = false;
        return;
      }

      setLoading(true);
      setLastGastro(null);
      setLastTicket(null);
      try {
        let res: ScanResponse | OfflineScanResult;
        let connectionError = false;
        if (isOnline) {
          try {
            res = await scanTicket({
              eventId,
              qrPayload: trimmed,
              ...(selectedOccurrenceId ? { occurrenceId: selectedOccurrenceId } : {}),
            });
          } catch {
            connectionError = true;
            res = await scanOffline(eventId, trimmed);
          }
        } else {
          res = await scanOffline(eventId, trimmed);
        }
        const enriched = enrichTicketResult(
          res,
          connectionError &&
            res.result === 'INVALID' &&
            !('offline' in res && res.offline)
            ? true
            : undefined,
        );
        setLastTicket(enriched);
        setScanModalOpen(true);
        setHistory((prev) =>
          [{ kind: 'ticket' as const, result: res }, ...prev].slice(0, MAX_HISTORY),
        );
        await refreshOfflineState(eventId);
      } catch {
        const invalid: ScanResultModalData = enrichTicketResult(
          { result: 'INVALID' },
          true,
        );
        setLastTicket(invalid);
        setScanModalOpen(true);
        setHistory((prev) =>
          [{ kind: 'ticket' as const, result: invalid }, ...prev].slice(0, MAX_HISTORY),
        );
      } finally {
        setLoading(false);
        scanningRef.current = false;
      }
    },
    [
      isOnline,
      isGastro,
      selectedDiscountId,
      selectedEventId,
      selectedOccurrenceId,
      refreshOfflineState,
      enrichTicketResult,
    ],
  );

  async function handleSaveSnapshot() {
    const eventId = selectedEventId.trim();
    if (!eventId) {
      setOfflineStatus('Seleccioná un evento primero');
      return;
    }
    if (!isOnline) {
      setOfflineStatus('Necesitás conexión para descargar el listado');
      return;
    }
    const existing = await getSnapshotMeta(eventId);
    if (existing) {
      const ok = window.confirm(
        'Ya hay un listado guardado para este evento. ¿Querés reemplazarlo?',
      );
      if (!ok) return;
    }
    setOfflineStatus('Guardando listado…');
    try {
      const snapshot = await fetchEventSnapshot(eventId);
      await saveSnapshot(snapshot);
      await refreshOfflineState(eventId);
      setOfflineStatus(`${snapshot.tickets.length} entradas guardadas para modo offline`);
    } catch {
      setOfflineStatus('Error al guardar. Verificá permisos y conexión.');
    }
  }

  async function handleDeleteSnapshot() {
    const eventId = selectedEventId.trim();
    if (!eventId) return;
    const ok = window.confirm('¿Borrar el listado offline de este evento?');
    if (!ok) return;
    await clearTicketsForEvent(eventId);
    await refreshOfflineState(eventId);
    setOfflineStatus('Listado local borrado');
  }

  async function handleDownloadPdf() {
    const eventId = selectedEventId.trim();
    if (!eventId) {
      setPdfStatus('Seleccioná un evento primero');
      return;
    }
    if (!isOnline) {
      setPdfStatus('Necesitás conexión para descargar el PDF');
      return;
    }
    setPdfStatus('Descargando…');
    try {
      const { blob, filename } = await downloadEventTicketsPdf(eventId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setPdfStatus('PDF descargado');
    } catch (e) {
      setPdfStatus(e instanceof Error ? e.message : 'Error al descargar PDF');
    }
  }

  async function handleManualSync() {
    if (!isOnline) {
      setOfflineStatus('Sin conexión para sincronizar');
      return;
    }
    const summary = await sync();
    if (selectedEventId) await refreshOfflineState(selectedEventId);
    if (summary) {
      setOfflineStatus(
        `Sync: ${summary.synced} OK · ${summary.conflicts} conflictos · ${summary.errors} errores`,
      );
    }
  }

  const selectedEvent = targets?.events.find((e) => e.id === selectedEventId);
  const selectedDiscount = targets?.discounts.find((d) => d.id === selectedDiscountId);
  const targetLabel = isProducer
    ? selectedEvent?.title ?? null
    : isGastro
      ? selectedDiscount?.title ?? null
      : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 p-4 pb-8 sm:p-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Scanner — Puerta</h1>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            {userLabel} · {userEmail}
          </p>
          {targets?.parentDisplayName && (
            <p className="mt-0.5 text-xs text-slate-500">
              Cuenta: {targets.parentDisplayName}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="shrink-0 rounded-lg border border-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          aria-label="Abrir menú"
        >
          Menú
        </button>
      </header>

      <ScannerOperationalMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        isOnline={isOnline}
        userLabel={userLabel}
        parentLabel={targets?.parentDisplayName ?? null}
        targetLabel={targetLabel}
        canDownloadPdf={isProducer && !!selectedEventId}
        canSaveOffline={isProducer && !!selectedEventId}
        canTicketList={isProducer && !!selectedEventId}
        canSync={isProducer && pendingCount > 0}
        syncing={syncing}
        actions={{
          onScanFocus: () => scanSectionRef.current?.scrollIntoView({ behavior: 'smooth' }),
          onSelectTarget: () => targetSectionRef.current?.scrollIntoView({ behavior: 'smooth' }),
          onTicketList: () => setTicketListOpen(true),
          onDownloadPdf: () => void handleDownloadPdf(),
          onSaveOffline: () => void handleSaveSnapshot(),
          onSync: () => void handleManualSync(),
          onLogout,
        }}
      />

      <ScannerTicketListPanel
        open={ticketListOpen}
        onClose={() => setTicketListOpen(false)}
        eventId={selectedEventId}
        eventTitle={selectedEvent?.title ?? null}
        isOnline={isOnline}
        selectedOccurrenceId={selectedOccurrenceId}
      />

      <ScannerConnectionStatus
        isOnline={isOnline}
        snapshotMeta={snapshotMeta}
        pendingCount={pendingCount}
        conflictCount={conflicts.length}
        syncing={syncing}
        lastSummary={lastSummary}
      />

      <OfflineConflictPanel conflicts={conflicts} />

      <div
        ref={targetSectionRef}
        className="flex flex-col gap-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4"
      >
        {targetsError && <p className="text-sm text-red-300">{targetsError}</p>}

        {isProducer && targets && targets.events.length > 0 && (
          <label className="text-sm text-slate-400">
            Evento
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                localStorage.setItem(LS_LAST_EVENT, e.target.value);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white"
            >
              {targets.events.map((e) => (
                <option key={e.id} value={e.id}>
                  {formatEventLabel(e)}
                  {e.ticketsValid != null ? ` · ${e.ticketsValid} válidas` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        {isProducer && occurrencesError && (
          <p className="text-sm text-amber-300" role="alert">
            {occurrencesError}
          </p>
        )}

        {isProducer && eventOccurrences.length > 0 && (
          <label className="text-sm text-slate-400">
            Función / fecha
            <select
              value={selectedOccurrenceId}
              onChange={(e) => {
                setSelectedOccurrenceId(e.target.value);
                localStorage.setItem(LS_LAST_OCCURRENCE, e.target.value);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white"
            >
              {eventOccurrences.map((occ) => (
                <option key={occ.id} value={occ.id}>
                  {formatOccurrenceLabel(occ)}
                  {occ.venueName ? ` · ${occ.venueName}` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        {isProducer && targets && targets.events.length === 0 && (
          <p className="text-sm text-amber-300">No hay eventos con entradas para escanear.</p>
        )}

        {isGastro && targets && targets.discounts.length > 0 && (
          <label className="text-sm text-slate-400">
            Descuento activo
            <select
              value={selectedDiscountId}
              onChange={(e) => {
                setSelectedDiscountId(e.target.value);
                localStorage.setItem(LS_LAST_DISCOUNT, e.target.value);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-white"
            >
              {targets.discounts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} · {d.status}
                  {d.validationCount != null ? ` · ${d.validationCount} validaciones` : ''}
                </option>
              ))}
            </select>
          </label>
        )}

        {isGastro && targets && targets.discounts.length === 0 && (
          <p className="text-sm text-amber-300">No hay descuentos activos para validar.</p>
        )}

        {isProducer && selectedEventId && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-400">
              Descargá un listado de control para puerta. La validación oficial sigue siendo con QR.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleSaveSnapshot()}
                className="rounded-lg border border-emerald-600 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-900/30"
              >
                Guardar listado offline
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadPdf()}
                className="rounded-lg border border-slate-500 px-3 py-2 text-sm text-white hover:bg-slate-700"
              >
                Descargar listado PDF
              </button>
              {snapshotMeta && (
                <button
                  type="button"
                  onClick={() => void handleDeleteSnapshot()}
                  className="rounded-lg border border-red-800 px-3 py-2 text-sm text-red-300 hover:bg-red-900/20"
                >
                  Borrar listado local
                </button>
              )}
              {pendingCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleManualSync()}
                  disabled={syncing || !isOnline}
                  className="rounded-lg bg-amber-700 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {syncing ? 'Sincronizando…' : 'Sincronizar pendientes'}
                </button>
              )}
            </div>
            {offlineStatus && <p className="text-xs text-slate-400">{offlineStatus}</p>}
            {pdfStatus && <p className="text-xs text-slate-400">{pdfStatus}</p>}
          </div>
        )}
      </div>

      <div ref={scanSectionRef} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('camera')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${
            inputMode === 'camera'
              ? 'bg-emerald-600 text-white'
              : 'border border-slate-600 text-slate-300'
          }`}
        >
          Cámara
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium ${
            inputMode === 'manual'
              ? 'bg-emerald-600 text-white'
              : 'border border-slate-600 text-slate-300'
          }`}
        >
          Manual
        </button>
      </div>

      {inputMode === 'camera' ? (
        <QrCameraScanner active={!loading} onScan={(text) => void processScan(text)} />
      ) : (
        <div className="flex flex-col gap-3">
          <label className="text-sm text-slate-400">
            Código QR (texto)
            <textarea
              value={qrPayload}
              onChange={(e) => setQrPayload(e.target.value)}
              placeholder="yti:v1:… o yti:gastro-discount:v1:…"
              rows={3}
              className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 font-mono text-sm text-white"
            />
          </label>
          <button
            type="button"
            onClick={() => void processScan(qrPayload)}
            disabled={loading || !qrPayload.trim()}
            className="h-14 rounded-xl bg-emerald-600 text-lg font-bold text-white disabled:opacity-50"
          >
            {loading ? 'Validando…' : 'Validar código'}
          </button>
        </div>
      )}

      {payloadFamily !== 'unknown' && qrPayload.trim() && (
        <span
          className={`inline-block w-fit rounded-full px-3 py-1 text-xs font-medium ${
            payloadFamily === 'gastro-discount' ? 'bg-violet-600/80' : 'bg-sky-600/80'
          }`}
        >
          {payloadFamily === 'gastro-discount' ? 'Descuento gastro' : 'Entrada'}
        </span>
      )}

      <ScanResultModal
        open={scanModalOpen}
        result={lastTicket}
        onClose={() => setScanModalOpen(false)}
      />

      {lastGastro && (
        <div className={`rounded-xl px-6 py-4 ${gastroStatusClass(lastGastro.status)}`}>
          <p className="text-xs font-normal uppercase opacity-80">
            Descuento · {lastGastro.status}
          </p>
          <p className="mt-1 text-lg font-semibold">{lastGastro.title}</p>
          <p className="mt-2 text-sm opacity-90">{lastGastro.message}</p>
        </div>
      )}
      </div>

      {history.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-slate-400">Últimos escaneos</h2>
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
                  Entrada · {scanResultLabel(h.result.result)}
                  {(h.result as OfflineScanResult).offline ? ' (offline)' : ''}
                </li>
              ) : (
                <li
                  key={i}
                  className={`rounded px-3 py-2 text-sm ${
                    h.result.status === 'VALID'
                      ? 'bg-violet-800/50 text-violet-200'
                      : 'bg-red-900/50 text-red-300'
                  }`}
                >
                  Gastro · {h.result.status} — {h.result.title}
                </li>
              ),
            )}
          </ul>
        </section>
      )}
    </main>
  );
}
