'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  classifyQrScanPayload,
  isManualShortCodeInput,
  parseGastroDiscountQrPayload,
  parseActivityCouponQrPayload,
  type ScanResponse,
  type ScannerScanTargetsResponse,
  type ValidateGastroDiscountResponse,
} from '@yo-te-invito/shared';
import {
  scanTicket,
  fetchEventSnapshot,
  validateGastroDiscount,
  validateActivityCoupon,
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
const LS_SCREEN = 'scanner:screen';

type ScannerScreen = 'setup' | 'scan';

type DoorScannerClientProps = {
  userLabel: string;
  userEmail: string;
  onLogout: () => void;
};

type ScanHistoryItem =
  | { kind: 'ticket'; result: ScanResponse | OfflineScanResult }
  | { kind: 'gastro-discount'; result: ValidateGastroDiscountResponse };

type InputMode = 'camera' | 'manual';

type ScanMode = 'idle' | 'scanning' | 'validating' | 'error';

const SCAN_COOLDOWN_MS = 2500;

function gastroStatusClass(status: ValidateGastroDiscountResponse['status']): string {
  if (status === 'VALID') return 'bg-emerald-700 text-white';
  if (status === 'ALREADY_USED' || status === 'LIMIT_REACHED' || status === 'NOT_VALID_TODAY') return 'bg-amber-700 text-white';
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
  const searchParams = useSearchParams();
  const autoNavigatedRef = useRef(false);
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
  const [scanMode, setScanMode] = useState<ScanMode>('idle');
  const [scanError, setScanError] = useState<string | null>(null);
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
  const scanModeRef = useRef<ScanMode>('idle');
  const lastScannedCodeRef = useRef<{ code: string; at: number } | null>(null);
  const [hasScannedOnce, setHasScannedOnce] = useState(false);
  const [screen, setScreen] = useState<ScannerScreen>('setup');
  const targetSectionRef = useRef<HTMLDivElement>(null);
  const scanSectionRef = useRef<HTMLDivElement>(null);

  scanModeRef.current = scanMode;

  const { sync, syncing, lastSummary } = useOfflineSync();

  const payloadFamily = classifyQrScanPayload(qrPayload);
  const isProducer = targets?.parentProfileType === 'PRODUCER';
  const isGastro = targets?.parentProfileType === 'GASTRO';
  const isActivity = targets?.parentProfileType === 'EXCURSION_OPERATOR';
  const isCouponParent = isGastro || isActivity;

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
    const storedScreen = localStorage.getItem(LS_SCREEN);
    if (storedScreen === 'setup' || storedScreen === 'scan') setScreen(storedScreen);
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
      if (
        (data.parentProfileType === 'GASTRO' || data.parentProfileType === 'EXCURSION_OPERATOR') &&
        data.discounts.length > 0
      ) {
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
    if (mode === 'manual') {
      setScanMode('idle');
      setScanError(null);
    }
  };

  const handleStartCameraScan = useCallback(() => {
    setScanError(null);
    setScanMode('scanning');
  }, []);

  const handleCancelCameraScan = useCallback(() => {
    setScanMode('idle');
    setScanError(null);
  }, []);

  const handleCameraScanTimeout = useCallback(() => {
    setScanMode('idle');
    setScanError('No se detectó ningún QR. Intentá nuevamente.');
  }, []);

  const handleCloseScanModal = useCallback(() => {
    setScanModalOpen(false);
    setScanMode('idle');
    setScanError(null);
  }, []);

  const goToSetup = useCallback(() => {
    setScanMode('idle');
    setScanError(null);
    setScreen('setup');
    localStorage.setItem(LS_SCREEN, 'setup');
  }, []);

  const goToScan = useCallback(() => {
    setScanMode('idle');
    setScanError(null);
    setScreen('scan');
    localStorage.setItem(LS_SCREEN, 'scan');
  }, []);

  const selectedEvent = targets?.events.find((e) => e.id === selectedEventId);
  const selectedDiscount = targets?.discounts.find((d) => d.id === selectedDiscountId);
  const selectedOccurrence = eventOccurrences.find((o) => o.id === selectedOccurrenceId);

  const canGoToScan =
    isProducer
      ? !!selectedEventId &&
        (!eventOccurrences.length || !!selectedOccurrenceId)
      : isCouponParent
        ? !!selectedDiscountId
        : false;

  const hasSingleTarget = useMemo(() => {
    if (!targets) return false;
    if (targets.parentProfileType === 'PRODUCER') {
      if (targets.events.length !== 1) return false;
      if (eventOccurrences.length > 1) return false;
      return true;
    }
    if (targets.parentProfileType === 'GASTRO' || targets.parentProfileType === 'EXCURSION_OPERATOR') {
      return targets.discounts.length === 1;
    }
    return false;
  }, [targets, eventOccurrences.length]);

  const startScan = useCallback(
    (mode: InputMode) => {
      setMode(mode);
      goToScan();
    },
    [goToScan],
  );

  useEffect(() => {
    if (!targets || !canGoToScan || autoNavigatedRef.current) return;

    const urlCamera = searchParams.get('mode') === 'camera';
    const persistedScan = localStorage.getItem(LS_SCREEN) === 'scan';
    const shouldAutoEnter = hasSingleTarget || persistedScan || urlCamera;

    if (!shouldAutoEnter) return;

    autoNavigatedRef.current = true;
    if (urlCamera) {
      setMode('camera');
    }
    goToScan();
  }, [targets, canGoToScan, hasSingleTarget, searchParams, goToScan]);

  const targetLabel = isProducer
    ? selectedEvent?.title ?? null
    : isCouponParent
      ? selectedDiscount?.title ?? null
      : null;

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
      const shortCode = isManualShortCodeInput(trimmed);
      const isGastroScan = family === 'gastro-discount' || (shortCode && isGastro);
      const isActivityScan = family === 'activity-coupon' || (shortCode && isActivity);

      if (isGastroScan || isActivityScan) {
        setLoading(true);
        setLastTicket(null);
        setLastGastro(null);
        try {
          if (!isOnline) {
            setLastGastro({
              status: 'INVALID',
              title: 'Sin conexión',
              message: 'Los cupones QR requieren conexión para validar.',
            });
            return;
          }
          const parsed = shortCode
            ? null
            : isActivityScan
              ? parseActivityCouponQrPayload(trimmed)
              : parseGastroDiscountQrPayload(trimmed);
          const parsedId =
            parsed && 'couponId' in parsed ? parsed.couponId : parsed && 'discountId' in parsed ? parsed.discountId : null;
          if (isCouponParent && selectedDiscountId && parsedId && parsedId !== selectedDiscountId) {
            setLastGastro({
              status: 'INVALID',
              title: isActivity ? 'Cupón incorrecto' : 'Descuento incorrecto',
              message: 'El QR no corresponde al beneficio seleccionado.',
            });
            return;
          }
          const res = isActivityScan
            ? await validateActivityCoupon({ qrPayload: trimmed })
            : await validateGastroDiscount({ qrPayload: trimmed });
          const asGastro: ValidateGastroDiscountResponse =
            'coupon' in res
              ? {
                  status: res.status,
                  title: res.title,
                  message: res.message,
                  discount: res.coupon
                    ? {
                        id: res.coupon.id,
                        title: res.coupon.title,
                        valueLabel: res.coupon.valueLabel,
                        localName: res.coupon.activityName,
                      }
                    : undefined,
                }
              : res;
          setLastGastro(asGastro);
          setHistory((prev) =>
            [{ kind: 'gastro-discount' as const, result: asGastro }, ...prev].slice(0, MAX_HISTORY),
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
          setScanMode('idle');
        }
        return;
      }

      const eventId = selectedEventId.trim();
      if (!eventId) {
        setLastTicket({ result: 'INVALID' });
        setScanModalOpen(true);
        setLastGastro(null);
        scanningRef.current = false;
        setScanMode('idle');
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
        setScanMode('idle');
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
        setScanMode('idle');
        setHistory((prev) =>
          [{ kind: 'ticket' as const, result: invalid }, ...prev].slice(0, MAX_HISTORY),
        );
      } finally {
        setLoading(false);
        scanningRef.current = false;
        if (scanModeRef.current === 'validating') {
          setScanMode('idle');
        }
      }
    },
    [
      isOnline,
      isGastro,
      isActivity,
      selectedDiscountId,
      selectedEventId,
      selectedOccurrenceId,
      refreshOfflineState,
      enrichTicketResult,
    ],
  );

  const handleCameraScan = useCallback(
    (rawPayload: string) => {
      if (scanModeRef.current !== 'scanning' || scanningRef.current) return;

      const trimmed = rawPayload.trim();
      if (!trimmed) return;

      const now = Date.now();
      const last = lastScannedCodeRef.current;
      if (last && last.code === trimmed && now - last.at < SCAN_COOLDOWN_MS) return;

      lastScannedCodeRef.current = { code: trimmed, at: now };
      setHasScannedOnce(true);
      setScanMode('validating');
      void processScan(trimmed);
    },
    [processScan],
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

  const headerBlock = (
    <header className="flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-white sm:text-2xl">
          {screen === 'setup' ? 'Scanner — Configuración' : 'Scanner — Puerta'}
        </h1>
        <p className="mt-1 text-xs text-slate-400 sm:text-sm">
          {userLabel} · {userEmail}
        </p>
        {targets?.parentDisplayName && (
          <p className="mt-0.5 text-xs text-slate-500">Cuenta: {targets.parentDisplayName}</p>
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
  );

  const menuBlock = (
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
        onScanFocus: () => {
          if (screen === 'setup' && canGoToScan) goToScan();
        },
        onSelectTarget: goToSetup,
        onTicketList: () => setTicketListOpen(true),
        onDownloadPdf: () => void handleDownloadPdf(),
        onSaveOffline: () => void handleSaveSnapshot(),
        onSync: () => void handleManualSync(),
        onLogout,
      }}
    />
  );

  const ticketListBlock = (
    <ScannerTicketListPanel
      open={ticketListOpen}
      onClose={() => setTicketListOpen(false)}
      eventId={selectedEventId}
      eventTitle={selectedEvent?.title ?? null}
      isOnline={isOnline}
      selectedOccurrenceId={selectedOccurrenceId}
    />
  );

  const scanSummaryBlock = (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-white">
          {isProducer ? selectedEvent?.title : selectedDiscount?.title}
        </p>
        {isProducer && selectedOccurrence && (
          <p className="truncate text-xs text-slate-400">{formatOccurrenceLabel(selectedOccurrence)}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isOnline ? 'bg-emerald-900 text-emerald-300' : 'bg-amber-900 text-amber-300'
          }`}
        >
          {isOnline ? 'Online' : 'Offline'}
        </span>
        <button
          type="button"
          onClick={goToSetup}
          className="text-xs text-slate-400 underline hover:text-white"
        >
          Cambiar evento
        </button>
      </div>
    </div>
  );

  const scanControlsBlock = (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('camera')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
            inputMode === 'camera'
              ? 'bg-emerald-600 text-white'
              : 'border border-slate-600 text-slate-300'
          }`}
        >
          Escanear con cámara
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
            inputMode === 'manual'
              ? 'bg-emerald-600 text-white'
              : 'border border-slate-600 text-slate-300'
          }`}
        >
          Ingresar código manualmente
        </button>
      </div>

      {inputMode === 'camera' ? (
        <div className="flex flex-col gap-2">
          <QrCameraScanner
            compact
            scanning={scanMode === 'scanning'}
            onScan={handleCameraScan}
            onScanTimeout={handleCameraScanTimeout}
          />

          {scanMode === 'validating' && (
            <p className="text-center text-sm font-medium text-slate-300">Validando entrada…</p>
          )}

          {scanMode === 'scanning' && (
            <button
              type="button"
              onClick={handleCancelCameraScan}
              className="h-11 rounded-xl border border-slate-500 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Cancelar
            </button>
          )}

          {scanMode === 'idle' && (
            <>
              {scanError && (
                <div className="rounded-lg border border-amber-700/50 bg-amber-950/40 px-3 py-2 text-sm text-amber-200">
                  {scanError}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setScanError(null);
                  handleStartCameraScan();
                }}
                disabled={loading}
                className="h-14 rounded-xl bg-emerald-600 text-lg font-bold text-white disabled:opacity-50"
              >
                {scanError
                  ? 'Intentar nuevamente'
                  : hasScannedOnce
                    ? 'Escanear otra entrada'
                    : 'Escanear entrada'}
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-400">
            Código corto o QR completo
            <input
              type="text"
              value={qrPayload}
              onChange={(e) => setQrPayload(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && qrPayload.trim() && !loading) {
                  e.preventDefault();
                  void processScan(qrPayload);
                }
              }}
              placeholder={isCouponParent ? 'Ej. K7M-428' : 'Ej. AB12CD34 o pegá el QR completo'}
              autoComplete="off"
              autoCapitalize="characters"
              className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 font-mono text-base text-white placeholder:text-slate-500"
            />
          </label>
          <p className="text-xs text-slate-500">
            {isCouponParent
              ? 'Ingresá el código del cupón o pegá el QR completo. Los cupones requieren conexión.'
              : 'Ingresá el código corto de la entrada o pegá el QR completo. Offline: solo código corto si está en el listado guardado.'}
          </p>
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
          className={`inline-block w-fit rounded-full px-2 py-0.5 text-xs font-medium ${
            payloadFamily === 'gastro-discount' ? 'bg-violet-600/80' : 'bg-sky-600/80'
          }`}
        >
          {payloadFamily === 'gastro-discount' ? 'Descuento gastro' : 'Entrada'}
        </span>
      )}
    </div>
  );

  const historyBlock =
    history.length > 0 ? (
      <section>
        <h2 className="mb-1 text-xs font-medium text-slate-400">Últimos escaneos</h2>
        <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto">
          {history.map((h, i) =>
            h.kind === 'ticket' ? (
              <li
                key={i}
                className={`rounded px-2 py-1.5 text-xs ${
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
                className={`rounded px-2 py-1.5 text-xs ${
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
    ) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 p-3 pb-6 sm:p-4">
      {headerBlock}
      {menuBlock}
      {ticketListBlock}

      <ScanResultModal open={scanModalOpen} result={lastTicket} onClose={handleCloseScanModal} />

      {screen === 'setup' ? (
        <>
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

            {isCouponParent && targets && targets.discounts.length > 0 && (
              <label className="text-sm text-slate-400">
                {isActivity ? 'Cupón de Actividad' : 'Descuento activo'}
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

            {isCouponParent && targets && targets.discounts.length === 0 && (
              <p className="text-sm text-amber-300">
                {isActivity ? 'No hay cupones activos para validar.' : 'No hay descuentos activos para validar.'}
              </p>
            )}

            {isProducer && selectedEventId && (
              <div className="flex flex-col gap-2 border-t border-slate-700 pt-4">
                <p className="text-xs text-slate-400">
                  Listado de control para puerta (offline / PDF). La validación oficial es con QR.
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

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => startScan('camera')}
              disabled={!canGoToScan}
              className="h-14 rounded-xl bg-emerald-600 text-lg font-bold text-white disabled:opacity-40"
            >
              Escanear con cámara
            </button>
            <button
              type="button"
              onClick={() => startScan('manual')}
              disabled={!canGoToScan}
              className="h-12 rounded-xl border border-slate-500 text-base font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
            >
              Ingresar código manualmente
            </button>
          </div>
          {!canGoToScan && (
            <p className="text-center text-xs text-slate-500">
              Seleccioná un evento{eventOccurrences.length > 0 ? ' y una función' : ''} para continuar.
            </p>
          )}
        </>
      ) : (
        <div ref={scanSectionRef} className="flex flex-col gap-3">
          {scanSummaryBlock}
          {scanControlsBlock}

          {lastGastro && (
            <div className={`rounded-xl px-4 py-3 ${gastroStatusClass(lastGastro.status)}`}>
              <p className="text-xs font-normal uppercase opacity-80">
                Descuento · {lastGastro.status}
              </p>
              <p className="mt-1 text-base font-semibold">{lastGastro.title}</p>
              <p className="mt-1 text-sm opacity-90">{lastGastro.message}</p>
            </div>
          )}

          {historyBlock}
        </div>
      )}
    </main>
  );
}
