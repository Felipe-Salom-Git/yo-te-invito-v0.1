'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Logo } from '@/components/brand/Logo';
import {
  QR_PREPARING_MODE,
  resolveQrPreparingMessage,
  type QrPreparingMode,
} from '@/lib/ux/qrPreparing';

type Props = {
  open: boolean;
  mode?: QrPreparingMode;
  /** Replaces the default "Creando tu QR…" / "Preparando el envío…" copy. */
  message?: string;
};

/**
 * G12.1-A — Blocking overlay shown while a QR is generated / sent.
 * G12.1-A — Overlay bloqueante mientras se genera / envía un QR.
 */
export function QrPreparingOverlay({ open, mode = QR_PREPARING_MODE.CREATE, message }: Props) {
  const [mounted, setMounted] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) {
      setElapsedMs(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 250);
    return () => window.clearInterval(timer);
  }, [open]);

  if (!open || !mounted) return null;

  const text = message ?? resolveQrPreparingMessage(mode, elapsedMs);

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      data-testid="qr-preparing-overlay"
    >
      <div
        role="status"
        aria-live="polite"
        aria-busy="true"
        className="flex w-full max-w-xs flex-col items-center gap-5 rounded-2xl border border-border bg-bg-muted px-6 py-8 text-center shadow-2xl"
      >
        <span className="inline-flex animate-[spin_1.6s_linear_infinite] motion-reduce:animate-pulse">
          <Logo variant="icon" width={72} height={72} alt="" />
        </span>
        <p className="text-base font-semibold text-text">{text}</p>
        <p className="text-xs text-text-muted">Esto puede tardar unos segundos.</p>
      </div>
    </div>,
    document.body,
  );
}
