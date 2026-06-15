'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type CameraState = 'idle' | 'starting' | 'preview' | 'denied' | 'error';

type Props = {
  onScan: (text: string) => void;
  /** When true, QR decode callbacks are forwarded (one-shot per activation). */
  scanning: boolean;
  onScanTimeout?: () => void;
  scanTimeoutMs?: number;
  compact?: boolean;
};

const READER_ID = 'yti-qr-reader';
const DEFAULT_TIMEOUT_MS = 15_000;

export function QrCameraScanner({
  onScan,
  scanning,
  onScanTimeout,
  scanTimeoutMs = DEFAULT_TIMEOUT_MS,
  compact = false,
}: Props) {
  const [state, setState] = useState<CameraState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const onScanRef = useRef(onScan);
  const scanningRef = useRef(scanning);
  const acceptScansRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  onScanRef.current = onScan;
  scanningRef.current = scanning;

  useEffect(() => {
    acceptScansRef.current = scanning;
  }, [scanning]);

  const clearScanTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(async () => {
    clearScanTimeout();
    const scanner = scannerRef.current;
    scannerRef.current = null;
    if (scanner) {
      try {
        await scanner.stop();
        scanner.clear();
      } catch {
        /* ignore stop errors */
      }
    }
  }, [clearScanTimeout]);

  const startCamera = useCallback(async () => {
    if (scannerRef.current) return;
    setState('starting');
    setMessage(null);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1 },
        (decoded) => {
          if (!acceptScansRef.current) return;
          acceptScansRef.current = false;
          onScanRef.current(decoded);
        },
        () => {},
      );
      if (mountedRef.current) setState('preview');
    } catch {
      if (mountedRef.current) {
        setState('denied');
        setMessage(
          'No pudimos usar la cámara. Revisá permisos en el navegador o usá ingreso manual.',
        );
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void startCamera();
    return () => {
      mountedRef.current = false;
      void stopCamera();
    };
  }, [startCamera, stopCamera]);

  useEffect(() => {
    if (!scanning) {
      clearScanTimeout();
      return;
    }
    clearScanTimeout();
    timeoutRef.current = setTimeout(() => {
      if (scanningRef.current) onScanTimeout?.();
    }, scanTimeoutMs);
    return clearScanTimeout;
  }, [scanning, scanTimeoutMs, onScanTimeout, clearScanTimeout]);

  return (
    <div className="flex flex-col gap-3">
      <div
        id={READER_ID}
        className={`overflow-hidden rounded-xl border border-slate-600 bg-black ${
          compact ? 'min-h-[220px]' : 'min-h-[280px]'
        } ${state === 'denied' || state === 'error' ? 'hidden' : ''}`}
      />
      {(state === 'denied' || state === 'error') && (
        <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900/50 p-6 text-center">
          <p className="text-4xl opacity-40">📷</p>
          <p className="mt-3 text-sm text-slate-300">
            {message ?? 'Cámara no disponible en este dispositivo.'}
          </p>
          <p className="mt-2 text-xs text-slate-500">Usá ingreso manual o probá en el celular.</p>
        </div>
      )}
      {state === 'starting' && (
        <p className="text-sm text-slate-400">Preparando cámara…</p>
      )}
      {message && state !== 'denied' && state !== 'error' && (
        <p className="text-sm text-amber-300">{message}</p>
      )}
      {(state === 'denied' || state === 'error') && (
        <button
          type="button"
          onClick={() => void startCamera()}
          className="rounded-lg border border-slate-500 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          Reintentar cámara
        </button>
      )}
      {state === 'preview' && !scanning && (
        <p className="text-xs text-slate-500">
          Cámara lista. Tocá &quot;Escanear entrada&quot; para leer un código.
        </p>
      )}
      {state === 'preview' && scanning && (
        <p className="text-sm font-medium text-emerald-300">Buscando QR…</p>
      )}
    </div>
  );
}
