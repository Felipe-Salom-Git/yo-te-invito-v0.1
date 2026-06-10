'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type CameraState = 'idle' | 'starting' | 'active' | 'denied' | 'error';

type Props = {
  onScan: (text: string) => void;
  active: boolean;
};

const READER_ID = 'yti-qr-reader';

export function QrCameraScanner({ onScan, active }: Props) {
  const [state, setState] = useState<CameraState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const stopCamera = useCallback(async () => {
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
  }, []);

  const startCamera = useCallback(async () => {
    await stopCamera();
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
          onScanRef.current(decoded);
        },
        () => {},
      );
      setState('active');
    } catch {
      setState('denied');
      setMessage(
        'No pudimos usar la cámara. Revisá permisos en el navegador o usá ingreso manual.',
      );
    }
  }, [stopCamera]);

  useEffect(() => {
    if (!active) {
      void stopCamera();
      setState('idle');
      return;
    }
    void startCamera();
    return () => {
      void stopCamera();
    };
  }, [active, startCamera, stopCamera]);

  return (
    <div className="flex flex-col gap-3">
      <div
        id={READER_ID}
        className={`overflow-hidden rounded-xl border border-slate-600 bg-black ${
          active ? 'min-h-[280px]' : 'hidden'
        }`}
      />
      {state === 'starting' && (
        <p className="text-sm text-slate-400">Solicitando acceso a la cámara…</p>
      )}
      {message && <p className="text-sm text-amber-300">{message}</p>}
      {(state === 'denied' || state === 'error') && (
        <button
          type="button"
          onClick={() => void startCamera()}
          className="rounded-lg border border-slate-500 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          Reintentar cámara
        </button>
      )}
      {state === 'active' && (
        <p className="text-xs text-slate-500">
          Apuntá al código QR. En iPhone usá Safari; en Android, Chrome.
        </p>
      )}
    </div>
  );
}
